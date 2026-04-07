/**
 * KAPSO MANAGER - Edge Function (v3.0 Multi-Tenant)
 *
 * Each Jurify tenant has their OWN Kapso account.
 * Flow:
 *   1. save-key  → Tenant provides their Kapso API key (from kapso.ai signup)
 *   2. setup     → Creates setup link using tenant's key → Meta Embedded Signup
 *   3. status    → Checks phone number connection via tenant's key
 *   4. finalize  → Persists connection in conexoes_whatsapp
 *   5. health    → Checks tenant's Kapso API key validity
 *
 * @version 3.0.0 — Multi-tenant: each tenant uses their own Kapso API key
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  kapsoFetchWithKey,
  getTenantKapsoConfig,
  checkKapsoHealth,
} from "../_shared/kapso-client.ts";
import { encrypt } from "../_shared/crypto.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KapsoRequest {
  action: "save-key" | "setup" | "setup-link" | "status" | "finalize" | "health" | "disconnect";
  apiKey?: string;       // Only for save-key action
  phoneNumberId?: string; // From success_redirect_url params
  displayPhone?: string;  // From success_redirect_url params
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logEvent(
  supabase: ReturnType<typeof createClient>,
  conexaoId: string | null,
  tenantId: string,
  evento: string,
  severidade: "info" | "warning" | "error",
  descricao?: string,
) {
  try {
    if (!conexaoId) return;
    await supabase.from("conexoes_logs").insert({
      conexao_id: conexaoId,
      tenant_id: tenantId,
      evento,
      severidade,
      descricao: descricao ?? null,
      origem: "kapso-manager",
      metadata: {},
    });
  } catch (_e) { /* fire and forget */ }
}

/** Validate a Kapso API key by calling their customers endpoint. */
async function validateKapsoKey(apiKey: string): Promise<boolean> {
  try {
    const res = await kapsoFetchWithKey(apiKey, "/platform/v1/customers", {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 200;
  } catch {
    return false;
  }
}

/** Generate a setup link using the tenant's own Kapso API key. */
async function createSetupLink(
  apiKey: string,
  frontendUrl: string,
): Promise<{ url: string }> {
  const res = await kapsoFetchWithKey(apiKey, "/platform/v1/setup_links", {
    method: "POST",
    body: JSON.stringify({
      setup_link: {
        success_redirect_url: `${frontendUrl}/conexoes?setup=success`,
        failure_redirect_url: `${frontendUrl}/conexoes?setup=failed`,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || data?.error || data?.detail || `Setup link failed (${res.status})`;
    throw new Error(msg);
  }

  const url = data?.data?.url || data?.url || data?.data?.setup_url;
  if (!url) throw new Error("Kapso não retornou URL de setup.");

  return { url };
}

/** List phone numbers connected to tenant's Kapso account. */
async function listPhoneNumbers(apiKey: string): Promise<Array<{
  id: string;
  display_phone_number: string;
  phone_number_id: string;
  quality_rating?: string;
  status?: string;
}>> {
  const res = await kapsoFetchWithKey(apiKey, "/platform/v1/whatsapp/phone_numbers");
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({ data: [] }));
  return data?.data || [];
}

/** Save or update Kapso config for a tenant. */
async function upsertKapsoConfig(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  apiKey: string,
  phoneNumberId?: string | null,
  phoneDisplay?: string | null,
) {
  const { data: existing } = await supabase
    .from("configuracoes_integracoes")
    .select("id")
    .eq("nome_integracao", "whatsapp_kapso")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // Encrypt the API key before storing
  const encryptedKey = await encrypt(apiKey);

  // Store phone_number_id in observacoes as JSON (column phone_number_id doesn't exist in table)
  const observacoes = (phoneNumberId || phoneDisplay)
    ? JSON.stringify({ phone_number_id: phoneNumberId ?? null, display_phone: phoneDisplay ?? null })
    : null;

  const record = {
    nome_integracao: "whatsapp_kapso",
    status: "ativa" as const,
    api_key_encrypted: encryptedKey,
    endpoint_url: "https://api.kapso.ai",
    observacoes,
    tenant_id: tenantId,
  };

  if (existing) {
    const { error } = await supabase.from("configuracoes_integracoes").update(record).eq("id", existing.id);
    if (error) {
      console.error("[kapso-manager] upsertKapsoConfig update error:", error.message);
      throw new Error(`Erro ao salvar configuração: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("configuracoes_integracoes").insert(record);
    if (error) {
      console.error("[kapso-manager] upsertKapsoConfig insert error:", error.message);
      throw new Error(`Erro ao salvar configuração: ${error.message}`);
    }
  }
}

/** Persist WhatsApp connection in conexoes_whatsapp. */
async function finalizeConnection(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  phoneNumberId: string,
  phoneDisplay: string,
) {
  const { data: existing } = await supabase
    .from("conexoes_whatsapp")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle();

  const record = {
    tenant_id: tenantId,
    nome: "WhatsApp Business",
    telefone: phoneDisplay,
    tipo: "cloud_api",
    provider: "kapso",
    instance_name: phoneNumberId,
    status: "connected",
    config: { phone_number_id: phoneNumberId },
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from("conexoes_whatsapp").update(record).eq("id", existing.id);
    return { conexaoId: existing.id, updated: true };
  }

  const { data: inserted } = await supabase
    .from("conexoes_whatsapp")
    .insert(record)
    .select("id")
    .single();

  return { conexaoId: inserted?.id, created: true };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || undefined);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) return json({ success: false, error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) return json({ success: false, error: "Tenant não encontrado" }, 400);

    const tenantId = profile.tenant_id;

    // ── Rate limit ──
    const rl = await applyRateLimit(req, {
      maxRequests: 20, windowSeconds: 60, namespace: "kapso-manager",
    }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    // ── Parse request ──
    const body: KapsoRequest = await req.json();
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://jurify-app.vercel.app";

    // ── Actions ──
    switch (body.action) {

      // ────────────────────────────────────────────────────────────────────
      // SAVE KEY: Tenant provides their Kapso API key
      // ────────────────────────────────────────────────────────────────────
      case "save-key": {
        const apiKey = body.apiKey?.trim();
        if (!apiKey) return json({ success: false, error: "API key é obrigatória" }, 400);

        // Validate the key against Kapso
        const valid = await validateKapsoKey(apiKey);
        if (!valid) {
          return json({
            success: false,
            error: "API key inválida. Verifique sua chave no dashboard da Kapso.",
          }, 400);
        }

        try {
          await upsertKapsoConfig(supabase, tenantId, apiKey);
        } catch (err) {
          console.error("[kapso-manager] save-key failed:", err instanceof Error ? err.message : err);
          return json({
            success: false,
            error: "Erro ao salvar API key. Tente novamente.",
          }, 500);
        }

        return json({
          success: true,
          message: "API key salva com sucesso. Agora você pode conectar seu WhatsApp.",
        });
      }

      // ────────────────────────────────────────────────────────────────────
      // SETUP: Generate Kapso setup link using tenant's API key
      // ────────────────────────────────────────────────────────────────────
      case "setup":
      case "setup-link": {
        const config = await getTenantKapsoConfig(supabase, tenantId);
        if (!config) {
          return json({
            success: false,
            error: "Configure sua API key da Kapso primeiro.",
            needsApiKey: true,
          }, 400);
        }

        try {
          const { url } = await createSetupLink(config.apiKey, frontendUrl);
          return json({
            success: true,
            setupUrl: url,
            hasApiKey: true,
          });
        } catch (err) {
          console.error("[kapso-manager] createSetupLink failed:", err instanceof Error ? err.message : err);
          return json({
            success: false,
            error: "Falha ao gerar link de conexão. Verifique sua API key no dashboard da Kapso.",
          }, 422);
        }
      }

      // ────────────────────────────────────────────────────────────────────
      // STATUS: Check if phone number is connected
      // ────────────────────────────────────────────────────────────────────
      case "status": {
        const config = await getTenantKapsoConfig(supabase, tenantId);
        if (!config) {
          return json({ success: true, connected: false, needsApiKey: true });
        }

        const phones = await listPhoneNumbers(config.apiKey);
        const connected = phones.length > 0;

        // Auto-finalize if connected but no conexoes_whatsapp record
        if (connected) {
          const phone = phones[0];
          const { data: existingConn } = await supabase
            .from("conexoes_whatsapp")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("status", "connected")
            .limit(1)
            .maybeSingle();

          if (!existingConn) {
            await upsertKapsoConfig(supabase, tenantId, config.apiKey, phone.phone_number_id, phone.display_phone_number);
            await finalizeConnection(supabase, tenantId, phone.phone_number_id, phone.display_phone_number);
          }
        }

        return json({
          success: true,
          connected,
          phones: phones.map(p => ({
            phoneNumberId: p.phone_number_id,
            displayPhone: p.display_phone_number,
            status: p.status,
          })),
        });
      }

      // ────────────────────────────────────────────────────────────────────
      // FINALIZE: Persist connection after user confirms setup done
      // ────────────────────────────────────────────────────────────────────
      case "finalize": {
        const config = await getTenantKapsoConfig(supabase, tenantId);
        if (!config) return json({ success: false, error: "API key não configurada" }, 400);

        // Get phone numbers from Kapso
        const phones = await listPhoneNumbers(config.apiKey);
        if (phones.length === 0) {
          // Check if phoneNumberId was provided via redirect params
          if (body.phoneNumberId && body.displayPhone) {
            await upsertKapsoConfig(supabase, tenantId, config.apiKey, body.phoneNumberId, body.displayPhone);
            const result = await finalizeConnection(supabase, tenantId, body.phoneNumberId, body.displayPhone);
            return json({ success: true, ...result });
          }
          return json({ success: false, error: "Nenhum número conectado encontrado." }, 400);
        }

        const phone = phones[0];
        await upsertKapsoConfig(supabase, tenantId, config.apiKey, phone.phone_number_id, phone.display_phone_number);
        const result = await finalizeConnection(supabase, tenantId, phone.phone_number_id, phone.display_phone_number);

        await logEvent(supabase, result.conexaoId ?? null, tenantId, "whatsapp_connected", "info",
          `Número ${phone.display_phone_number} conectado via Kapso`);

        return json({ success: true, ...result, phone: phone.display_phone_number });
      }

      // ────────────────────────────────────────────────────────────────────
      // HEALTH: Check tenant's Kapso connectivity
      // ────────────────────────────────────────────────────────────────────
      case "health": {
        const config = await getTenantKapsoConfig(supabase, tenantId);
        const health = await checkKapsoHealth(config);
        return json({ success: health.status === "connected", ...health, hasApiKey: !!config });
      }

      // ────────────────────────────────────────────────────────────────────
      // DISCONNECT: Remove WhatsApp connection
      // ────────────────────────────────────────────────────────────────────
      case "disconnect": {
        await supabase
          .from("conexoes_whatsapp")
          .update({ status: "disconnected", updated_at: new Date().toISOString() })
          .eq("tenant_id", tenantId);

        // Clear phone_number_id from config (keep API key)
        const { data: cfg } = await supabase
          .from("configuracoes_integracoes")
          .select("id")
          .eq("nome_integracao", "whatsapp_kapso")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (cfg) {
          await supabase.from("configuracoes_integracoes")
            .update({ observacoes: null })
            .eq("id", cfg.id);
        }

        return json({ success: true, message: "WhatsApp desconectado." });
      }

      default:
        return json({ success: false, error: `Ação desconhecida: ${body.action}` }, 400);
    }
  } catch (error) {
    console.error("[kapso-manager] Error:", error instanceof Error ? `${error.message}\n${error.stack}` : error);
    const raw = error instanceof Error ? error.message : "Erro interno";

    if (raw.includes("Unauthorized") || raw.includes("Missing authorization")) {
      return json({ success: false, error: raw }, 401);
    }
    if (raw.includes("ENCRYPTION_KEY")) {
      return json({ success: false, error: "Erro de configuração do servidor. Contate o suporte." }, 500);
    }
    // Sanitize — don't leak DB errors
    return json({ success: false, error: "Erro interno. Tente novamente ou contate o suporte." }, 500);
  }
});

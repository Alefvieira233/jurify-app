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
  action: "save-key" | "setup" | "setup-link" | "status" | "finalize" | "health" | "disconnect" | "diagnose" | "register-webhook";
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

/**
 * Ensure a Kapso "customer" exists for this tenant.
 * Kapso requires a customer_id for setup links and phone management.
 * We store the customer_id in observacoes JSON alongside phone_number_id.
 */
async function ensureKapsoCustomer(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  tenantId: string,
): Promise<string> {
  // Check if we already have a customer_id stored
  const { data: config } = await supabase
    .from("configuracoes_integracoes")
    .select("observacoes")
    .eq("nome_integracao", "whatsapp_kapso")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (config?.observacoes) {
    try {
      const obs = JSON.parse(config.observacoes);
      if (obs.kapso_customer_id) return obs.kapso_customer_id;
    } catch { /* not valid JSON */ }
  }

  // Check if customer already exists in Kapso by external_customer_id
  const listRes = await kapsoFetchWithKey(apiKey, `/platform/v1/customers?external_customer_id=${tenantId}`);
  const listData = await listRes.json().catch(() => ({ data: [] }));
  const existing = listData?.data?.[0];

  if (existing?.id) {
    // Store it
    await saveCustomerId(supabase, tenantId, existing.id, config?.observacoes);
    return existing.id;
  }

  // Fetch tenant name
  const { data: tenant } = await supabase.from("tenants").select("nome").eq("id", tenantId).maybeSingle();

  // Create new Kapso customer
  const createRes = await kapsoFetchWithKey(apiKey, "/platform/v1/customers", {
    method: "POST",
    body: JSON.stringify({
      customer: {
        name: tenant?.nome || `Jurify Tenant ${tenantId.slice(0, 8)}`,
        external_customer_id: tenantId,
      },
    }),
  });

  const createData = await createRes.json().catch(() => ({}));

  if (!createRes.ok || !createData?.data?.id) {
    console.error("[kapso-manager] Failed to create Kapso customer:", createRes.status, createData);
    throw new Error("Falha ao criar conta na Kapso. Verifique sua API key.");
  }

  const customerId = createData.data.id;
  await saveCustomerId(supabase, tenantId, customerId, config?.observacoes);
  return customerId;
}

async function saveCustomerId(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  customerId: string,
  currentObservacoes?: string | null,
) {
  let obs: Record<string, unknown> = {};
  if (currentObservacoes) {
    try { obs = JSON.parse(currentObservacoes); } catch { /* */ }
  }
  obs.kapso_customer_id = customerId;

  await supabase
    .from("configuracoes_integracoes")
    .update({ observacoes: JSON.stringify(obs) })
    .eq("nome_integracao", "whatsapp_kapso")
    .eq("tenant_id", tenantId);
}

/** Generate a setup link using the tenant's Kapso customer. */
async function createSetupLink(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  tenantId: string,
  frontendUrl: string,
): Promise<{ url: string }> {
  const customerId = await ensureKapsoCustomer(supabase, apiKey, tenantId);

  const res = await kapsoFetchWithKey(apiKey, `/platform/v1/customers/${customerId}/setup_links`, {
    method: "POST",
    body: JSON.stringify({
      setup_link: {
        success_redirect_url: `${frontendUrl}/conexoes?setup=success`,
        failure_redirect_url: `${frontendUrl}/conexoes?setup=failed`,
        language: "pt",
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("[kapso-manager] createSetupLink failed:", res.status, JSON.stringify(data).slice(0, 500));
    const msg = data?.message || data?.error || data?.detail || `Setup link failed (${res.status})`;
    throw new Error(msg);
  }

  const url = data?.data?.url || data?.url;
  if (!url) {
    console.error("[kapso-manager] createSetupLink: no URL in response:", JSON.stringify(data));
    throw new Error("Kapso não retornou URL de setup.");
  }

  return { url };
}

/** List phone numbers connected to tenant's Kapso account. Filters out sandbox. */
async function listPhoneNumbers(apiKey: string, customerId?: string): Promise<Array<{
  id: string;
  display_phone_number: string;
  phone_number_id: string;
  quality_rating?: string;
  status?: string;
}>> {
  const params = new URLSearchParams();
  if (customerId) params.set("customer_id", customerId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await kapsoFetchWithKey(apiKey, `/platform/v1/whatsapp/phone_numbers${qs}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({ data: [] }));
  const all = data?.data || [];
  // Filter: only production numbers with CONNECTED status, exclude sandbox
  return all
    .filter((p: { kind?: string; status?: string }) =>
      p.kind !== "sandbox" && p.status === "CONNECTED"
    )
    .map((p: { id: string; display_phone_number?: string; phone_number_id?: string; verified_name?: string; quality_rating?: string; status?: string }) => ({
      ...p,
      // Fallback: use phone_number_id if display_phone_number is missing
      display_phone_number: p.display_phone_number || p.phone_number_id || p.id,
    }));
}

/**
 * Register webhook URL with Kapso for a phone number.
 * This is CRITICAL — without it, Kapso has nowhere to send incoming messages.
 * Endpoint: POST /platform/v1/whatsapp/phone_numbers/{id}/webhooks
 *
 * IMPORTANT: The {id} in the URL is Kapso's internal phone number ID,
 * NOT the Meta phone_number_id. We try both and resolve the correct one.
 */
async function registerWebhook(
  apiKey: string,
  phoneNumberId: string,
  customerId?: string,
): Promise<{ success: boolean; secretKey?: string; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    return { success: false, error: "SUPABASE_URL não configurado no servidor" };
  }

  const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

  // Resolve the Kapso internal phone ID (may differ from Meta phone_number_id)
  const idsToTry: string[] = [phoneNumberId];

  // Fetch phone list to get the Kapso internal ID
  try {
    const params = new URLSearchParams();
    if (customerId) params.set("customer_id", customerId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const phonesRes = await kapsoFetchWithKey(apiKey, `/platform/v1/whatsapp/phone_numbers${qs}`);
    if (phonesRes.ok) {
      const phonesData = await phonesRes.json().catch(() => ({ data: [] }));
      const phones = (phonesData?.data || []) as Array<{ id: string; phone_number_id?: string }>;
      for (const p of phones) {
        // If the Meta phone_number_id matches, use the Kapso internal id
        if (p.phone_number_id === phoneNumberId && p.id !== phoneNumberId) {
          idsToTry.unshift(p.id); // Try Kapso ID first
        }
        // Also add the Kapso id if not already there
        if (!idsToTry.includes(p.id)) {
          idsToTry.push(p.id);
        }
      }
    }
  } catch {
    // Continue with original ID
  }

  const webhookBody = JSON.stringify({
    whatsapp_webhook: {
      kind: "kapso",
      url: webhookUrl,
      events: [
        "whatsapp.message.received",
        "whatsapp.message.sent",
        "whatsapp.message.delivered",
        "whatsapp.message.read",
        "whatsapp.message.failed",
      ],
    },
  });

  let lastError = "";

  for (const id of idsToTry) {
    // Check if webhook already exists
    try {
      const listRes = await kapsoFetchWithKey(apiKey, `/platform/v1/whatsapp/phone_numbers/${id}/webhooks`);
      if (listRes.ok) {
        const listData = await listRes.json().catch(() => ({ data: [] }));
        const existing = (listData?.data || []) as Array<{ url?: string; active?: boolean }>;
        const alreadyRegistered = existing.some(
          (wh) => wh.url === webhookUrl && wh.active !== false
        );
        if (alreadyRegistered) {
          console.log(`[kapso-manager] Webhook already registered for phone ID=${id}`);
          return { success: true };
        }
      }
    } catch {
      // Continue to register
    }

    // Try to register
    try {
      const res = await kapsoFetchWithKey(apiKey, `/platform/v1/whatsapp/phone_numbers/${id}/webhooks`, {
        method: "POST",
        body: webhookBody,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const secretKey = data?.data?.secret_key || data?.secret_key;
        console.log(`[kapso-manager] Webhook registered for phone ID=${id} → ${webhookUrl}`);
        return { success: true, secretKey };
      }

      lastError = `ID=${id}: ${data?.message || data?.error || data?.detail || `HTTP ${res.status}`}`;
      console.warn(`[kapso-manager] registerWebhook attempt with ID=${id} failed: ${res.status}`, JSON.stringify(data).slice(0, 500));
    } catch (err) {
      lastError = `ID=${id}: ${err instanceof Error ? err.message : "Network error"}`;
      console.error(`[kapso-manager] registerWebhook exception for ID=${id}:`, err);
    }
  }

  return { success: false, error: `Falha ao registrar webhook. ${lastError}` };
}

/**
 * List existing webhooks for a phone number (for diagnostics).
 * Tries both the given ID and the Kapso internal ID.
 */
async function listWebhooks(
  apiKey: string,
  phoneNumberId: string,
  customerId?: string,
): Promise<Array<{ url: string; active: boolean; events?: string[] }>> {
  const idsToTry = [phoneNumberId];

  // Resolve Kapso internal ID
  try {
    const params = new URLSearchParams();
    if (customerId) params.set("customer_id", customerId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const phonesRes = await kapsoFetchWithKey(apiKey, `/platform/v1/whatsapp/phone_numbers${qs}`);
    if (phonesRes.ok) {
      const phonesData = await phonesRes.json().catch(() => ({ data: [] }));
      for (const p of (phonesData?.data || []) as Array<{ id: string; phone_number_id?: string }>) {
        if (p.phone_number_id === phoneNumberId && !idsToTry.includes(p.id)) {
          idsToTry.unshift(p.id);
        }
      }
    }
  } catch { /* */ }

  for (const id of idsToTry) {
    try {
      const res = await kapsoFetchWithKey(apiKey, `/platform/v1/whatsapp/phone_numbers/${id}/webhooks`);
      if (!res.ok) continue;
      const data = await res.json().catch(() => ({ data: [] }));
      const webhooks = data?.data || [];
      if (webhooks.length > 0) return webhooks;
    } catch { /* */ }
  }
  return [];
}

/** Save or update Kapso config for a tenant. Merges observacoes to preserve kapso_customer_id. */
async function upsertKapsoConfig(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  apiKey: string,
  phoneNumberId?: string | null,
  phoneDisplay?: string | null,
) {
  const { data: existing } = await supabase
    .from("configuracoes_integracoes")
    .select("id, observacoes")
    .eq("nome_integracao", "whatsapp_kapso")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // Encrypt the API key before storing
  const encryptedKey = await encrypt(apiKey);

  // Merge new fields into existing observacoes (preserves kapso_customer_id and other data)
  let obs: Record<string, unknown> = {};
  if (existing?.observacoes) {
    try { obs = JSON.parse(existing.observacoes); } catch { /* not valid JSON, start fresh */ }
  }
  if (phoneNumberId !== undefined) obs.phone_number_id = phoneNumberId;
  if (phoneDisplay !== undefined) obs.display_phone = phoneDisplay;
  const observacoes = Object.keys(obs).length > 0 ? JSON.stringify(obs) : null;

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
          const { url } = await createSetupLink(supabase, config.apiKey, tenantId, frontendUrl);
          return json({
            success: true,
            setupUrl: url,
            hasApiKey: true,
          });
        } catch (err) {
          console.error("[kapso-manager] createSetupLink failed:", err instanceof Error ? err.message : err);
          return json({
            success: false,
            error: err instanceof Error ? err.message : "Falha ao gerar link de conexão. Verifique sua API key.",
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

        // Get customer_id for filtering phone numbers to this tenant only
        let customerId: string | undefined;
        try { customerId = await ensureKapsoCustomer(supabase, config.apiKey, tenantId); } catch { /* */ }
        const phones = await listPhoneNumbers(config.apiKey, customerId);
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
      // FINALIZE: Persist connection + register webhook with Kapso
      // ────────────────────────────────────────────────────────────────────
      case "finalize": {
        const config = await getTenantKapsoConfig(supabase, tenantId);
        if (!config) return json({ success: false, error: "API key não configurada" }, 400);

        // Get phone numbers from Kapso (filtered by customer)
        let customerId: string | undefined;
        try { customerId = await ensureKapsoCustomer(supabase, config.apiKey, tenantId); } catch { /* */ }
        const phones = await listPhoneNumbers(config.apiKey, customerId);

        let phoneNumberId: string;
        let phoneDisplay: string;

        if (phones.length > 0) {
          phoneNumberId = phones[0].phone_number_id;
          phoneDisplay = phones[0].display_phone_number;
        } else if (body.phoneNumberId && body.displayPhone) {
          phoneNumberId = body.phoneNumberId;
          phoneDisplay = body.displayPhone;
        } else {
          return json({ success: false, error: "Nenhum número conectado encontrado." }, 400);
        }

        await upsertKapsoConfig(supabase, tenantId, config.apiKey, phoneNumberId, phoneDisplay);
        const result = await finalizeConnection(supabase, tenantId, phoneNumberId, phoneDisplay);

        // CRITICAL: Register webhook URL with Kapso so messages arrive
        const webhookResult = await registerWebhook(config.apiKey, phoneNumberId);
        if (!webhookResult.success) {
          console.error(`[kapso-manager] Webhook registration failed for ${phoneNumberId}: ${webhookResult.error}`);
          await logEvent(supabase, result.conexaoId ?? null, tenantId, "webhook_registration_failed", "warning",
            `Webhook não registrado: ${webhookResult.error}. Mensagens podem não ser recebidas.`);
        } else {
          // If Kapso returned a secret_key, store it for reference
          if (webhookResult.secretKey) {
            const obs = { webhook_secret_hint: webhookResult.secretKey.slice(0, 8) + "..." };
            const { data: cfg } = await supabase
              .from("configuracoes_integracoes")
              .select("observacoes")
              .eq("nome_integracao", "whatsapp_kapso")
              .eq("tenant_id", tenantId)
              .maybeSingle();
            let merged: Record<string, unknown> = {};
            if (cfg?.observacoes) {
              try { merged = JSON.parse(cfg.observacoes); } catch { /* */ }
            }
            Object.assign(merged, obs);
            await supabase
              .from("configuracoes_integracoes")
              .update({ observacoes: JSON.stringify(merged) })
              .eq("nome_integracao", "whatsapp_kapso")
              .eq("tenant_id", tenantId);
          }
          await logEvent(supabase, result.conexaoId ?? null, tenantId, "webhook_registered", "info",
            `Webhook registrado para ${phoneDisplay}`);
        }

        await logEvent(supabase, result.conexaoId ?? null, tenantId, "whatsapp_connected", "info",
          `Número ${phoneDisplay} conectado via Kapso`);

        return json({
          success: true,
          ...result,
          phone: phoneDisplay,
          webhookRegistered: webhookResult.success,
          webhookError: webhookResult.error || null,
        });
      }

      // ────────────────────────────────────────────────────────────────────
      // REGISTER-WEBHOOK: Force webhook registration for existing connection
      // ────────────────────────────────────────────────────────────────────
      case "register-webhook": {
        const config = await getTenantKapsoConfig(supabase, tenantId);
        if (!config) return json({ success: false, error: "API key não configurada" }, 400);
        if (!config.phoneNumberId) return json({ success: false, error: "Nenhum número conectado" }, 400);

        // Get customer_id for better phone resolution
        let custId: string | undefined;
        try { custId = await ensureKapsoCustomer(supabase, config.apiKey, tenantId); } catch { /* */ }

        const result = await registerWebhook(config.apiKey, config.phoneNumberId, custId);
        if (result.success) {
          await logEvent(supabase, null, tenantId, "webhook_registered", "info",
            `Webhook registrado manualmente para ${config.phoneNumberId}`);
        }
        return json({ success: result.success, error: result.error || null });
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

      // ────────────────────────────────────────────────────────────────────
      // DIAGNOSE: Full diagnostic check of WhatsApp integration health
      // ────────────────────────────────────────────────────────────────────
      case "diagnose": {
        const checks: Record<string, { ok: boolean; detail: string }> = {};

        // 1. Check configuracoes_integracoes record
        const { data: cfg } = await supabase
          .from("configuracoes_integracoes")
          .select("id, status, api_key_encrypted, endpoint_url, observacoes")
          .eq("nome_integracao", "whatsapp_kapso")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (!cfg) {
          checks.config = { ok: false, detail: "Nenhuma configuração Kapso encontrada. Execute o setup." };
        } else {
          checks.config = { ok: true, detail: `Status: ${cfg.status}` };

          // 2. Check API key is real (not placeholder)
          let apiKeyValid = false;
          if (cfg.api_key_encrypted) {
            try {
              const { decrypt } = await import("../_shared/crypto.ts");
              const decrypted = await decrypt(cfg.api_key_encrypted);
              const isPlaceholder = !decrypted || decrypted === "kapso_managed" || decrypted === "pending_setup";
              if (isPlaceholder) {
                checks.api_key = { ok: false, detail: "API key é placeholder — configure uma key real no dashboard Kapso." };
              } else {
                const valid = await validateKapsoKey(decrypted);
                checks.api_key = { ok: valid, detail: valid ? "API key válida" : "API key rejeitada pela Kapso" };
                apiKeyValid = valid;
              }
            } catch {
              checks.api_key = { ok: false, detail: "Erro ao descriptografar API key" };
            }
          } else {
            checks.api_key = { ok: false, detail: "API key não encontrada" };
          }

          // 3. Check observacoes has phone_number_id and kapso_customer_id
          let obs: Record<string, unknown> = {};
          if (cfg.observacoes) {
            try { obs = JSON.parse(cfg.observacoes); } catch { /* */ }
          }
          checks.phone_number_id = {
            ok: !!obs.phone_number_id,
            detail: obs.phone_number_id ? `phone_number_id: ${obs.phone_number_id}` : "Sem phone_number_id — conexão incompleta",
          };
          checks.kapso_customer_id = {
            ok: !!obs.kapso_customer_id,
            detail: obs.kapso_customer_id ? `customer_id: ${obs.kapso_customer_id}` : "Sem customer_id — será criado no próximo setup",
          };

          // 4. Check Kapso API health + phone numbers
          if (apiKeyValid) {
            try {
              const { decrypt } = await import("../_shared/crypto.ts");
              const decrypted = await decrypt(cfg.api_key_encrypted);
              const phones = await listPhoneNumbers(decrypted, obs.kapso_customer_id as string | undefined);
              checks.kapso_phones = {
                ok: phones.length > 0,
                detail: phones.length > 0
                  ? `${phones.length} número(s) conectado(s): ${phones.map(p => p.display_phone_number).join(", ")}`
                  : "Nenhum número conectado na Kapso",
              };
            } catch (err) {
              checks.kapso_phones = { ok: false, detail: `Erro ao consultar Kapso: ${err instanceof Error ? err.message : "unknown"}` };
            }

            // 4b. Check webhook is registered for this phone number
            if (obs.phone_number_id) {
              try {
                const { decrypt: dec } = await import("../_shared/crypto.ts");
                const key = await dec(cfg.api_key_encrypted);
                const webhooks = await listWebhooks(key, obs.phone_number_id as string, obs.kapso_customer_id as string | undefined);
                const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
                const expectedUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
                const registered = webhooks.some(
                  (wh) => wh.url === expectedUrl && wh.active !== false
                );
                checks.webhook_registered = {
                  ok: registered,
                  detail: registered
                    ? `Webhook ativo → ${expectedUrl}`
                    : `Webhook NÃO registrado na Kapso. Use "Registrar Webhook" nas Ações.`,
                };
              } catch {
                checks.webhook_registered = { ok: false, detail: "Erro ao verificar webhooks na Kapso" };
              }
            }
          }
        }

        // 5. Check conexoes_whatsapp record
        const { data: conn } = await supabase
          .from("conexoes_whatsapp")
          .select("id, status, instance_name, telefone, last_heartbeat, reconnect_attempts")
          .eq("tenant_id", tenantId)
          .limit(1)
          .maybeSingle();

        if (!conn) {
          checks.conexao = { ok: false, detail: "Nenhum registro em conexoes_whatsapp" };
        } else {
          const heartbeatAge = conn.last_heartbeat
            ? Math.round((Date.now() - new Date(conn.last_heartbeat).getTime()) / 60000)
            : null;
          checks.conexao = {
            ok: conn.status === "connected",
            detail: `Status: ${conn.status} | Instance: ${conn.instance_name || "N/A"} | Heartbeat: ${heartbeatAge !== null ? `${heartbeatAge}min atrás` : "nunca"} | Reconnects: ${conn.reconnect_attempts || 0}`,
          };
        }

        // 6. Check recent webhook events
        const { data: recentEvents, count: eventCount } = await supabase
          .from("webhook_events")
          .select("event_id, status, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(5);

        const unresolvedCount = recentEvents?.filter(e => e.status === "unresolved_tenant").length || 0;
        checks.webhook_events = {
          ok: unresolvedCount === 0,
          detail: `Total: ${eventCount || 0} | Últimos 5: ${recentEvents?.length || 0} | Não resolvidos: ${unresolvedCount}`,
        };

        // 7. Check KAPSO_WEBHOOK_SECRET env var (only detectable via webhook, but we can flag it)
        checks.env_reminder = {
          ok: true,
          detail: "Verifique que KAPSO_WEBHOOK_SECRET está configurado nos secrets do Supabase Edge Functions",
        };

        const allOk = Object.values(checks).every(c => c.ok);

        return json({
          success: true,
          healthy: allOk,
          checks,
          timestamp: new Date().toISOString(),
        });
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

/**
 * META MANAGER - Edge Function (WhatsApp Cloud API direto da Meta)
 *
 * Contraparte do kapso-manager pro onboarding via Embedded Signup da Meta.
 * Cada tenant Jurify conecta sua própria WABA (WhatsApp Business Account)
 * direto na Graph API — sem intermediário Kapso.
 *
 * Fluxo (Embedded Signup):
 *   1. Frontend abre o Embedded Signup (FB.login com config_id) → recebe um `code`.
 *   2. exchange_code → troca o code por access token, descobre a WABA + número,
 *      persiste config criptografada e a conexão.
 *   3. subscribe_waba → assina o app da Meta nos webhooks da WABA.
 *   4. status → informa se o tenant já tem WhatsApp Oficial ativo.
 *
 * TODO(secrets): configurar como Edge Secrets no Supabase:
 *   - WHATSAPP_APP_ID       → App ID do app Meta (Facebook Developers)
 *   - WHATSAPP_APP_SECRET   → App Secret do app Meta (também usado no HMAC do webhook)
 *   - WHATSAPP_CONFIG_ID    → Config ID do Embedded Signup (usado no frontend; documentado aqui)
 *   - WHATSAPP_GRAPH_VERSION (opcional, default v24.0)
 *
 * @version 0.1.0 — esqueleto Fase 1 (migração Kapso → Meta direto)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { encrypt, decrypt } from "../_shared/crypto.ts";
import { applyRateLimit } from "../_shared/rate-limiter.ts";

const GRAPH_VERSION = Deno.env.get("WHATSAPP_GRAPH_VERSION") || "v24.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const INTEGRATION_NAME_META = "whatsapp_oficial";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaRequest {
  action: "status" | "exchange_code" | "subscribe_waba";
  code?: string;    // Embedded Signup authorization code (exchange_code)
  wabaId?: string;  // WhatsApp Business Account ID (subscribe_waba; opcional se já persistido)
}

// ---------------------------------------------------------------------------
// Graph API helpers
// ---------------------------------------------------------------------------

/**
 * Chamada genérica à Graph API da Meta. Timeout 15s. NUNCA loga o token
 * (fica só no header). Erros são interpretados pelo caller com corpo truncado.
 */
async function graphCall(
  path: string,
  opts: { method?: string; token?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  return await fetch(`${GRAPH_BASE}${path}`, {
    method: opts.method || "GET",
    headers,
    signal: AbortSignal.timeout(15_000),
  });
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/**
 * Upsert da config Meta (whatsapp_oficial) do tenant. Merge de observacoes pra
 * preservar campos existentes. Grava:
 *   - api_key_encrypted = access token criptografado
 *   - endpoint_url = phone_number_id (compat com getWhatsAppCredentials legado)
 *   - observacoes JSON = { phone_number_id, display_phone, waba_id }
 */
async function upsertMetaConfig(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  accessToken: string,
  phoneNumberId: string,
  displayPhone: string | null,
  wabaId: string | null,
) {
  const { data: existing } = await supabase
    .from("configuracoes_integracoes")
    .select("id, observacoes")
    .eq("nome_integracao", INTEGRATION_NAME_META)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const encryptedKey = await encrypt(accessToken);

  let obs: Record<string, unknown> = {};
  if (existing?.observacoes) {
    try { obs = JSON.parse(existing.observacoes); } catch { /* observacoes não-JSON — recomeça */ }
  }
  obs.phone_number_id = phoneNumberId;
  if (displayPhone !== null) obs.display_phone = displayPhone;
  if (wabaId !== null) obs.waba_id = wabaId;

  const record = {
    nome_integracao: INTEGRATION_NAME_META,
    status: "ativa" as const,
    api_key_encrypted: encryptedKey,
    endpoint_url: phoneNumberId,
    observacoes: JSON.stringify(obs),
    tenant_id: tenantId,
  };

  if (existing) {
    const { error } = await supabase.from("configuracoes_integracoes").update(record).eq("id", existing.id);
    if (error) {
      console.error("[meta-manager] upsertMetaConfig update error:", error.message);
      throw new Error(`Erro ao salvar configuração: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("configuracoes_integracoes").insert(record);
    if (error) {
      console.error("[meta-manager] upsertMetaConfig insert error:", error.message);
      throw new Error(`Erro ao salvar configuração: ${error.message}`);
    }
  }
}

/** Persiste a conexão em conexoes_whatsapp (tipo='oficial', provider='meta'). Espelha finalizeConnection do kapso-manager. */
async function finalizeMetaConnection(
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
    tipo: "oficial",
    provider: "meta",
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
    // ── Auth (mesmo padrão do kapso-manager: JWT via anon key) ──
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
      maxRequests: 20, windowSeconds: 60, namespace: "meta-manager",
    }, { supabase, user, corsHeaders });
    if (!rl.allowed) return rl.response;

    // ── Parse request ──
    const body: MetaRequest = await req.json();

    switch (body.action) {

      // ────────────────────────────────────────────────────────────────────
      // STATUS: tenant tem WhatsApp Oficial ativo?
      // ────────────────────────────────────────────────────────────────────
      case "status": {
        const { data: cfg } = await supabase
          .from("configuracoes_integracoes")
          .select("status, observacoes")
          .eq("nome_integracao", INTEGRATION_NAME_META)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        let phoneNumberId: string | null = null;
        let displayPhone: string | null = null;
        let wabaId: string | null = null;
        if (cfg?.observacoes) {
          try {
            const obs = JSON.parse(cfg.observacoes) as Record<string, unknown>;
            phoneNumberId = (obs.phone_number_id as string | undefined) || null;
            displayPhone = (obs.display_phone as string | undefined) || null;
            wabaId = (obs.waba_id as string | undefined) || null;
          } catch { /* observacoes não-JSON — ignora */ }
        }

        const connected = cfg?.status === "ativa" && !!phoneNumberId;
        return json({ success: true, connected, phoneNumberId, displayPhone, wabaId });
      }

      // ────────────────────────────────────────────────────────────────────
      // EXCHANGE_CODE: troca o code do Embedded Signup por token + persiste
      // ────────────────────────────────────────────────────────────────────
      case "exchange_code": {
        // TODO(secrets): WHATSAPP_APP_ID / WHATSAPP_APP_SECRET precisam estar
        // configurados como Edge Secrets antes deste fluxo funcionar.
        const appId = Deno.env.get("WHATSAPP_APP_ID");
        const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
        if (!appId || !appSecret) {
          console.error("[meta-manager] WHATSAPP_APP_ID/SECRET não configurados");
          return json({ success: false, error: "Credenciais do app Meta não configuradas no servidor." }, 500);
        }

        const code = body.code?.trim();
        if (!code) return json({ success: false, error: "code é obrigatório" }, 400);

        // 1. Trocar code por access token (não é system-user token; é o token do usuário/negócio)
        const tokenRes = await graphCall(
          `/oauth/access_token?client_id=${encodeURIComponent(appId)}` +
          `&client_secret=${encodeURIComponent(appSecret)}` +
          `&code=${encodeURIComponent(code)}`,
        );
        const tokenData = await tokenRes.json().catch(() => ({}));
        if (!tokenRes.ok || !tokenData?.access_token) {
          console.error("[meta-manager] token exchange failed:", tokenRes.status);
          return json({ success: false, error: "Falha ao trocar código por token de acesso." }, 422);
        }
        const accessToken = tokenData.access_token as string;

        // 2. debug_token pra descobrir a WABA via granular_scopes (usa app token app_id|app_secret)
        const appToken = `${appId}|${appSecret}`;
        const dbgRes = await graphCall(
          `/debug_token?input_token=${encodeURIComponent(accessToken)}` +
          `&access_token=${encodeURIComponent(appToken)}`,
        );
        const dbgData = await dbgRes.json().catch(() => ({}));
        let wabaId: string | null = null;
        const scopes = dbgData?.data?.granular_scopes as
          | Array<{ scope: string; target_ids?: string[] }>
          | undefined;
        if (scopes) {
          const wa = scopes.find(
            (s) => s.scope === "whatsapp_business_management" || s.scope === "whatsapp_business_messaging",
          );
          wabaId = wa?.target_ids?.[0] || null;
        }
        if (!wabaId) {
          console.error("[meta-manager] Não foi possível resolver a WABA via debug_token");
          return json({ success: false, error: "Não foi possível identificar a conta WhatsApp Business (WABA)." }, 422);
        }

        // 3. Listar phone numbers da WABA
        const phonesRes = await graphCall(`/${wabaId}/phone_numbers`, { token: accessToken });
        const phonesData = await phonesRes.json().catch(() => ({ data: [] }));
        const phone = phonesData?.data?.[0] as
          | { id?: string; display_phone_number?: string }
          | undefined;
        const phoneNumberId = phone?.id || null;
        const displayPhone = phone?.display_phone_number || null;
        if (!phoneNumberId) {
          return json({ success: false, error: "Nenhum número WhatsApp encontrado na WABA." }, 422);
        }

        // 4. Persistir config + conexão
        await upsertMetaConfig(supabase, tenantId, accessToken, phoneNumberId, displayPhone, wabaId);
        const conn = await finalizeMetaConnection(supabase, tenantId, phoneNumberId, displayPhone || phoneNumberId);

        return json({
          success: true,
          connected: true,
          phoneNumberId,
          displayPhone,
          wabaId,
          ...conn,
        });
      }

      // ────────────────────────────────────────────────────────────────────
      // SUBSCRIBE_WABA: assina o app nos webhooks da WABA
      // ────────────────────────────────────────────────────────────────────
      case "subscribe_waba": {
        // Resolve waba_id + token: do body ou da config persistida
        const { data: cfg } = await supabase
          .from("configuracoes_integracoes")
          .select("api_key_encrypted, observacoes")
          .eq("nome_integracao", INTEGRATION_NAME_META)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (!cfg?.api_key_encrypted) {
          return json({ success: false, error: "Integração Meta não configurada. Conecte primeiro." }, 400);
        }

        let obs: Record<string, unknown> = {};
        if (cfg.observacoes) {
          try { obs = JSON.parse(cfg.observacoes); } catch { /* */ }
        }
        const wabaId = (body.wabaId || (obs.waba_id as string | undefined))?.trim();
        if (!wabaId) return json({ success: false, error: "waba_id não encontrado. Refaça a conexão." }, 400);

        let accessToken: string;
        try {
          accessToken = await decrypt(cfg.api_key_encrypted);
        } catch {
          return json({ success: false, error: "Erro ao descriptografar token de acesso." }, 500);
        }

        // POST /{waba_id}/subscribed_apps — inscreve o app nos webhooks da WABA
        const subRes = await graphCall(`/${wabaId}/subscribed_apps`, { method: "POST", token: accessToken });
        const subData = await subRes.json().catch(() => ({}));
        if (!subRes.ok || subData?.success === false) {
          console.error("[meta-manager] subscribe_waba failed:", subRes.status);
          return json({ success: false, error: "Falha ao assinar webhooks da WABA." }, 422);
        }

        return json({ success: true, subscribed: true, wabaId });
      }

      default:
        return json({ success: false, error: `Ação desconhecida: ${body.action}` }, 400);
    }
  } catch (error) {
    console.error("[meta-manager] Error:", error instanceof Error ? `${error.message}\n${error.stack}` : error);
    const raw = error instanceof Error ? error.message : "Erro interno";

    if (raw.includes("Unauthorized") || raw.includes("Missing authorization")) {
      return json({ success: false, error: raw }, 401);
    }
    if (raw.includes("ENCRYPTION_KEY")) {
      return json({ success: false, error: "Erro de configuração do servidor. Contate o suporte." }, 500);
    }
    // Sanitiza — não vaza erros internos de DB
    return json({ success: false, error: "Erro interno. Tente novamente ou contate o suporte." }, 500);
  }
});

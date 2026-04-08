/**
 * Shared Kapso WhatsApp API client for Supabase Edge Functions.
 *
 * MULTI-TENANT MODEL:
 * Each Jurify tenant has their OWN Kapso account and API key.
 * The key is stored encrypted in configuracoes_integracoes.api_key_encrypted per tenant.
 * There is NO global API key — each request uses the tenant's key.
 */

import { encrypt, decrypt } from "./crypto.ts";

export interface KapsoTenantConfig {
  apiKey: string;
  apiUrl: string;
  phoneNumberId?: string | null;
  webhookSecret?: string | null;
}

/**
 * Fetch from Kapso API using a tenant-specific API key.
 * This is the core function — ALL Kapso calls go through here.
 */
export async function kapsoFetchWithKey(
  apiKey: string,
  path: string,
  options: RequestInit = {},
  apiUrl = "https://api.kapso.ai"
): Promise<Response> {
  const url = `${apiUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers);
  headers.set("X-API-Key", apiKey);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers, signal: options.signal ?? AbortSignal.timeout(15_000) });
}

/**
 * Legacy wrapper — uses global env KAPSO_API_KEY.
 * Only used for system-level operations (health checks, webhooks).
 * For tenant operations, use kapsoFetchWithKey() directly.
 */
export async function kapsoFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = Deno.env.get("KAPSO_API_KEY");
  const apiUrl = Deno.env.get("KAPSO_API_URL") || "https://api.kapso.ai";

  if (!apiKey) {
    throw new Error("KAPSO_API_KEY not configured (system-level)");
  }

  return kapsoFetchWithKey(apiKey, path, options, apiUrl);
}

/**
 * Load a tenant's Kapso config from the database.
 * Returns null if tenant has no Kapso key configured.
 */
export async function getTenantKapsoConfig(
  supabase: { from: (table: string) => unknown },
  tenantId: string
): Promise<KapsoTenantConfig | null> {
  // deno-lint-ignore no-explicit-any
  const client = supabase as any;
  const { data } = await client
    .from("configuracoes_integracoes")
    .select("api_key_encrypted, webhook_secret_encrypted, endpoint_url, observacoes")
    .eq("nome_integracao", "whatsapp_kapso")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data?.api_key_encrypted) {
    return null;
  }

  // Decrypt the API key
  let apiKey: string;
  try {
    apiKey = await decrypt(data.api_key_encrypted);
  } catch (err) {
    console.error("[kapso-client] Failed to decrypt API key:", err instanceof Error ? err.message : err);
    return null;
  }

  if (!apiKey || apiKey === "kapso_managed" || apiKey === "pending_setup") {
    return null;
  }

  // phone_number_id is stored as JSON in observacoes: {"phone_number_id":"...","display_phone":"..."}
  let phoneNumberId: string | null = null;
  if (data.observacoes) {
    try {
      const obs = JSON.parse(data.observacoes);
      phoneNumberId = obs.phone_number_id || null;
    } catch {
      // Legacy format: "phone:+55..." — no phone_number_id
    }
  }

  // Decrypt webhook secret if available (per-tenant HMAC verification)
  let webhookSecret: string | null = null;
  if (data.webhook_secret_encrypted) {
    try {
      webhookSecret = await decrypt(data.webhook_secret_encrypted);
    } catch {
      // Non-critical — fallback to global KAPSO_WEBHOOK_SECRET
    }
  }

  return {
    apiKey,
    apiUrl: data.endpoint_url || "https://api.kapso.ai",
    phoneNumberId,
    webhookSecret,
  };
}

/**
 * Look up the webhook secret for a phone_number_id (used by webhook handler).
 * Returns the decrypted secret or null if not found.
 */
export async function getWebhookSecretByPhoneId(
  supabase: { from: (table: string) => unknown },
  phoneNumberId: string
): Promise<string | null> {
  // deno-lint-ignore no-explicit-any
  const client = supabase as any;
  const exactMatch = `"phone_number_id":"${phoneNumberId}"`;
  const { data } = await client
    .from("configuracoes_integracoes")
    .select("webhook_secret_encrypted")
    .eq("nome_integracao", "whatsapp_kapso")
    .not("webhook_secret_encrypted", "is", null)
    .ilike("observacoes", `%${exactMatch}%`)
    .maybeSingle();

  if (!data?.webhook_secret_encrypted) return null;

  try {
    return await decrypt(data.webhook_secret_encrypted);
  } catch {
    return null;
  }
}

// ─── Message sending ─────────────────────────────────────────────────────────

interface SendResult {
  messageId: string;
  success: boolean;
}

export async function sendTextMessage(
  config: KapsoTenantConfig,
  to: string,
  text: string
): Promise<SendResult> {
  if (!config.phoneNumberId) {
    throw new Error("WhatsApp não conectado. Complete o setup primeiro.");
  }

  const phone = to.replace(/\D/g, "");
  const response = await kapsoFetchWithKey(
    config.apiKey,
    `/meta/whatsapp/v24.0/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    },
    config.apiUrl
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[kapso] sendTextMessage failed (${response.status}):`, errorBody);
    throw new Error("Falha ao enviar mensagem. Tente novamente.");
  }

  const data = await response.json();
  return { messageId: data?.messages?.[0]?.id ?? "", success: true };
}

export type MediaType = "image" | "audio" | "document" | "video";

export async function sendMediaMessage(
  config: KapsoTenantConfig,
  to: string,
  mediaType: MediaType,
  mediaUrl: string,
  caption?: string,
  filename?: string
): Promise<SendResult> {
  if (!config.phoneNumberId) {
    throw new Error("WhatsApp não conectado. Complete o setup primeiro.");
  }

  const phone = to.replace(/\D/g, "");
  const mediaPayload: Record<string, string> = { link: mediaUrl };
  if (caption) mediaPayload.caption = caption;
  if (filename) mediaPayload.filename = filename;

  const response = await kapsoFetchWithKey(
    config.apiKey,
    `/meta/whatsapp/v24.0/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: mediaType,
        [mediaType]: mediaPayload,
      }),
    },
    config.apiUrl
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[kapso] sendMediaMessage failed (${response.status}):`, errorBody);
    throw new Error("Falha ao enviar mídia. Tente novamente.");
  }

  const data = await response.json();
  return { messageId: data?.messages?.[0]?.id ?? "", success: true };
}

// ─── Health check ────────────────────────────────────────────────────────────

interface HealthResult {
  status: "connected" | "error" | "not_configured";
  detail?: string;
}

/**
 * Check Kapso health for a specific tenant's config.
 * If no config provided, checks system-level connectivity.
 */
export async function checkKapsoHealth(
  tenantConfig?: KapsoTenantConfig | null
): Promise<HealthResult> {
  const apiKey = tenantConfig?.apiKey || Deno.env.get("KAPSO_API_KEY");

  if (!apiKey) {
    return { status: "not_configured", detail: "Nenhuma API key configurada" };
  }

  const apiUrl = tenantConfig?.apiUrl || Deno.env.get("KAPSO_API_URL") || "https://api.kapso.ai";

  try {
    if (tenantConfig?.phoneNumberId) {
      // Check if phone number exists and is active via Kapso API
      const response = await kapsoFetchWithKey(
        apiKey,
        `/platform/v1/whatsapp/phone_numbers?phone_number_id=${tenantConfig.phoneNumberId}`,
        { method: "GET", signal: AbortSignal.timeout(8000) },
        apiUrl
      );
      if (response.ok) {
        const body = await response.json().catch(() => ({ data: [] }));
        const phones = body?.data || [];
        if (phones.length > 0) return { status: "connected" };
        return { status: "error", detail: "Número não encontrado na Kapso" };
      }
      if (response.status === 401 || response.status === 403) {
        return { status: "error", detail: "API key inválida" };
      }
      return { status: "error", detail: `HTTP ${response.status}` };
    }

    // No phone number — just check API key validity
    const res = await kapsoFetchWithKey(
      apiKey,
      "/platform/v1/customers",
      { method: "GET", signal: AbortSignal.timeout(8000) },
      apiUrl
    );
    if (res.ok) return { status: "connected", detail: "API key válida. WhatsApp ainda não conectado." };
    if (res.status === 401 || res.status === 403) {
      return { status: "error", detail: "API key inválida" };
    }
    return { status: "error", detail: `HTTP ${res.status}` };
  } catch (err: unknown) {
    return { status: "error", detail: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

/** @deprecated Use kapsoFetchWithKey with tenant config instead */
export function getKapsoConfig() {
  const apiUrl = Deno.env.get("KAPSO_API_URL") || "https://api.kapso.ai";
  const apiKey = Deno.env.get("KAPSO_API_KEY") || "";
  const phoneNumberId = Deno.env.get("KAPSO_PHONE_NUMBER_ID") || null;
  return { apiUrl, apiKey, phoneNumberId };
}

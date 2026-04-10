import { createClient } from "jsr:@supabase/supabase-js@2";

const INTEGRATION_NAME_META = "whatsapp_oficial";

export interface SendResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
}

// ============================================
// 📤 ENVIO VIA KAPSO API (com retry exponencial)
// ============================================
export async function sendViaKapso(
  to: string,
  text: string,
  tenantId: string,
  supabase: ReturnType<typeof createClient>,
): Promise<SendResult> {
  try {
    const { sendTextMessage, getTenantKapsoConfig } = await import("../../_shared/kapso-client.ts");

    // Load tenant's Kapso config (per-tenant API key model)
    const tenantConfig = await getTenantKapsoConfig(supabase, tenantId);
    if (!tenantConfig) {
      return { success: false, messageId: null, error: "Kapso API key não configurada para este tenant" };
    }
    if (!tenantConfig.phoneNumberId) {
      return { success: false, messageId: null, error: "WhatsApp não conectado (sem phone_number_id)" };
    }

    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await sendTextMessage(tenantConfig, to, text);
        return { success: true, messageId: result.messageId, error: null };
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[webhook:kapso] Send error, retry in ${delay}ms (attempt ${attempt + 1}):`, error);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          const errorMsg = error instanceof Error ? error.message : "Send failed after retries";
          console.error("[webhook:kapso] Send failed after retries:", error);
          return { success: false, messageId: null, error: errorMsg };
        }
      }
    }
    return { success: false, messageId: null, error: "Max retries exceeded" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Kapso API not configured";
    console.error("[webhook:kapso] Kapso import/config error:", error);
    return { success: false, messageId: null, error: errorMsg };
  }
}

// ============================================
// 📤 ENVIO VIA META OFFICIAL API (backward compatible)
// ============================================
export async function sendViaMeta(
  to: string,
  text: string,
  tenantId: string,
  supabase: ReturnType<typeof createClient>,
): Promise<SendResult> {
  let accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
  let phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

  // Tenta buscar credenciais da integração Meta scoped by tenant
  if (tenantId) {
    const { data: config } = await supabase
      .from("configuracoes_integracoes")
      .select("api_key_encrypted, endpoint_url")
      .eq("nome_integracao", INTEGRATION_NAME_META)
      .eq("status", "ativa")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (config?.api_key_encrypted) {
      try {
        const { decrypt } = await import("../../_shared/crypto.ts");
        accessToken = await decrypt(config.api_key_encrypted);
      } catch (err) {
        console.error("[webhook:meta] Failed to decrypt Meta access token:", err instanceof Error ? err.message : err);
      }
    }
    if (config?.endpoint_url) phoneNumberId = config.endpoint_url;
  }

  if (!accessToken || !phoneNumberId) {
    console.error("[webhook:meta] Missing credentials for sending");
    return { success: false, messageId: null, error: "Meta API credentials not configured" };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`;
      console.error("[webhook:meta] Error sending:", data);
      return { success: false, messageId: null, error: errorMsg };
    }
    const messageId = data?.messages?.[0]?.id || null;
    return { success: true, messageId, error: null };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Network error";
    console.error("[webhook:meta] Network error:", error);
    return { success: false, messageId: null, error: errorMsg };
  }
}

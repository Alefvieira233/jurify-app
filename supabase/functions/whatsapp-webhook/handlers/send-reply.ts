import { createClient } from "jsr:@supabase/supabase-js@2";

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
  const { getTenantMetaConfig, sendTextMessage } = await import("../../_shared/meta-client.ts");

  // Prioriza config Meta por tenant (whatsapp_oficial). Fallback pros env
  // globais legados (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID).
  let metaConfig = tenantId ? await getTenantMetaConfig(supabase, tenantId) : null;
  if (!metaConfig) {
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
    if (accessToken && phoneNumberId) metaConfig = { accessToken, phoneNumberId };
  }

  if (!metaConfig) {
    console.error("[webhook:meta] Missing credentials for sending");
    return { success: false, messageId: null, error: "Meta API credentials not configured" };
  }

  try {
    const result = await sendTextMessage(metaConfig, to, text);
    return { success: true, messageId: result.messageId || null, error: null };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Network error";
    console.error("[webhook:meta] Error sending:", errorMsg);
    return { success: false, messageId: null, error: errorMsg };
  }
}

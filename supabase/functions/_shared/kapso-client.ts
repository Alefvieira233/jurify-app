/**
 * Shared Kapso WhatsApp API client for Supabase Edge Functions.
 * Kapso is a managed proxy over Meta's official WhatsApp Cloud API.
 */

export interface KapsoConfig {
  apiUrl: string;
  apiKey: string;
  phoneNumberId: string | null;
}

export function getKapsoConfig(): KapsoConfig {
  const apiUrl = Deno.env.get("KAPSO_API_URL") || "https://api.kapso.ai";
  const apiKey = Deno.env.get("KAPSO_API_KEY");
  const phoneNumberId = Deno.env.get("KAPSO_PHONE_NUMBER_ID") || null;

  if (!apiKey) {
    throw new Error("KAPSO_API_KEY environment variable is required");
  }

  // phoneNumberId is only needed for message-sending endpoints,
  // NOT for platform API (customer creation, setup links).
  // It becomes available only AFTER the user completes WhatsApp setup.

  return { apiUrl: apiUrl.replace(/\/+$/, ""), apiKey, phoneNumberId };
}

/**
 * Fetch from Kapso API. Works for both platform endpoints (/platform/v1/...)
 * and Meta endpoints (/meta/whatsapp/...). Only the API key is required.
 */
export async function kapsoFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = getKapsoConfig();
  const url = `${config.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers);
  headers.set("X-API-Key", config.apiKey);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}

/**
 * Get the phone number ID, throwing only when it's actually needed
 * (i.e., for sending messages, not for platform operations).
 */
export function requirePhoneNumberId(): string {
  const id = Deno.env.get("KAPSO_PHONE_NUMBER_ID");
  if (!id) {
    throw new Error(
      "KAPSO_PHONE_NUMBER_ID not configured. Complete WhatsApp setup first."
    );
  }
  return id;
}

interface SendResult {
  messageId: string;
  success: boolean;
}

export async function sendTextMessage(
  to: string,
  text: string
): Promise<SendResult> {
  const phoneNumberId = requirePhoneNumberId();
  const phone = to.replace(/\D/g, "");

  const response = await kapsoFetch(
    `/meta/whatsapp/v24.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kapso sendTextMessage failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  return {
    messageId: data?.messages?.[0]?.id ?? "",
    success: true,
  };
}

export type MediaType = "image" | "audio" | "document" | "video";

export async function sendMediaMessage(
  to: string,
  mediaType: MediaType,
  mediaUrl: string,
  caption?: string,
  filename?: string
): Promise<SendResult> {
  const phoneNumberId = requirePhoneNumberId();
  const phone = to.replace(/\D/g, "");

  const mediaPayload: Record<string, string> = { link: mediaUrl };
  if (caption) mediaPayload.caption = caption;
  if (filename) mediaPayload.filename = filename;

  const response = await kapsoFetch(
    `/meta/whatsapp/v24.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: mediaType,
        [mediaType]: mediaPayload,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kapso sendMediaMessage failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  return {
    messageId: data?.messages?.[0]?.id ?? "",
    success: true,
  };
}

interface HealthResult {
  status: "connected" | "error" | "not_configured";
  detail?: string;
}

export async function checkKapsoHealth(): Promise<HealthResult> {
  const apiKey = Deno.env.get("KAPSO_API_KEY");
  const phoneNumberId = Deno.env.get("KAPSO_PHONE_NUMBER_ID");

  if (!apiKey) {
    return { status: "not_configured", detail: "KAPSO_API_KEY not set" };
  }

  try {
    // If phone number is configured, check full message-sending capability
    if (phoneNumberId) {
      const response = await kapsoFetch(`/meta/whatsapp/v24.0/${phoneNumberId}`, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) return { status: "connected" };
      if (response.status === 401 || response.status === 403) {
        return { status: "error", detail: "Invalid API key" };
      }
      if (response.status === 404) {
        return { status: "error", detail: "Phone number ID not found" };
      }
      return { status: "error", detail: `HTTP ${response.status}` };
    }

    // No phone number yet — check platform API connectivity only
    const platformRes = await kapsoFetch("/platform/v1/customers", {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });

    if (platformRes.ok || platformRes.status === 200) {
      return { status: "connected", detail: "Platform API OK. WhatsApp not yet connected." };
    }
    if (platformRes.status === 401 || platformRes.status === 403) {
      return { status: "error", detail: "Invalid API key" };
    }
    return { status: "error", detail: `Platform API HTTP ${platformRes.status}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { status: "error", detail: message };
  }
}

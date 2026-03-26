/**
 * Shared Kapso WhatsApp API client for Supabase Edge Functions.
 * Kapso is a managed proxy over Meta's official WhatsApp Cloud API.
 */

export interface KapsoConfig {
  apiUrl: string;
  apiKey: string;
  phoneNumberId: string;
}

export function getKapsoConfig(): KapsoConfig {
  const apiUrl = Deno.env.get("KAPSO_API_URL") || "https://api.kapso.ai";
  const apiKey = Deno.env.get("KAPSO_API_KEY");
  const phoneNumberId = Deno.env.get("KAPSO_PHONE_NUMBER_ID");

  if (!apiKey) {
    throw new Error("KAPSO_API_KEY environment variable is required");
  }
  if (!phoneNumberId) {
    throw new Error("KAPSO_PHONE_NUMBER_ID environment variable is required");
  }

  return { apiUrl: apiUrl.replace(/\/+$/, ""), apiKey, phoneNumberId };
}

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

interface SendResult {
  messageId: string;
  success: boolean;
}

export async function sendTextMessage(
  to: string,
  text: string
): Promise<SendResult> {
  const config = getKapsoConfig();
  const phone = to.replace(/\D/g, "");

  const response = await kapsoFetch(
    `/meta/whatsapp/v24.0/${config.phoneNumberId}/messages`,
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
  const config = getKapsoConfig();
  const phone = to.replace(/\D/g, "");

  const mediaPayload: Record<string, string> = { link: mediaUrl };
  if (caption) mediaPayload.caption = caption;
  if (filename) mediaPayload.filename = filename;

  const response = await kapsoFetch(
    `/meta/whatsapp/v24.0/${config.phoneNumberId}/messages`,
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

  if (!apiKey || !phoneNumberId) {
    return { status: "not_configured", detail: "KAPSO_API_KEY or KAPSO_PHONE_NUMBER_ID not set" };
  }

  try {
    // Use the phone number endpoint to verify connectivity and auth
    const response = await kapsoFetch(`/meta/whatsapp/v24.0/${phoneNumberId}`, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      return { status: "connected" };
    }

    // 401/403 = bad API key, but API is reachable
    if (response.status === 401 || response.status === 403) {
      return { status: "error", detail: "Invalid API key" };
    }

    // 404 on phone number = bad phone ID but API works
    if (response.status === 404) {
      return { status: "error", detail: "Phone number ID not found" };
    }

    return { status: "error", detail: `HTTP ${response.status}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { status: "error", detail: message };
  }
}

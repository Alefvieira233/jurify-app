/**
 * Shared Meta WhatsApp Cloud API (Graph API) client for Supabase Edge Functions.
 *
 * Espelha a API pública de `kapso-client.ts`, mas fala DIRETO com a Graph API da
 * Meta (`https://graph.facebook.com/vXX.0/...`) usando `Authorization: Bearer`,
 * ao invés de passar pelo proxy da Kapso (`https://api.kapso.ai/meta/...` com
 * `X-API-Key`). Os PAYLOADS são idênticos — ambos usam o formato nativo da Meta.
 *
 * Config por tenant: linha `nome_integracao='whatsapp_oficial'` em
 * `configuracoes_integracoes` (token em `api_key_encrypted`, phone_number_id em
 * `observacoes` JSON com fallback legado pro `endpoint_url` só-dígitos).
 */

import { decrypt } from "./crypto.ts";
import { type MediaType } from "./kapso-client.ts";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import type { DownloadedMedia } from "./media-utils.ts";

// Versão da Graph API (Edge Secret opcional). Default alinhado ao endpoint Kapso (v24.0).
const GRAPH_VERSION = Deno.env.get("WHATSAPP_GRAPH_VERSION") || "v24.0";
const MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB

export interface MetaTenantConfig {
  accessToken: string;
  phoneNumberId: string;
}

/** Mesmo shape do SendResult (não-exportado) do kapso-client. */
export interface SendResult {
  messageId: string;
  success: boolean;
}

export type { MediaType };

// ─── Config loading ────────────────────────────────────────────────────────

/**
 * Carrega a config Meta (WhatsApp Oficial) de um tenant.
 *
 * - Lê `configuracoes_integracoes` nome_integracao='whatsapp_oficial' status='ativa'.
 * - Decripta `api_key_encrypted` → access token.
 * - Extrai `phone_number_id` de `observacoes` JSON (igual kapso-client faz);
 *   fallback pro `endpoint_url` quando este contiver só dígitos (gambiarra legada
 *   documentada em send-reply.ts — versões antigas gravavam o phone_number_id ali).
 *
 * Retorna null se não houver token OU phone_number_id resolvível.
 */
export async function getTenantMetaConfig(
  supabase: { from: (table: string) => unknown },
  tenantId: string,
): Promise<MetaTenantConfig | null> {
  // deno-lint-ignore no-explicit-any
  const client = supabase as any;

  const { data } = await client
    .from("configuracoes_integracoes")
    .select("api_key_encrypted, endpoint_url, observacoes")
    .eq("nome_integracao", "whatsapp_oficial")
    .eq("status", "ativa")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data?.api_key_encrypted) return null;

  // phone_number_id: preferir observacoes JSON, cair pro endpoint_url só-dígitos (legado)
  let phoneNumberId: string | null = null;
  if (data.observacoes) {
    try {
      const obs = JSON.parse(data.observacoes) as Record<string, unknown>;
      phoneNumberId = (obs.phone_number_id as string | undefined) || null;
    } catch {
      // observacoes não-JSON (texto legado) — ignora
    }
  }
  if (!phoneNumberId && data.endpoint_url && /^\d+$/.test(String(data.endpoint_url).trim())) {
    phoneNumberId = String(data.endpoint_url).trim();
  }
  if (!phoneNumberId) return null;

  let accessToken: string;
  try {
    accessToken = await decrypt(data.api_key_encrypted);
  } catch (err) {
    console.error("[meta-client] Failed to decrypt Meta access token:", err instanceof Error ? err.message : err);
    return null;
  }
  if (!accessToken) return null;

  return { accessToken, phoneNumberId };
}

// ─── Core fetch ────────────────────────────────────────────────────────────

/**
 * Fetch pra Graph API da Meta. Núcleo — TODAS as chamadas Meta passam por aqui.
 * Adiciona `Authorization: Bearer <token>` e timeout de 15s (AbortController).
 * NUNCA loga o token (fica só no header, nunca é impresso).
 */
export async function graphFetch(
  config: MetaTenantConfig,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${config.accessToken}`);
  // Content-Type só quando há corpo (GETs de mídia não devem forçar JSON)
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return await fetch(url, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
}

/**
 * Executa uma chamada POST /messages e normaliza o resultado em SendResult.
 * Em erro, loga o corpo truncado (sem token) e lança mensagem genérica.
 */
async function postMessage(
  config: MetaTenantConfig,
  payload: Record<string, unknown>,
  errorLabel: string,
  userError: string,
): Promise<SendResult> {
  if (!config.phoneNumberId) {
    throw new Error("WhatsApp não conectado. Complete o setup primeiro.");
  }

  const response = await graphFetch(
    config,
    `/${config.phoneNumberId}/messages`,
    { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", ...payload }) },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(`[meta] ${errorLabel} failed (${response.status}):`, errorBody.slice(0, 500));
    throw new Error(userError);
  }

  const data = await response.json().catch(() => ({}));
  return { messageId: data?.messages?.[0]?.id ?? "", success: true };
}

// ─── Message sending (mesmas assinaturas do kapso-client) ────────────────────

export async function sendTextMessage(
  config: MetaTenantConfig,
  to: string,
  text: string,
  replyToMessageId?: string,
): Promise<SendResult> {
  const phone = to.replace(/\D/g, "");
  const payload: Record<string, unknown> = {
    to: phone,
    type: "text",
    text: { body: text },
  };
  if (replyToMessageId) payload.context = { message_id: replyToMessageId };

  return await postMessage(config, payload, "sendTextMessage", "Falha ao enviar mensagem. Tente novamente.");
}

export async function sendMediaMessage(
  config: MetaTenantConfig,
  to: string,
  mediaType: MediaType,
  mediaUrl: string,
  caption?: string,
  filename?: string,
  replyToMessageId?: string,
): Promise<SendResult> {
  const phone = to.replace(/\D/g, "");
  const mediaPayload: Record<string, string> = { link: mediaUrl };
  if (caption) mediaPayload.caption = caption;
  if (filename) mediaPayload.filename = filename;

  const payload: Record<string, unknown> = {
    to: phone,
    type: mediaType,
    [mediaType]: mediaPayload,
  };
  if (replyToMessageId) payload.context = { message_id: replyToMessageId };

  return await postMessage(config, payload, "sendMediaMessage", "Falha ao enviar mídia. Tente novamente.");
}

export async function sendTemplate(
  config: MetaTenantConfig,
  to: string,
  templateName: string,
  languageCode: string,
  components?: unknown[],
): Promise<SendResult> {
  const phone = to.replace(/\D/g, "");
  const payload: Record<string, unknown> = {
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components && components.length > 0 ? { components } : {}),
    },
  };

  return await postMessage(config, payload, "sendTemplate", "Falha ao enviar template. Tente novamente.");
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveHeader {
  type: "text";
  text: string;
}

export async function sendInteractiveButtons(
  config: MetaTenantConfig,
  to: string,
  bodyText: string,
  buttons: InteractiveButton[],
  header?: InteractiveHeader,
  footer?: string,
): Promise<SendResult> {
  const phone = to.replace(/\D/g, "");
  const interactive: Record<string, unknown> = {
    type: "button",
    body: { text: bodyText },
    action: {
      buttons: buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.title } })),
    },
  };
  if (header) interactive.header = header;
  if (footer) interactive.footer = { text: footer };

  return await postMessage(
    config,
    { to: phone, type: "interactive", interactive },
    "sendInteractiveButtons",
    "Falha ao enviar mensagem interativa. Tente novamente.",
  );
}

export interface ListSection {
  title?: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}

export async function sendInteractiveList(
  config: MetaTenantConfig,
  to: string,
  bodyText: string,
  buttonText: string,
  sections: ListSection[],
  header?: string,
  footer?: string,
): Promise<SendResult> {
  const phone = to.replace(/\D/g, "");
  const interactive: Record<string, unknown> = {
    type: "list",
    body: { text: bodyText },
    action: {
      button: buttonText,
      sections: sections.map((s) => ({
        ...(s.title ? { title: s.title.slice(0, 24) } : {}),
        rows: s.rows.map((r) => ({
          id: r.id,
          title: r.title,
          ...(r.description ? { description: r.description } : {}),
        })),
      })),
    },
  };
  if (header) interactive.header = { type: "text", text: header };
  if (footer) interactive.footer = { text: footer };

  return await postMessage(
    config,
    { to: phone, type: "interactive", interactive },
    "sendInteractiveList",
    "Falha ao enviar lista. Tente novamente.",
  );
}

export async function sendReaction(
  config: MetaTenantConfig,
  to: string,
  messageId: string,
  emoji: string,
): Promise<SendResult> {
  const phone = to.replace(/\D/g, "");
  return await postMessage(
    config,
    { to: phone, type: "reaction", reaction: { message_id: messageId, emoji } },
    "sendReaction",
    "Falha ao reagir à mensagem. Tente novamente.",
  );
}

/**
 * Typing indicator (Meta v24+): POST /messages com status:"read" +
 * typing_indicator. Ancorado numa mensagem inbound (messageId). Não retorna
 * message_id — retorna apenas success.
 */
export async function sendTypingIndicator(
  config: MetaTenantConfig,
  messageId: string,
): Promise<{ success: boolean }> {
  if (!config.phoneNumberId) throw new Error("WhatsApp não conectado. Complete o setup primeiro.");

  const response = await graphFetch(
    config,
    `/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.warn(`[meta] sendTypingIndicator failed (${response.status}):`, errorBody.slice(0, 300));
    return { success: false };
  }
  return { success: true };
}

/** Marca uma mensagem como lida (read receipt ✓✓ azul). */
export async function markAsRead(
  config: MetaTenantConfig,
  messageId: string,
): Promise<{ success: boolean }> {
  if (!config.phoneNumberId) throw new Error("WhatsApp não conectado. Complete o setup primeiro.");

  const response = await graphFetch(
    config,
    `/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.warn(`[meta] markAsRead failed (${response.status}):`, errorBody.slice(0, 300));
    return { success: false };
  }
  return { success: true };
}

// ─── Media (resolve + download) ──────────────────────────────────────────────

/**
 * Resolve um media_id da Meta pra sua URL temporária de download.
 * Graph: GET /{media-id} → JSON com campo `url`.
 */
export async function resolveMediaUrl(
  config: MetaTenantConfig,
  mediaId: string,
): Promise<string> {
  const response = await graphFetch(config, `/${mediaId}`);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(`[meta] resolveMediaUrl failed (${response.status}):`, errorBody.slice(0, 300));
    throw new Error(`Failed to resolve media URL: HTTP ${response.status}`);
  }
  const data = await response.json().catch(() => ({}));
  const url = data?.url;
  if (!url) throw new Error("No media URL in Meta response");
  return url;
}

/**
 * Baixa mídia da Meta. Aceita media_id (resolvido via resolveMediaUrl) ou URL
 * direta. A URL da Meta CDN exige o mesmo access token no header Authorization.
 * Espelha `downloadKapsoMedia` de media-utils.ts.
 */
export async function downloadMedia(
  config: MetaTenantConfig,
  mediaIdOrUrl: string,
): Promise<DownloadedMedia> {
  const downloadUrl = mediaIdOrUrl.startsWith("http")
    ? mediaIdOrUrl
    : await resolveMediaUrl(config, mediaIdOrUrl);

  // Meta CDN exige o Bearer token para baixar o binário
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Media download failed: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = await response.arrayBuffer();

  if (buffer.byteLength > MAX_MEDIA_SIZE) {
    throw new Error(`Media too large: ${buffer.byteLength} bytes (max ${MAX_MEDIA_SIZE})`);
  }

  const disposition = response.headers.get("content-disposition");
  let fileName: string | null = null;
  if (disposition) {
    const match = disposition.match(/filename="?(.+?)"?(?:;|$)/);
    if (match?.[1]) fileName = match[1];
  }

  return {
    base64: base64Encode(new Uint8Array(buffer)),
    mimeType: contentType,
    fileName,
    sizeBytes: buffer.byteLength,
  };
}

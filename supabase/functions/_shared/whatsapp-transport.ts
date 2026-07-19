/**
 * Camada de transporte provider-agnostic para WhatsApp.
 *
 * Resolve QUAL provider um tenant usa (Meta direto ou Kapso) e despacha cada
 * operação de envio pro cliente certo:
 *   - `meta`  → `meta-client.ts` (Graph API direta, Bearer token)
 *   - `kapso` → `kapso-client.ts` / `kapsoFetchWithKey` (proxy Kapso, X-API-Key)
 *
 * Como os PAYLOADS nativos da Meta são idênticos nos dois providers, a única
 * diferença real é o endpoint/auth. Assim os call-sites (Phase 2) não precisam
 * saber qual provider está ativo.
 */

import {
  getTenantKapsoConfig,
  kapsoFetchWithKey,
  sendTextMessage as kapsoSendText,
  sendMediaMessage as kapsoSendMedia,
  type KapsoTenantConfig,
  type MediaType,
} from "./kapso-client.ts";
import {
  getTenantMetaConfig,
  sendTextMessage as metaSendText,
  sendMediaMessage as metaSendMedia,
  sendTemplate as metaSendTemplate,
  sendInteractiveButtons as metaSendButtons,
  sendInteractiveList as metaSendList,
  sendReaction as metaSendReaction,
  sendTypingIndicator as metaSendTyping,
  markAsRead as metaMarkRead,
  downloadMedia as metaDownloadMedia,
  type MetaTenantConfig,
  type SendResult,
  type InteractiveButton,
  type InteractiveHeader,
  type ListSection,
} from "./meta-client.ts";
import { downloadKapsoMedia, type DownloadedMedia } from "./media-utils.ts";

export type WhatsAppProvider = "kapso" | "meta";

export interface TransportConfig {
  provider: WhatsAppProvider;
  kapso?: KapsoTenantConfig;
  meta?: MetaTenantConfig;
  phoneNumberId: string;
}

export type { SendResult, MediaType, InteractiveButton, InteractiveHeader, ListSection, DownloadedMedia };

// ─── Resolução de provider ───────────────────────────────────────────────────

/**
 * Resolve a config de transporte de um tenant.
 * Prioridade: WhatsApp Oficial (Meta direto) → Kapso (fallback legado).
 * Retorna null se nenhum provider estiver conectado (sem phone_number_id).
 */
export async function getTenantTransport(
  supabase: { from: (table: string) => unknown },
  tenantId: string,
): Promise<TransportConfig | null> {
  // 1) Meta direto (whatsapp_oficial ativa + config completa)
  const meta = await getTenantMetaConfig(supabase, tenantId);
  if (meta) {
    return { provider: "meta", meta, phoneNumberId: meta.phoneNumberId };
  }

  // 2) Fallback Kapso
  const kapso = await getTenantKapsoConfig(supabase, tenantId);
  if (kapso?.phoneNumberId) {
    return { provider: "kapso", kapso, phoneNumberId: kapso.phoneNumberId };
  }

  return null;
}

// ─── Helpers Kapso (payloads nativos idênticos aos da Meta) ──────────────────

/** POST bruto pro endpoint Kapso /messages com wrapper messaging_product. */
async function kapsoPost(
  kapso: KapsoTenantConfig,
  payload: Record<string, unknown>,
): Promise<Response> {
  return await kapsoFetchWithKey(
    kapso.apiKey,
    `/meta/whatsapp/v24.0/${kapso.phoneNumberId}/messages`,
    { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", ...payload }) },
    kapso.apiUrl,
    kapso.customerId,
  );
}

/** Envia payload via Kapso e normaliza em SendResult (lança em erro). */
async function kapsoSend(
  kapso: KapsoTenantConfig,
  payload: Record<string, unknown>,
  label: string,
  userError: string,
): Promise<SendResult> {
  const res = await kapsoPost(kapso, payload);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[transport:kapso] ${label} failed (${res.status}):`, body.slice(0, 500));
    throw new Error(userError);
  }
  const data = await res.json().catch(() => ({}));
  return { messageId: data?.messages?.[0]?.id ?? "", success: true };
}

/** POST de status (typing/read) via Kapso — não retorna message_id. */
async function kapsoStatus(
  kapso: KapsoTenantConfig,
  payload: Record<string, unknown>,
  label: string,
): Promise<{ success: boolean }> {
  const res = await kapsoPost(kapso, payload);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn(`[transport:kapso] ${label} failed (${res.status}):`, body.slice(0, 300));
    return { success: false };
  }
  return { success: true };
}

// ─── Operações provider-agnostic ─────────────────────────────────────────────

export function sendText(
  config: TransportConfig,
  to: string,
  text: string,
  replyToMessageId?: string,
): Promise<SendResult> {
  if (config.provider === "meta") return metaSendText(config.meta!, to, text, replyToMessageId);
  return kapsoSendText(config.kapso!, to, text, replyToMessageId);
}

export function sendMedia(
  config: TransportConfig,
  to: string,
  mediaType: MediaType,
  mediaUrl: string,
  caption?: string,
  filename?: string,
  replyToMessageId?: string,
): Promise<SendResult> {
  if (config.provider === "meta") {
    return metaSendMedia(config.meta!, to, mediaType, mediaUrl, caption, filename, replyToMessageId);
  }
  return kapsoSendMedia(config.kapso!, to, mediaType, mediaUrl, caption, filename, replyToMessageId);
}

export function sendTemplate(
  config: TransportConfig,
  to: string,
  templateName: string,
  languageCode: string,
  components?: unknown[],
): Promise<SendResult> {
  if (config.provider === "meta") {
    return metaSendTemplate(config.meta!, to, templateName, languageCode, components);
  }
  const phone = to.replace(/\D/g, "");
  return kapsoSend(
    config.kapso!,
    {
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components && components.length > 0 ? { components } : {}),
      },
    },
    "sendTemplate",
    "Falha ao enviar template. Tente novamente.",
  );
}

export function sendInteractiveButtons(
  config: TransportConfig,
  to: string,
  bodyText: string,
  buttons: InteractiveButton[],
  header?: InteractiveHeader,
  footer?: string,
): Promise<SendResult> {
  if (config.provider === "meta") {
    return metaSendButtons(config.meta!, to, bodyText, buttons, header, footer);
  }
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
  return kapsoSend(
    config.kapso!,
    { to: phone, type: "interactive", interactive },
    "sendInteractiveButtons",
    "Falha ao enviar mensagem interativa. Tente novamente.",
  );
}

export function sendInteractiveList(
  config: TransportConfig,
  to: string,
  bodyText: string,
  buttonText: string,
  sections: ListSection[],
  header?: string,
  footer?: string,
): Promise<SendResult> {
  if (config.provider === "meta") {
    return metaSendList(config.meta!, to, bodyText, buttonText, sections, header, footer);
  }
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
  return kapsoSend(
    config.kapso!,
    { to: phone, type: "interactive", interactive },
    "sendInteractiveList",
    "Falha ao enviar lista. Tente novamente.",
  );
}

export function sendReaction(
  config: TransportConfig,
  to: string,
  messageId: string,
  emoji: string,
): Promise<SendResult> {
  if (config.provider === "meta") {
    return metaSendReaction(config.meta!, to, messageId, emoji);
  }
  const phone = to.replace(/\D/g, "");
  return kapsoSend(
    config.kapso!,
    { to: phone, type: "reaction", reaction: { message_id: messageId, emoji } },
    "sendReaction",
    "Falha ao reagir à mensagem. Tente novamente.",
  );
}

export function sendTyping(
  config: TransportConfig,
  messageId: string,
): Promise<{ success: boolean }> {
  if (config.provider === "meta") return metaSendTyping(config.meta!, messageId);
  return kapsoStatus(
    config.kapso!,
    { status: "read", message_id: messageId, typing_indicator: { type: "text" } },
    "sendTyping",
  );
}

export function markRead(
  config: TransportConfig,
  messageId: string,
): Promise<{ success: boolean }> {
  if (config.provider === "meta") return metaMarkRead(config.meta!, messageId);
  return kapsoStatus(
    config.kapso!,
    { status: "read", message_id: messageId },
    "markRead",
  );
}

export function downloadMedia(
  config: TransportConfig,
  mediaIdOrUrl: string,
): Promise<DownloadedMedia> {
  if (config.provider === "meta") return metaDownloadMedia(config.meta!, mediaIdOrUrl);
  // Kapso: usa o downloader existente (proxy Kapso com chave global/legada)
  return downloadKapsoMedia(mediaIdOrUrl);
}

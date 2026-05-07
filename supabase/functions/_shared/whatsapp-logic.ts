/**
 * Pure business logic for the WhatsApp webhook.
 *
 * Like `stripe-logic.ts`, this module has zero external imports so it can be
 * consumed by both the Deno edge function and Vitest/Node unit tests. Every
 * function is deterministic and stateless — except `createDeduplicator()`,
 * which returns an isolated closure state so tests don't share memory.
 *
 * Audit context: the previous tests redeclared every normalizer inline and
 * tested the copies. Now both the edge function and the tests import from here.
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface KapsoMessageKey {
  remoteJid?: string;
  fromMe?: boolean;
  id?: string;
}

export interface KapsoMessageData {
  key?: KapsoMessageKey;
  pushName?: string;
  messageType?: string;
  message?: Record<string, unknown>;
}

export interface KapsoWebhookPayload {
  event?: string;
  instance?: string;
  data?: KapsoMessageData & Record<string, unknown>;
}

export interface MetaWebhookMessage {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string; id?: string };
  document?: { caption?: string; filename?: string; id?: string };
  audio?: { id?: string };
  _vendor?: { name?: string };
}

export interface MetaWebhookStatus {
  status?: string;
  recipient_id?: string;
  errors?: Array<{ code?: string; title?: string }>;
}

export interface MetaWebhookChange {
  value?: {
    messages?: MetaWebhookMessage[];
    statuses?: MetaWebhookStatus[];
  };
}

export interface MetaWebhookEntry {
  changes?: MetaWebhookChange[];
}

export interface MetaWebhookPayload {
  entry?: MetaWebhookEntry[];
}

export type WebhookPayload = KapsoWebhookPayload & MetaWebhookPayload & Record<string, unknown>;

export interface NormalizedMessage {
  from: string;
  name: string;
  text: string;
  messageType: string;
  mediaUrl: string | null;
  instanceName: string | null;
  provider: "kapso" | "meta";
  /** wamid.* do Meta. Persistido em whatsapp_messages.message_id pra
   *  permitir status updates (delivered/read/failed) e idempotência. */
  messageId: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Provider detection
// ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the payload looks like a Kapso/Evolution-style webhook
 * (any of v1, v2, v2-real formats). Returns false for Meta Official webhooks.
 */
export function isKapsoPayload(payload: WebhookPayload): boolean {
  // deno-lint-ignore no-explicit-any
  const p = payload as any;
  // v2-real: { message: {...}, conversation: {...}, phone_number_id }
  if (p?.message && p?.conversation) return true;
  if (p?.message && p?.phone_number_id) return true;
  // v2 old: { event: "whatsapp.message.received", data: {...} }
  const event = p?.event;
  if (typeof event === "string" && event.startsWith("whatsapp.")) return true;
  // Legacy: { event: "messages.upsert", instance, data: { key: {...} } }
  return !!(p?.event || p?.instance || p?.data?.key);
}

// ─────────────────────────────────────────────────────────────────
// Kapso normalizer (handles all 3 format variants)
// ─────────────────────────────────────────────────────────────────

/**
 * Normalize a Kapso webhook payload into the internal NormalizedMessage shape.
 *
 * Returns null when:
 *   - The event is unrelated to a message (connection updates, QR codes, etc.)
 *   - The message is outbound/fromMe (we don't echo bot responses)
 *   - The payload lacks a phone number or text content
 *
 * @param eventHeader Optional X-Webhook-Event header value (v2-real carries the
 *                    event type in the header instead of the body).
 */
export function normalizeKapsoMessage(
  payload: WebhookPayload,
  eventHeader?: string | null,
): NormalizedMessage | null {
  // deno-lint-ignore no-explicit-any
  const raw = payload as any;

  // ── v2-real format ─────────────────────────────────────────
  if (raw?.message && (raw?.conversation || raw?.phone_number_id)) {
    const msg = raw.message;
    const conv = raw.conversation;
    const kapso = msg?.kapso || {};

    if (kapso.direction === "outbound") return null;

    const phoneNumber = (conv?.phone_number || "").replace(/\D/g, "");
    if (!phoneNumber) return null;

    // Fallback chain robusto pra contact name (v2-real format).
    // Antes: só `conv.kapso.contact_name` → causava "Unknown" em quase todos casos.
    // Agora: cobre estruturas conhecidas do payload Kapso v2 + Meta padrão.
    const contactName = (
      conv?.kapso?.contact_name
      || conv?.contact?.name
      || conv?.contact?.profile?.name
      || conv?.contact_name
      || raw?.contact?.name
      || raw?.contact?.profile?.name
      || raw?.contacts?.[0]?.profile?.name
      || raw?.contacts?.[0]?.name
      || msg?.profile?.name
      || msg?.from_name
      || "Unknown"
    ) as string;
    const msgType = (msg.type || "text") as string;
    let text = "";
    let mediaUrl: string | null = null;

    switch (msgType) {
      case "text":
        text = msg.text?.body || kapso.content || "";
        break;
      case "image":
        text = msg.image?.caption || kapso.content || "[Imagem recebida]";
        mediaUrl = kapso.media_url || kapso.media_data?.url || msg.image?.id || null;
        break;
      case "document":
        text = msg.document?.caption || kapso.content || `[Documento: ${kapso.media_data?.filename || "arquivo"}]`;
        mediaUrl = kapso.media_url || kapso.media_data?.url || msg.document?.id || null;
        break;
      case "audio":
        text = kapso.transcript?.text || kapso.content || "[Audio recebido]";
        mediaUrl = kapso.media_url || kapso.media_data?.url || msg.audio?.id || null;
        break;
      case "video":
        text = msg.video?.caption || kapso.content || "[Video recebido]";
        mediaUrl = kapso.media_url || kapso.media_data?.url || msg.video?.id || null;
        break;
      case "sticker":
        text = "[Sticker recebido]";
        break;
      case "location":
        text = `[Localizacao: ${msg.location?.latitude || "?"},${msg.location?.longitude || "?"}]`;
        break;
      case "interactive":
        text = msg.interactive?.button_reply?.title
          || msg.interactive?.list_reply?.title
          || kapso.content
          || "[Resposta interativa]";
        break;
      case "reaction":
        text = msg.reaction?.emoji || "[Reação]";
        break;
      default:
        text = kapso.content || msg.text?.body || `[${msgType} recebido]`;
        break;
    }

    if (!text) return null;

    const instanceName = raw.phone_number_id || conv?.phone_number_id || null;
    const messageId = (msg.id || raw?.data?.message_id || raw?.message_id || null) as string | null;

    return {
      from: phoneNumber,
      name: contactName,
      text,
      messageType: msgType === "text" ? "text" : msgType,
      mediaUrl,
      instanceName,
      provider: "kapso",
      messageId,
    };
  }

  // ── v2 old format ──────────────────────────────────────────
  const event = raw?.event || eventHeader;
  if (event !== "messages.upsert" && event !== "whatsapp.message.received") return null;

  const data = payload.data;
  if (!data) return null;

  // deno-lint-ignore no-explicit-any
  const d = data as any;
  const v2From = d.from as string | undefined;
  if (v2From || (d.type && !d.key)) {
    const from = (v2From || "").replace(/\D/g, "");
    if (!from) return null;

    const direction = (d.direction || raw.direction || "") as string;
    if (direction === "outbound" || direction === "sent" || d.fromMe === true) return null;

    const contactName = (d.contact?.name || d.contact?.profile?.name || d.pushName || d.name || "Unknown") as string;
    const msgType = (d.type || "text") as string;
    let text = "";
    let mediaUrl: string | null = null;

    switch (msgType) {
      case "text":
        text = d.text?.body || d.body || d.content || "";
        break;
      case "image":
        text = d.image?.caption || "[Imagem recebida]";
        mediaUrl = d.image?.url || d.image?.id || null;
        break;
      case "document":
        text = d.document?.caption || `[Documento: ${d.document?.filename || "arquivo"}]`;
        mediaUrl = d.document?.url || d.document?.id || null;
        break;
      case "audio":
        text = "[Audio recebido]";
        mediaUrl = d.audio?.url || d.audio?.id || null;
        break;
      case "video":
        text = d.video?.caption || "[Video recebido]";
        mediaUrl = d.video?.url || d.video?.id || null;
        break;
      case "sticker":
        text = "[Sticker recebido]";
        break;
      case "contacts":
        text = `[Contato recebido]`;
        break;
      case "location":
        text = `[Localizacao: ${d.location?.latitude || "?"},${d.location?.longitude || "?"}]`;
        break;
      default:
        text = d.text?.body || d.body || `[${msgType} recebido]`;
        break;
    }

    if (!text) return null;

    const instanceName = raw.phone_number_id || raw.metadata?.phone_number_id || payload.instance || null;
    const messageId = (d.id || raw?.message_id || raw?.data?.message_id || null) as string | null;

    return {
      from,
      name: contactName,
      text,
      messageType: msgType === "text" ? "text" : msgType,
      mediaUrl,
      instanceName,
      provider: "kapso",
      messageId,
    };
  }

  // ── Legacy (Evolution API) format ──────────────────────────
  const key = d.key;
  if (key?.fromMe) return null;

  const remoteJid = key?.remoteJid || "";
  const from = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
  if (!from) return null;

  const name = d.pushName || "Unknown";
  const messageType = d.messageType || "conversation";
  let text = "";
  let mediaUrl: string | null = null;

  const msg = d.message;
  if (!msg) return null;

  if (msg.conversation) {
    text = msg.conversation;
  } else if (msg.extendedTextMessage?.text) {
    text = msg.extendedTextMessage.text;
  } else if (msg.imageMessage) {
    text = msg.imageMessage.caption || "[Imagem recebida]";
    mediaUrl = msg.imageMessage.url || null;
  } else if (msg.documentMessage) {
    text = msg.documentMessage.caption || `[Documento: ${msg.documentMessage.fileName || "arquivo"}]`;
    mediaUrl = msg.documentMessage.url || null;
  } else if (msg.audioMessage) {
    text = "[Audio recebido]";
    mediaUrl = msg.audioMessage.url || null;
  } else if (msg.videoMessage) {
    text = msg.videoMessage.caption || "[Video recebido]";
    mediaUrl = msg.videoMessage.url || null;
  } else if (msg.stickerMessage) {
    text = "[Sticker recebido]";
  } else if (msg.contactMessage) {
    text = `[Contato: ${msg.contactMessage.displayName || ""}]`;
  } else if (msg.locationMessage) {
    text = `[Localizacao: ${msg.locationMessage.degreesLatitude},${msg.locationMessage.degreesLongitude}]`;
  } else {
    text = `[${messageType} recebido]`;
  }

  if (!text) return null;

  return {
    from,
    name,
    text,
    messageType: messageType === "conversation" ? "text" : messageType,
    mediaUrl,
    instanceName: payload.instance || null,
    provider: "kapso",
    messageId: (key?.id as string | undefined) ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────
// Meta Official normalizer
// ─────────────────────────────────────────────────────────────────

/**
 * Normalize a Meta Cloud API webhook payload into zero or more
 * NormalizedMessage entries. Returns an empty array for status-only updates
 * (no `messages` key on any change).
 */
export function normalizeMetaMessages(payload: WebhookPayload): NormalizedMessage[] {
  const results: NormalizedMessage[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages) continue;

      for (const message of value.messages) {
        const from = message.from;
        const name = message._vendor?.name || "Unknown";
        const msgType = message.type || "text";
        let text = "";
        let mediaUrl: string | null = null;

        switch (msgType) {
          case "text":
            text = message.text?.body || "";
            break;
          case "image":
            text = message.image?.caption || "[Imagem recebida]";
            mediaUrl = message.image?.id || null;
            break;
          case "document":
            text = message.document?.caption || `[Documento: ${message.document?.filename || "arquivo"}]`;
            mediaUrl = message.document?.id || null;
            break;
          case "audio":
            text = "[Audio recebido]";
            mediaUrl = message.audio?.id || null;
            break;
          default:
            text = `[${msgType} recebido]`;
            break;
        }

        if (text && from) {
          results.push({
            from,
            name,
            text,
            messageType: msgType,
            mediaUrl,
            instanceName: value?.metadata?.phone_number_id || null,
            provider: "meta",
            messageId: (message.id as string | undefined) ?? null,
          });
        }
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────
// Message ID extraction (for deduplication)
// ─────────────────────────────────────────────────────────────────

/**
 * Extract a stable message ID from the payload so we can dedupe retries.
 * Returns null if no ID can be found (caller should log and skip dedup).
 */
export function getMessageId(
  payload: WebhookPayload,
  provider: "kapso" | "meta",
): string | null {
  if (provider === "kapso") {
    // deno-lint-ignore no-explicit-any
    const raw = payload as any;
    return raw?.message?.id
      || payload?.data?.key?.id
      || raw?.data?.message_id
      || raw?.data?.id
      || raw?.message_id
      || null;
  }
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      for (const message of change?.value?.messages || []) {
        return message.id || null;
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// In-memory deduplicator (for unit tests + fast path in edge fn)
// ─────────────────────────────────────────────────────────────────

export interface Deduplicator {
  isDuplicate(id: string): boolean;
  clear(): void;
  size(): number;
}

/**
 * Create an isolated in-memory deduplicator with a TTL.
 * The edge function has its own module-level dedup state for hot-path checks;
 * this factory exists so tests can create fresh instances per test case.
 *
 * @param ttlMs Time-to-live for each entry before it's evicted. Default 5 min.
 * @param clock Injectable clock for deterministic testing. Default Date.now.
 */
export function createDeduplicator(
  ttlMs: number = 5 * 60 * 1000,
  clock: () => number = () => Date.now(),
): Deduplicator {
  const seen = new Map<string, number>();

  return {
    isDuplicate(id: string): boolean {
      const now = clock();
      // Evict expired entries lazily
      for (const [k, ts] of seen) {
        if (now - ts > ttlMs) seen.delete(k);
      }
      if (seen.has(id)) return true;
      seen.set(id, now);
      return false;
    },
    clear(): void {
      seen.clear();
    },
    size(): number {
      return seen.size;
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// HMAC signature verification (pure — needs crypto.subtle available)
// ─────────────────────────────────────────────────────────────────

/**
 * Timing-safe string comparison. Used to compare HMAC signatures and shared
 * secrets without leaking length or prefix information via early exit.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Verify an HMAC-SHA256 signature against a payload using a shared secret.
 * Uses the Web Crypto API (available in both Deno edge runtime and modern
 * Node via `globalThis.crypto`).
 */
export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeCompare(computed, signature);
}

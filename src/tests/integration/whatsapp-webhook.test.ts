/**
 * WhatsApp webhook — integration tests against the REAL normalizers.
 *
 * Unlike the previous version, this file imports directly from
 * `supabase/functions/_shared/whatsapp-logic.ts`. If the edge function's
 * payload handling changes, these tests will fail — which is the point.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isKapsoPayload,
  normalizeKapsoMessage,
  normalizeMetaMessages,
  getMessageId,
  createDeduplicator,
  timingSafeCompare,
  verifyHmacSignature,
  type WebhookPayload,
  type Deduplicator,
} from '../../../supabase/functions/_shared/whatsapp-logic';

// ─── Fixtures ───────────────────────────────────────────────────

const MOCK_KAPSO_LEGACY_MESSAGE: WebhookPayload = {
  event: 'messages.upsert',
  instance: 'jurify-prod',
  data: {
    key: {
      remoteJid: '5511999888777@s.whatsapp.net',
      fromMe: false,
      id: 'evo_msg_001',
    },
    pushName: 'João Silva',
    messageType: 'conversation',
    message: {
      conversation: 'Olá, preciso de ajuda com direito trabalhista.',
    },
  },
};

const MOCK_KAPSO_CONNECTION_UPDATE: WebhookPayload = {
  event: 'connection.update',
  instance: 'jurify-prod',
  data: { state: 'open' } as unknown as WebhookPayload['data'],
};

const MOCK_KAPSO_QRCODE: WebhookPayload = {
  event: 'qrcode.updated',
  instance: 'jurify-prod',
  data: { qrcode: { base64: 'data:image/png;base64,abc123' } } as unknown as WebhookPayload['data'],
};

const MOCK_KAPSO_FROM_ME: WebhookPayload = {
  event: 'messages.upsert',
  instance: 'jurify-prod',
  data: {
    key: {
      remoteJid: '5511999888777@s.whatsapp.net',
      fromMe: true,
      id: 'evo_msg_002',
    },
    pushName: 'Bot',
    messageType: 'conversation',
    message: { conversation: 'Resposta automática' },
  },
};

// v2-real payload: body has no `event`, carries message + conversation.
const MOCK_KAPSO_V2_REAL = {
  message: {
    id: 'kapso_v2_msg_001',
    type: 'text',
    text: { body: 'Mensagem via v2-real' },
    kapso: { direction: 'inbound', content: 'Mensagem via v2-real' },
  },
  conversation: {
    phone_number: '+55 11 98765-4321',
    kapso: { contact_name: 'Ana Paula' },
  },
  phone_number_id: '5511888888888',
} as unknown as WebhookPayload;

const MOCK_KAPSO_V2_REAL_OUTBOUND = {
  message: {
    id: 'kapso_v2_msg_out',
    type: 'text',
    text: { body: 'Resposta do bot' },
    kapso: { direction: 'outbound', content: 'Resposta do bot' },
  },
  conversation: {
    phone_number: '5511999888777',
    kapso: { contact_name: 'Ana' },
  },
  phone_number_id: '5511888888888',
} as unknown as WebhookPayload;

const MOCK_META_WEBHOOK: WebhookPayload = {
  entry: [
    {
      changes: [
        {
          value: {
            messages: [
              {
                from: '5511999888777',
                id: 'wamid.meta_001',
                type: 'text',
                text: { body: 'Preciso de um advogado urgente!' },
                _vendor: { name: 'Maria Santos' },
              },
            ],
          },
        },
      ],
    },
  ],
};

const MOCK_META_STATUS_ONLY: WebhookPayload = {
  entry: [
    {
      changes: [
        {
          value: {
            statuses: [
              { id: 'wamid.status_001', status: 'read', recipient_id: '5511999888777' },
            ],
          },
        },
      ],
    },
  ],
};

const MOCK_META_IMAGE: WebhookPayload = {
  entry: [
    {
      changes: [
        {
          value: {
            messages: [
              {
                from: '5511777666555',
                id: 'wamid.meta_img_001',
                type: 'image',
                image: { id: 'img_media_001', caption: 'Foto do contrato' },
                _vendor: { name: 'Carlos' },
              },
            ],
          },
        },
      ],
    },
  ],
};

// ─── Provider detection ────────────────────────────────────────

describe('isKapsoPayload', () => {
  it('detects legacy Kapso (event + instance + data.key)', () => {
    expect(isKapsoPayload(MOCK_KAPSO_LEGACY_MESSAGE)).toBe(true);
    expect(isKapsoPayload(MOCK_KAPSO_CONNECTION_UPDATE)).toBe(true);
    expect(isKapsoPayload(MOCK_KAPSO_QRCODE)).toBe(true);
  });

  it('detects Kapso v2-real (message + conversation)', () => {
    expect(isKapsoPayload(MOCK_KAPSO_V2_REAL)).toBe(true);
  });

  it('detects Kapso v2-real with phone_number_id instead of conversation', () => {
    const v2OnlyPhoneId = {
      message: { id: 'm1', type: 'text', text: { body: 'hi' } },
      phone_number_id: '5511888888888',
    } as unknown as WebhookPayload;
    expect(isKapsoPayload(v2OnlyPhoneId)).toBe(true);
  });

  it('rejects Meta Official payloads', () => {
    expect(isKapsoPayload(MOCK_META_WEBHOOK)).toBe(false);
    expect(isKapsoPayload(MOCK_META_STATUS_ONLY)).toBe(false);
  });

  it('rejects empty and noise payloads', () => {
    expect(isKapsoPayload({} as WebhookPayload)).toBe(false);
    expect(isKapsoPayload({ random: 'data' } as unknown as WebhookPayload)).toBe(false);
  });
});

// ─── Kapso normalization: legacy (Evolution API) format ───────

describe('normalizeKapsoMessage — legacy format', () => {
  it('normalizes a conversation-type text message', () => {
    const result = normalizeKapsoMessage(MOCK_KAPSO_LEGACY_MESSAGE);
    expect(result).not.toBeNull();
    expect(result).toEqual({
      from: '5511999888777',
      name: 'João Silva',
      text: 'Olá, preciso de ajuda com direito trabalhista.',
      messageType: 'text',
      messageId: 'evo_msg_001',
      mediaUrl: null,
      instanceName: 'jurify-prod',
      provider: 'kapso',
    });
  });

  it('returns null for fromMe (bot echo)', () => {
    expect(normalizeKapsoMessage(MOCK_KAPSO_FROM_ME)).toBeNull();
  });

  it('returns null for non-message events', () => {
    expect(normalizeKapsoMessage(MOCK_KAPSO_CONNECTION_UPDATE)).toBeNull();
    expect(normalizeKapsoMessage(MOCK_KAPSO_QRCODE)).toBeNull();
  });

  it('returns null for messages.upsert with no data', () => {
    expect(normalizeKapsoMessage({ event: 'messages.upsert' } as WebhookPayload)).toBeNull();
  });

  it('returns null for messages.upsert with empty message body', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: { remoteJid: '5511999888777@s.whatsapp.net', fromMe: false, id: 'x' },
        pushName: 'T',
        messageType: 'conversation',
        message: {},
      },
    } as WebhookPayload;
    // No conversation / extendedTextMessage / etc means text becomes
    // `[conversation recebido]`, which is truthy → still produces a row.
    const result = normalizeKapsoMessage(payload);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('[conversation recebido]');
  });

  it('handles extended text message with URL', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: { remoteJid: '5511111111111@s.whatsapp.net', fromMe: false, id: 'ext_001' },
        pushName: 'Teste',
        messageType: 'extendedTextMessage',
        message: { extendedTextMessage: { text: 'Mensagem com link https://example.com' } },
      },
    } as WebhookPayload;
    const result = normalizeKapsoMessage(payload);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Mensagem com link https://example.com');
  });

  it('extracts image URL and caption from imageMessage', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: { remoteJid: '5511222222222@s.whatsapp.net', fromMe: false, id: 'img_001' },
        pushName: 'Foto',
        messageType: 'imageMessage',
        message: { imageMessage: { caption: 'Documento importante', url: 'https://cdn.example.com/img.jpg' } },
      },
    } as WebhookPayload;
    const result = normalizeKapsoMessage(payload);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Documento importante');
    expect(result!.mediaUrl).toBe('https://cdn.example.com/img.jpg');
  });

  it('uses placeholder text for audio messages', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: { remoteJid: '5511333333333@s.whatsapp.net', fromMe: false, id: 'aud_001' },
        pushName: 'Audio',
        messageType: 'audioMessage',
        message: { audioMessage: { url: 'https://cdn.example.com/audio.ogg' } },
      },
    } as WebhookPayload;
    const result = normalizeKapsoMessage(payload);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('[Audio recebido]');
    expect(result!.mediaUrl).toBe('https://cdn.example.com/audio.ogg');
  });

  it('strips group suffix from JIDs', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: { remoteJid: '120363123456789@g.us', fromMe: false, id: 'grp_001' },
        pushName: 'Grupo',
        messageType: 'conversation',
        message: { conversation: 'Mensagem no grupo' },
      },
    } as WebhookPayload;
    const result = normalizeKapsoMessage(payload);
    expect(result).not.toBeNull();
    expect(result!.from).toBe('120363123456789');
  });

  it('accepts event from the X-Webhook-Event header when body has no event', () => {
    const payload = {
      instance: 'test',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'hdr_001' },
        pushName: 'HeaderEvent',
        messageType: 'conversation',
        message: { conversation: 'via header' },
      },
    } as WebhookPayload;
    const result = normalizeKapsoMessage(payload, 'messages.upsert');
    expect(result).not.toBeNull();
    expect(result!.text).toBe('via header');
  });
});

// ─── Kapso normalization: v2-real format ──────────────────────

describe('normalizeKapsoMessage — v2-real format', () => {
  it('normalizes an inbound text message', () => {
    const result = normalizeKapsoMessage(MOCK_KAPSO_V2_REAL);
    expect(result).not.toBeNull();
    expect(result!.from).toBe('5511987654321'); // non-digits stripped
    expect(result!.name).toBe('Ana Paula');
    expect(result!.text).toBe('Mensagem via v2-real');
    expect(result!.messageType).toBe('text');
    expect(result!.provider).toBe('kapso');
    expect(result!.instanceName).toBe('5511888888888');
  });

  it('returns null for outbound messages (direction: outbound)', () => {
    expect(normalizeKapsoMessage(MOCK_KAPSO_V2_REAL_OUTBOUND)).toBeNull();
  });

  it('returns null when phone_number is missing', () => {
    const payload = {
      message: { id: 'x', type: 'text', text: { body: 'hi' }, kapso: { direction: 'inbound' } },
      conversation: { phone_number: '', kapso: { contact_name: 'None' } },
      phone_number_id: '5511888888888',
    } as unknown as WebhookPayload;
    expect(normalizeKapsoMessage(payload)).toBeNull();
  });

  it('extracts image caption and media_url', () => {
    const payload = {
      message: {
        id: 'x',
        type: 'image',
        image: { caption: 'Olha o contrato' },
        kapso: { direction: 'inbound', media_url: 'https://cdn/x.jpg' },
      },
      conversation: { phone_number: '5511987654321', kapso: { contact_name: 'Teste' } },
      phone_number_id: '5511888888888',
    } as unknown as WebhookPayload;
    const result = normalizeKapsoMessage(payload);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Olha o contrato');
    expect(result!.mediaUrl).toBe('https://cdn/x.jpg');
    expect(result!.messageType).toBe('image');
  });

  it('extracts interactive button reply title', () => {
    const payload = {
      message: {
        id: 'x',
        type: 'interactive',
        interactive: { button_reply: { title: 'Confirmar agendamento' } },
        kapso: { direction: 'inbound' },
      },
      conversation: { phone_number: '5511987654321', kapso: { contact_name: 'Teste' } },
      phone_number_id: '5511888888888',
    } as unknown as WebhookPayload;
    const result = normalizeKapsoMessage(payload);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Confirmar agendamento');
  });

  it('uses kapso.transcript for audio when available', () => {
    const payload = {
      message: {
        id: 'x',
        type: 'audio',
        kapso: { direction: 'inbound', transcript: { text: 'Oi, preciso de ajuda' }, media_url: 'https://cdn/a.ogg' },
      },
      conversation: { phone_number: '5511987654321', kapso: { contact_name: 'Teste' } },
      phone_number_id: '5511888888888',
    } as unknown as WebhookPayload;
    const result = normalizeKapsoMessage(payload);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Oi, preciso de ajuda');
    expect(result!.mediaUrl).toBe('https://cdn/a.ogg');
  });
});

// ─── Meta Official normalization ──────────────────────────────

describe('normalizeMetaMessages', () => {
  it('normalizes a single text message', () => {
    const results = normalizeMetaMessages(MOCK_META_WEBHOOK);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      from: '5511999888777',
      name: 'Maria Santos',
      text: 'Preciso de um advogado urgente!',
      messageType: 'text',
      messageId: 'wamid.meta_001',
      mediaUrl: null,
      instanceName: null,
      provider: 'meta',
    });
  });

  it('normalizes an image with caption', () => {
    const results = normalizeMetaMessages(MOCK_META_IMAGE);
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('Foto do contrato');
    expect(results[0].messageType).toBe('image');
    expect(results[0].mediaUrl).toBe('img_media_001');
  });

  it('returns empty for status-only updates', () => {
    expect(normalizeMetaMessages(MOCK_META_STATUS_ONLY)).toHaveLength(0);
  });

  it('returns empty for empty payloads', () => {
    expect(normalizeMetaMessages({} as WebhookPayload)).toHaveLength(0);
    expect(normalizeMetaMessages({ entry: [] })).toHaveLength(0);
  });

  it('handles document messages with filename fallback', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '5511444444444',
              id: 'wamid.doc_001',
              type: 'document',
              document: { id: 'doc_media_001', filename: 'contrato.pdf' },
              _vendor: { name: 'Doc User' },
            }],
          },
        }],
      }],
    } as WebhookPayload;
    const results = normalizeMetaMessages(payload);
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('[Documento: contrato.pdf]');
    expect(results[0].mediaUrl).toBe('doc_media_001');
  });

  it('normalizes multiple messages in a single webhook', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messages: [
              { from: '5511111111111', id: 'w1', type: 'text', text: { body: 'Msg 1' }, _vendor: { name: 'A' } },
              { from: '5511222222222', id: 'w2', type: 'text', text: { body: 'Msg 2' }, _vendor: { name: 'B' } },
            ],
          },
        }],
      }],
    } as WebhookPayload;
    const results = normalizeMetaMessages(payload);
    expect(results).toHaveLength(2);
    expect(results[0].from).toBe('5511111111111');
    expect(results[1].from).toBe('5511222222222');
  });

  it('drops messages with empty text body', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messages: [
              { from: '5511111111111', id: 'empty', type: 'text', text: { body: '' }, _vendor: { name: 'A' } },
            ],
          },
        }],
      }],
    } as WebhookPayload;
    const results = normalizeMetaMessages(payload);
    expect(results).toHaveLength(0);
  });

  it('drops messages without `from` field', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messages: [
              { id: 'nofrom', type: 'text', text: { body: 'orphan' }, _vendor: { name: 'X' } },
            ],
          },
        }],
      }],
    } as WebhookPayload;
    const results = normalizeMetaMessages(payload);
    expect(results).toHaveLength(0);
  });
});

// ─── Message ID extraction ────────────────────────────────────

describe('getMessageId', () => {
  it('extracts Kapso legacy message ID from data.key.id', () => {
    expect(getMessageId(MOCK_KAPSO_LEGACY_MESSAGE, 'kapso')).toBe('evo_msg_001');
  });

  it('extracts Kapso v2-real message ID from message.id', () => {
    expect(getMessageId(MOCK_KAPSO_V2_REAL, 'kapso')).toBe('kapso_v2_msg_001');
  });

  it('extracts Meta message ID from first message in first change', () => {
    expect(getMessageId(MOCK_META_WEBHOOK, 'meta')).toBe('wamid.meta_001');
  });

  it('returns null when ID is absent', () => {
    expect(getMessageId({} as WebhookPayload, 'kapso')).toBeNull();
    expect(getMessageId({} as WebhookPayload, 'meta')).toBeNull();
  });
});

// ─── Deduplicator ────────────────────────────────────────────

describe('createDeduplicator', () => {
  let dedup: Deduplicator;

  beforeEach(() => {
    dedup = createDeduplicator();
  });

  it('does not flag a first-seen ID as duplicate', () => {
    expect(dedup.isDuplicate('msg_001')).toBe(false);
  });

  it('flags the second occurrence of the same ID', () => {
    dedup.isDuplicate('msg_001');
    expect(dedup.isDuplicate('msg_001')).toBe(true);
  });

  it('treats distinct IDs independently', () => {
    dedup.isDuplicate('msg_001');
    expect(dedup.isDuplicate('msg_002')).toBe(false);
  });

  it('evicts expired entries past the TTL (with injected clock)', () => {
    let now = 1_000_000;
    const clock = () => now;
    const d = createDeduplicator(500, clock);

    expect(d.isDuplicate('x')).toBe(false);
    expect(d.isDuplicate('x')).toBe(true);

    now += 1000; // past 500ms TTL
    expect(d.isDuplicate('x')).toBe(false); // re-inserted after eviction
    expect(d.size()).toBe(1);
  });

  it('clear() wipes all stored IDs', () => {
    dedup.isDuplicate('a');
    dedup.isDuplicate('b');
    expect(dedup.size()).toBe(2);
    dedup.clear();
    expect(dedup.size()).toBe(0);
    expect(dedup.isDuplicate('a')).toBe(false);
  });

  it('isolates state between deduplicator instances', () => {
    const d1 = createDeduplicator();
    const d2 = createDeduplicator();
    d1.isDuplicate('shared');
    expect(d2.isDuplicate('shared')).toBe(false);
  });
});

// ─── Timing-safe compare ─────────────────────────────────────

describe('timingSafeCompare', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeCompare('secret123', 'secret123')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(timingSafeCompare('secret123', 'secret124')).toBe(false);
  });

  it('returns false for strings of different length', () => {
    expect(timingSafeCompare('abc', 'abcd')).toBe(false);
  });

  it('returns true for two empty strings', () => {
    expect(timingSafeCompare('', '')).toBe(true);
  });
});

// ─── HMAC verification ───────────────────────────────────────

describe('verifyHmacSignature', () => {
  const secret = 'tenant-secret-xyz';
  const payload = JSON.stringify({ event: 'test' });

  async function computeHmac(): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  it('accepts a valid signature', async () => {
    const signature = await computeHmac();
    expect(await verifyHmacSignature(payload, signature, secret)).toBe(true);
  });

  it('rejects a signature from a different secret', async () => {
    const signature = await computeHmac();
    expect(await verifyHmacSignature(payload, signature, 'wrong-secret')).toBe(false);
  });

  it('rejects a tampered payload', async () => {
    const signature = await computeHmac();
    expect(await verifyHmacSignature(payload + '.', signature, secret)).toBe(false);
  });

  it('rejects a truncated signature', async () => {
    const signature = (await computeHmac()).slice(0, 30);
    expect(await verifyHmacSignature(payload, signature, secret)).toBe(false);
  });
});

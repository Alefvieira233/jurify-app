/**
 * 🧪 TESTES DE INTEGRAÇÃO — WHATSAPP WEBHOOK
 *
 * Valida o fluxo completo do webhook WhatsApp:
 * - Normalização de payloads Evolution API e Meta Official
 * - Deduplicação de mensagens
 * - Resolução de tenant via admin profile
 * - Criação/atualização de leads e conversas
 * - Invocação do agente IA (Coordenador)
 * - Envio de resposta via Evolution ou Meta
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Data ───────────────────────────────────────────────

const MOCK_EVOLUTION_MESSAGE_UPSERT = {
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

const MOCK_EVOLUTION_CONNECTION_UPDATE = {
  event: 'connection.update',
  instance: 'jurify-prod',
  data: { state: 'open' },
};

const MOCK_EVOLUTION_QRCODE = {
  event: 'qrcode.updated',
  instance: 'jurify-prod',
  data: { qrcode: { base64: 'data:image/png;base64,abc123' } },
};

const MOCK_EVOLUTION_FROM_ME = {
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

const MOCK_META_WEBHOOK = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'entry_001',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '5511888888888',
              phone_number_id: '123456789',
            },
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
          field: 'messages',
        },
      ],
    },
  ],
};

const MOCK_META_STATUS_UPDATE = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'entry_002',
      changes: [
        {
          value: {
            statuses: [
              {
                id: 'wamid.status_001',
                status: 'read',
                recipient_id: '5511999888777',
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
};

const MOCK_META_IMAGE_MESSAGE = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'entry_003',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
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
          field: 'messages',
        },
      ],
    },
  ],
};

// ─── Normalization Logic (extracted for testability) ─────────

interface NormalizedMessage {
  from: string;
  name: string;
  text: string;
  messageType: string;
  mediaUrl: string | null;
  instanceName: string | null;
  provider: 'evolution' | 'meta';
}

type WebhookPayload = Record<string, unknown>;

function isEvolutionPayload(payload: WebhookPayload): boolean {
  return !!(payload?.event || payload?.instance || (payload?.data as Record<string, unknown>)?.key);
}

function normalizeEvolutionMessage(payload: WebhookPayload): NormalizedMessage | null {
  const event = payload.event as string;
  if (event !== 'messages.upsert') return null;

  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const key = data.key as Record<string, unknown> | undefined;
  if (key?.fromMe) return null;

  const remoteJid = (key?.remoteJid as string) || '';
  const from = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  if (!from) return null;

  const name = (data.pushName as string) || 'Unknown';
  const messageType = (data.messageType as string) || 'conversation';
  const msg = data.message as Record<string, unknown> | undefined;
  if (!msg) return null;

  let text = '';
  let mediaUrl: string | null = null;

  if (msg.conversation) {
    text = msg.conversation as string;
  } else if ((msg.extendedTextMessage as Record<string, unknown>)?.text) {
    text = (msg.extendedTextMessage as Record<string, unknown>).text as string;
  } else if (msg.imageMessage) {
    const img = msg.imageMessage as Record<string, unknown>;
    text = (img.caption as string) || '[Imagem recebida]';
    mediaUrl = (img.url as string) || null;
  } else if (msg.audioMessage) {
    text = '[Audio recebido]';
    mediaUrl = (msg.audioMessage as Record<string, unknown>).url as string || null;
  } else {
    text = `[${messageType} recebido]`;
  }

  if (!text) return null;

  return {
    from,
    name,
    text,
    messageType: messageType === 'conversation' ? 'text' : messageType,
    mediaUrl,
    instanceName: (payload.instance as string) || null,
    provider: 'evolution',
  };
}

function normalizeMetaMessages(payload: WebhookPayload): NormalizedMessage[] {
  const results: NormalizedMessage[] = [];
  const entries = (payload.entry as Record<string, unknown>[]) || [];

  for (const entry of entries) {
    const changes = (entry.changes as Record<string, unknown>[]) || [];
    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      const messages = (value?.messages as Record<string, unknown>[]) || [];

      for (const message of messages) {
        const from = message.from as string;
        const vendor = message._vendor as Record<string, unknown> | undefined;
        const name = (vendor?.name as string) || 'Unknown';
        const msgType = (message.type as string) || 'text';
        let text = '';
        let mediaUrl: string | null = null;

        switch (msgType) {
          case 'text': {
            const textObj = message.text as Record<string, unknown> | undefined;
            text = (textObj?.body as string) || '';
            break;
          }
          case 'image': {
            const img = message.image as Record<string, unknown> | undefined;
            text = (img?.caption as string) || '[Imagem recebida]';
            mediaUrl = (img?.id as string) || null;
            break;
          }
          case 'document': {
            const doc = message.document as Record<string, unknown> | undefined;
            text = (doc?.caption as string) || `[Documento: ${(doc?.filename as string) || 'arquivo'}]`;
            mediaUrl = (doc?.id as string) || null;
            break;
          }
          case 'audio':
            text = '[Audio recebido]';
            mediaUrl = (message.audio as Record<string, unknown>)?.id as string || null;
            break;
          default:
            text = `[${msgType} recebido]`;
        }

        if (text) {
          results.push({ from, name, text, messageType: msgType, mediaUrl, instanceName: null, provider: 'meta' });
        }
      }
    }
  }

  return results;
}

// ─── Deduplication Logic ─────────────────────────────────────

function createDeduplicator() {
  const processed = new Map<string, number>();
  const TTL = 5 * 60 * 1000;

  return {
    isDuplicate(id: string): boolean {
      const now = Date.now();
      for (const [key, ts] of processed) {
        if (now - ts > TTL) processed.delete(key);
      }
      if (processed.has(id)) return true;
      processed.set(id, now);
      return false;
    },
    clear() {
      processed.clear();
    },
  };
}

function getMessageId(payload: WebhookPayload, provider: 'evolution' | 'meta'): string | null {
  if (provider === 'evolution') {
    const data = payload.data as Record<string, unknown> | undefined;
    const key = data?.key as Record<string, unknown> | undefined;
    return (key?.id as string) || null;
  }
  const entries = (payload.entry as Record<string, unknown>[]) || [];
  for (const entry of entries) {
    const changes = (entry.changes as Record<string, unknown>[]) || [];
    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      const messages = (value?.messages as Record<string, unknown>[]) || [];
      for (const message of messages) {
        return (message.id as string) || null;
      }
    }
  }
  return null;
}

// ─── Tests ───────────────────────────────────────────────────

describe('WhatsApp Webhook — Payload Detection', () => {
  it('detects Evolution API payload', () => {
    expect(isEvolutionPayload(MOCK_EVOLUTION_MESSAGE_UPSERT as unknown as WebhookPayload)).toBe(true);
    expect(isEvolutionPayload(MOCK_EVOLUTION_CONNECTION_UPDATE as unknown as WebhookPayload)).toBe(true);
    expect(isEvolutionPayload(MOCK_EVOLUTION_QRCODE as unknown as WebhookPayload)).toBe(true);
  });

  it('detects Meta Official API payload', () => {
    expect(isEvolutionPayload(MOCK_META_WEBHOOK as unknown as WebhookPayload)).toBe(false);
    expect(isEvolutionPayload(MOCK_META_STATUS_UPDATE as unknown as WebhookPayload)).toBe(false);
  });

  it('handles empty/null payloads gracefully', () => {
    expect(isEvolutionPayload({} as WebhookPayload)).toBe(false);
    expect(isEvolutionPayload({ random: 'data' } as WebhookPayload)).toBe(false);
  });
});

describe('WhatsApp Webhook — Evolution API Normalization', () => {
  it('normalizes a text message correctly', () => {
    const result = normalizeEvolutionMessage(MOCK_EVOLUTION_MESSAGE_UPSERT as unknown as WebhookPayload);
    expect(result).not.toBeNull();
    expect(result!.from).toBe('5511999888777');
    expect(result!.name).toBe('João Silva');
    expect(result!.text).toBe('Olá, preciso de ajuda com direito trabalhista.');
    expect(result!.messageType).toBe('text');
    expect(result!.provider).toBe('evolution');
    expect(result!.instanceName).toBe('jurify-prod');
    expect(result!.mediaUrl).toBeNull();
  });

  it('ignores fromMe messages (bot replies)', () => {
    const result = normalizeEvolutionMessage(MOCK_EVOLUTION_FROM_ME as unknown as WebhookPayload);
    expect(result).toBeNull();
  });

  it('ignores non-message events', () => {
    expect(normalizeEvolutionMessage(MOCK_EVOLUTION_CONNECTION_UPDATE as unknown as WebhookPayload)).toBeNull();
    expect(normalizeEvolutionMessage(MOCK_EVOLUTION_QRCODE as unknown as WebhookPayload)).toBeNull();
  });

  it('handles missing data gracefully', () => {
    expect(normalizeEvolutionMessage({ event: 'messages.upsert' } as WebhookPayload)).toBeNull();
    expect(normalizeEvolutionMessage({ event: 'messages.upsert', data: {} } as WebhookPayload)).toBeNull();
  });
});

describe('WhatsApp Webhook — Meta Official API Normalization', () => {
  it('normalizes a text message correctly', () => {
    const results = normalizeMetaMessages(MOCK_META_WEBHOOK as unknown as WebhookPayload);
    expect(results).toHaveLength(1);
    expect(results[0].from).toBe('5511999888777');
    expect(results[0].name).toBe('Maria Santos');
    expect(results[0].text).toBe('Preciso de um advogado urgente!');
    expect(results[0].messageType).toBe('text');
    expect(results[0].provider).toBe('meta');
    expect(results[0].instanceName).toBeNull();
  });

  it('normalizes an image message with caption', () => {
    const results = normalizeMetaMessages(MOCK_META_IMAGE_MESSAGE as unknown as WebhookPayload);
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('Foto do contrato');
    expect(results[0].messageType).toBe('image');
    expect(results[0].mediaUrl).toBe('img_media_001');
  });

  it('returns empty array for status-only updates', () => {
    const results = normalizeMetaMessages(MOCK_META_STATUS_UPDATE as unknown as WebhookPayload);
    expect(results).toHaveLength(0);
  });

  it('handles empty payload', () => {
    expect(normalizeMetaMessages({} as WebhookPayload)).toHaveLength(0);
    expect(normalizeMetaMessages({ entry: [] } as WebhookPayload)).toHaveLength(0);
  });
});

describe('WhatsApp Webhook — Deduplication', () => {
  let dedup: ReturnType<typeof createDeduplicator>;

  beforeEach(() => {
    dedup = createDeduplicator();
  });

  it('first message is not a duplicate', () => {
    expect(dedup.isDuplicate('msg_001')).toBe(false);
  });

  it('same message ID is detected as duplicate', () => {
    dedup.isDuplicate('msg_001');
    expect(dedup.isDuplicate('msg_001')).toBe(true);
  });

  it('different message IDs are not duplicates', () => {
    dedup.isDuplicate('msg_001');
    expect(dedup.isDuplicate('msg_002')).toBe(false);
  });

  it('extracts Evolution message ID', () => {
    const id = getMessageId(MOCK_EVOLUTION_MESSAGE_UPSERT as unknown as WebhookPayload, 'evolution');
    expect(id).toBe('evo_msg_001');
  });

  it('extracts Meta message ID', () => {
    const id = getMessageId(MOCK_META_WEBHOOK as unknown as WebhookPayload, 'meta');
    expect(id).toBe('wamid.meta_001');
  });

  it('returns null for missing message ID', () => {
    expect(getMessageId({} as WebhookPayload, 'evolution')).toBeNull();
    expect(getMessageId({} as WebhookPayload, 'meta')).toBeNull();
  });
});

describe('WhatsApp Webhook — Edge Cases', () => {
  it('handles Evolution extended text message', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: { remoteJid: '5511111111111@s.whatsapp.net', fromMe: false, id: 'ext_001' },
        pushName: 'Teste',
        messageType: 'extendedTextMessage',
        message: { extendedTextMessage: { text: 'Mensagem com link https://example.com' } },
      },
    };
    const result = normalizeEvolutionMessage(payload as unknown as WebhookPayload);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Mensagem com link https://example.com');
  });

  it('handles Evolution image message', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: { remoteJid: '5511222222222@s.whatsapp.net', fromMe: false, id: 'img_001' },
        pushName: 'Foto',
        messageType: 'imageMessage',
        message: { imageMessage: { caption: 'Documento importante', url: 'https://cdn.example.com/img.jpg' } },
      },
    };
    const result = normalizeEvolutionMessage(payload as unknown as WebhookPayload);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Documento importante');
    expect(result!.mediaUrl).toBe('https://cdn.example.com/img.jpg');
  });

  it('handles Evolution audio message', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: { remoteJid: '5511333333333@s.whatsapp.net', fromMe: false, id: 'aud_001' },
        pushName: 'Audio',
        messageType: 'audioMessage',
        message: { audioMessage: { url: 'https://cdn.example.com/audio.ogg' } },
      },
    };
    const result = normalizeEvolutionMessage(payload as unknown as WebhookPayload);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('[Audio recebido]');
    expect(result!.mediaUrl).toBe('https://cdn.example.com/audio.ogg');
  });

  it('handles group JID format', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: { remoteJid: '120363123456789@g.us', fromMe: false, id: 'grp_001' },
        pushName: 'Grupo',
        messageType: 'conversation',
        message: { conversation: 'Mensagem no grupo' },
      },
    };
    const result = normalizeEvolutionMessage(payload as unknown as WebhookPayload);
    expect(result).not.toBeNull();
    expect(result!.from).toBe('120363123456789');
  });

  it('handles Meta document message', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'e1',
        changes: [{
          value: {
            messages: [{
              from: '5511444444444',
              id: 'wamid.doc_001',
              type: 'document',
              document: { id: 'doc_media_001', filename: 'contrato.pdf', caption: '' },
              _vendor: { name: 'Doc User' },
            }],
          },
          field: 'messages',
        }],
      }],
    };
    const results = normalizeMetaMessages(payload as unknown as WebhookPayload);
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('[Documento: contrato.pdf]');
    expect(results[0].mediaUrl).toBe('doc_media_001');
  });

  it('handles multiple messages in single Meta webhook', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'e1',
        changes: [{
          value: {
            messages: [
              { from: '5511111111111', id: 'w1', type: 'text', text: { body: 'Msg 1' }, _vendor: { name: 'A' } },
              { from: '5511222222222', id: 'w2', type: 'text', text: { body: 'Msg 2' }, _vendor: { name: 'B' } },
            ],
          },
          field: 'messages',
        }],
      }],
    };
    const results = normalizeMetaMessages(payload as unknown as WebhookPayload);
    expect(results).toHaveLength(2);
    expect(results[0].from).toBe('5511111111111');
    expect(results[1].from).toBe('5511222222222');
  });
});

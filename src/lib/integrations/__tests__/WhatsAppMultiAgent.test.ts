import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockFunctionsData: unknown = null;
let mockFunctionsError: unknown = null;
let mockQueryCount: number | null = null;
let mockQueryData: unknown = null;

function createChainableQuery() {
  const result = { data: mockQueryData, error: null, count: mockQueryCount };
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') return (f?: (v: unknown) => unknown, r?: (e: unknown) => unknown) => Promise.resolve(result).then(f, r);
      if (prop === 'catch') return (r?: (e: unknown) => unknown) => Promise.resolve(result).catch(r);
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock('@/integrations/supabase/client', () => {
  const client = {
    from: () => createChainableQuery(),
    functions: {
      invoke: () => Promise.resolve({ data: mockFunctionsData, error: mockFunctionsError }),
    },
  };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { WhatsAppMultiAgentIntegration, whatsAppMultiAgent, sendWhatsAppMessage } from '../WhatsAppMultiAgent';

describe('WhatsAppMultiAgentIntegration', () => {
  let service: WhatsAppMultiAgentIntegration;

  beforeEach(() => {
    service = WhatsAppMultiAgentIntegration.getInstance();
    vi.clearAllMocks();
    mockFunctionsData = null;
    mockFunctionsError = null;
    mockQueryCount = null;
    mockQueryData = null;
  });

  it('returns singleton', () => {
    expect(WhatsAppMultiAgentIntegration.getInstance()).toBe(service);
    expect(whatsAppMultiAgent).toBe(service);
  });

  describe('sendMessage', () => {
    it('returns true on success', async () => {
      mockFunctionsData = { success: true, messageId: 'msg-1' };
      expect(await service.sendMessage('5511999', 'Olá')).toBe(true);
    });

    it('returns false with missing params', async () => {
      expect(await service.sendMessage('', 'text')).toBe(false);
      expect(await service.sendMessage('num', '')).toBe(false);
    });

    it('returns false on edge function error', async () => {
      mockFunctionsError = { message: 'timeout' };
      expect(await service.sendMessage('5511999', 'Olá')).toBe(false);
    });

    it('returns false when data.success is false', async () => {
      mockFunctionsData = { success: false, error: 'rate limited' };
      expect(await service.sendMessage('5511999', 'Olá')).toBe(false);
    });

    it('passes leadId and conversationId', async () => {
      mockFunctionsData = { success: true, messageId: 'msg-2' };
      expect(await service.sendMessage('5511999', 'Hi', 'lead-1', 'conv-1')).toBe(true);
    });
  });

  describe('sendTemplateMessage', () => {
    it('returns true on success', async () => {
      mockFunctionsData = { success: true };
      expect(await service.sendTemplateMessage('5511999', 'welcome', ['João'])).toBe(true);
    });

    it('returns false on error', async () => {
      mockFunctionsError = { message: 'fail' };
      expect(await service.sendTemplateMessage('5511999', 'welcome', [])).toBe(false);
    });

    it('returns false when success=false', async () => {
      mockFunctionsData = { success: false, error: 'template not found' };
      expect(await service.sendTemplateMessage('5511999', 'invalid', [])).toBe(false);
    });
  });

  describe('getWhatsAppStats', () => {
    it('returns computed stats', async () => {
      mockQueryCount = 10;
      mockQueryData = [
        { sender: 'lead' }, { sender: 'lead' },
        { sender: 'ia' }, { sender: 'agent' },
      ];
      const stats = await service.getWhatsAppStats();
      expect(stats.total_conversations).toBe(10);
      expect(stats.active_conversations).toBe(10);
      expect(stats.messages_received_24h).toBe(2);
      expect(stats.messages_sent_24h).toBe(2);
      expect(stats.response_rate).toBe('100.0');
    });

    it('handles zero incoming messages', async () => {
      mockQueryCount = 0;
      mockQueryData = [];
      const stats = await service.getWhatsAppStats();
      expect(stats.response_rate).toBe('0');
    });
  });

  describe('testConnection', () => {
    it('returns success when healthy', async () => {
      mockFunctionsData = { status: 'healthy' };
      const result = await service.testConnection();
      expect(result.success).toBe(true);
    });

    it('returns failure on error', async () => {
      mockFunctionsError = { message: 'Timeout' };
      const result = await service.testConnection();
      expect(result.success).toBe(false);
    });

    it('returns failure when unhealthy', async () => {
      mockFunctionsData = { status: 'degraded' };
      const result = await service.testConnection();
      expect(result.success).toBe(false);
    });
  });
});

describe('sendWhatsAppMessage helper', () => {
  beforeEach(() => {
    mockFunctionsData = null;
    mockFunctionsError = null;
  });

  it('delegates to instance sendMessage', async () => {
    mockFunctionsData = { success: true, messageId: 'msg-1' };
    expect(await sendWhatsAppMessage('5511999', 'Hi', 'lead-1')).toBe(true);
  });
});

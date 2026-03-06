import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockFunctionsData: unknown = null;
let mockFunctionsError: unknown = null;
let mockQueryCount: number | null = null;

function createChainableQuery() {
  const result = { data: null, error: null, count: mockQueryCount };
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

import { EnterpriseWhatsAppIntegration, enterpriseWhatsApp, sendEnterpriseWhatsAppMessage } from '../EnterpriseWhatsApp';

describe('EnterpriseWhatsAppIntegration', () => {
  let service: EnterpriseWhatsAppIntegration;

  beforeEach(() => {
    service = EnterpriseWhatsAppIntegration.getInstance();
    vi.clearAllMocks();
    mockFunctionsData = null;
    mockFunctionsError = null;
    mockQueryCount = null;
  });

  it('returns singleton instance', () => {
    expect(EnterpriseWhatsAppIntegration.getInstance()).toBe(service);
    expect(enterpriseWhatsApp).toBe(service);
  });

  describe('sendMessage', () => {
    it('sends message successfully', async () => {
      mockFunctionsData = { success: true, messageId: 'msg-1', timestamp: '2025-01-01' };
      const result = await service.sendMessage('5511999999999', 'Hello');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-1');
    });

    it('validates empty phone number', async () => {
      const result = await service.sendMessage('', 'Hello');
      expect(result.success).toBe(false);
      expect(result.error).toContain('obrigatórios');
    });

    it('validates empty text', async () => {
      const result = await service.sendMessage('5511999', '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('obrigatórios');
    });

    it('validates message length > 4096', async () => {
      const longText = 'a'.repeat(4097);
      const result = await service.sendMessage('5511999', longText);
      expect(result.success).toBe(false);
      expect(result.error).toContain('muito longa');
    });

    it('handles edge function error', async () => {
      mockFunctionsError = { message: 'Edge function failed' };
      const result = await service.sendMessage('5511999', 'Hello');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Edge function failed');
    });

    it('handles data with success=false', async () => {
      mockFunctionsData = { success: false, error: 'Rate limited' };
      const result = await service.sendMessage('5511999', 'Hello');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limited');
    });

    it('handles null data', async () => {
      mockFunctionsData = null;
      mockFunctionsError = null;
      const result = await service.sendMessage('5511999', 'Hello');
      expect(result.success).toBe(false);
    });

    it('passes conversationId and leadId', async () => {
      mockFunctionsData = { success: true, messageId: 'msg-2', timestamp: '2025-01-01' };
      const result = await service.sendMessage('5511999', 'Hi', 'conv-1', 'lead-1');
      expect(result.success).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('returns success when healthy', async () => {
      mockFunctionsData = { status: 'healthy' };
      const result = await service.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('OK');
    });

    it('returns failure on error', async () => {
      mockFunctionsError = { message: 'Timeout' };
      const result = await service.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Timeout');
    });

    it('returns failure when not healthy', async () => {
      mockFunctionsData = { status: 'unhealthy' };
      const result = await service.testConnection();
      expect(result.success).toBe(false);
    });
  });

  describe('getUsageStats', () => {
    it('returns stats counts', async () => {
      mockQueryCount = 42;
      const stats = await service.getUsageStats('tenant-1');
      expect(stats.totalMessages).toBe(42);
      expect(stats.messagesThisMonth).toBe(42);
      expect(stats.activeConversations).toBe(42);
    });

    it('returns zeros when count is null', async () => {
      mockQueryCount = null;
      const stats = await service.getUsageStats();
      expect(stats.totalMessages).toBe(0);
      expect(stats.messagesThisMonth).toBe(0);
      expect(stats.activeConversations).toBe(0);
    });
  });
});

describe('sendEnterpriseWhatsAppMessage', () => {
  beforeEach(() => {
    mockFunctionsData = null;
    mockFunctionsError = null;
  });

  it('returns true on success', async () => {
    mockFunctionsData = { success: true, messageId: 'msg-1', timestamp: '2025-01-01' };
    const result = await sendEnterpriseWhatsAppMessage('5511999', 'Hi');
    expect(result).toBe(true);
  });

  it('returns false on failure', async () => {
    mockFunctionsError = { message: 'fail' };
    const result = await sendEnterpriseWhatsAppMessage('5511999', 'Hi');
    expect(result).toBe(false);
  });
});

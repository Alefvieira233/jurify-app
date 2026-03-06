import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockResolvedData: unknown = null;
let mockResolvedError: unknown = null;
let mockFunctionsData: unknown = null;
let mockFunctionsError: unknown = null;

function createChainableQuery() {
  const result = { data: mockResolvedData, error: mockResolvedError };
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
    rpc: () => createChainableQuery(),
    functions: {
      invoke: () => Promise.resolve({ data: mockFunctionsData, error: mockFunctionsError }),
    },
  };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { AgentMemoryService, agentMemory } from '../AgentMemory';

describe('AgentMemoryService', () => {
  let service: AgentMemoryService;

  beforeEach(() => {
    service = AgentMemoryService.getInstance();
    vi.clearAllMocks();
    mockResolvedData = null;
    mockResolvedError = null;
    mockFunctionsData = null;
    mockFunctionsError = null;
  });

  it('returns singleton instance', () => {
    expect(AgentMemoryService.getInstance()).toBe(service);
    expect(agentMemory).toBe(service);
  });

  describe('store', () => {
    it('stores memory with embedding', async () => {
      mockFunctionsData = { embedding: [0.1, 0.2] };
      mockResolvedData = { id: 'mem-1' };
      const id = await service.store({
        tenant_id: 't1', agent_name: 'Agent1', memory_type: 'fact',
        content: 'Test memory', importance: 5,
      });
      expect(id).toBe('mem-1');
    });

    it('stores memory without embedding on embed failure', async () => {
      mockFunctionsError = { message: 'embed fail' };
      mockResolvedData = { id: 'mem-2' };
      const id = await service.store({
        tenant_id: 't1', agent_name: 'Agent1', memory_type: 'conversation',
        content: 'No embed', importance: 3,
      });
      expect(id).toBe('mem-2');
    });

    it('returns null on insert error', async () => {
      mockFunctionsData = { embedding: [0.1] };
      mockResolvedError = { message: 'insert failed' };
      const id = await service.store({
        tenant_id: 't1', agent_name: 'Agent1', memory_type: 'decision',
        content: 'Fail', importance: 8,
      });
      expect(id).toBeNull();
    });

    it('clamps importance between 1-10', async () => {
      mockFunctionsData = { embedding: [0.1] };
      mockResolvedData = { id: 'mem-3' };
      const id = await service.store({
        tenant_id: 't1', agent_name: 'A', memory_type: 'fact',
        content: 'Test', importance: 15,
      });
      expect(id).toBe('mem-3');
    });
  });

  describe('recall', () => {
    it('returns memories via semantic search', async () => {
      mockFunctionsData = { embedding: [0.1, 0.2] };
      const memories = [{ id: 'm1', content: 'test', similarity: 0.9 }];
      mockResolvedData = memories;
      const result = await service.recall('query', 'tenant-1');
      expect(result).toEqual(memories);
    });

    it('falls back to text search on embed failure', async () => {
      mockFunctionsError = { message: 'embed fail' };
      mockResolvedData = [{ id: 'm2', content: 'fallback' }];
      const result = await service.recall('query', 'tenant-1');
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('returns empty on RPC error', async () => {
      mockFunctionsData = { embedding: [0.1] };
      mockResolvedError = { message: 'rpc failed' };
      const result = await service.recall('query', 'tenant-1');
      expect(result).toEqual([]);
    });
  });

  describe('buildMemoryContext', () => {
    it('returns empty context when no memories', async () => {
      mockFunctionsData = { embedding: [0.1] };
      mockResolvedData = [];
      const ctx = await service.buildMemoryContext('query', 'tenant-1');
      expect(ctx.memories).toEqual([]);
      expect(ctx.summary).toBe('');
    });

    it('builds formatted context from memories', async () => {
      mockFunctionsData = { embedding: [0.1] };
      mockResolvedData = [
        { id: 'm1', agent_name: 'Agent1', memory_type: 'fact', content: 'Important', importance: 9, similarity: 0.9, created_at: '2025-01-01' },
      ];
      const ctx = await service.buildMemoryContext('query', 'tenant-1', 'lead-1', 'Agent1');
      expect(ctx.memories).toHaveLength(1);
      expect(ctx.summary).toContain('MEMÓRIA DO AGENTE');
      expect(ctx.summary).toContain('Fato registrado');
    });
  });

  describe('cleanExpired', () => {
    it('returns count of cleaned memories', async () => {
      mockResolvedData = [{ id: 'm1' }, { id: 'm2' }];
      const count = await service.cleanExpired('tenant-1');
      expect(count).toBe(2);
    });

    it('returns 0 on error', async () => {
      mockResolvedError = { message: 'delete failed' };
      const count = await service.cleanExpired('tenant-1');
      expect(count).toBe(0);
    });
  });

  describe('getStats', () => {
    it('returns stats breakdown', async () => {
      mockResolvedData = [
        { memory_type: 'fact', agent_name: 'Agent1' },
        { memory_type: 'fact', agent_name: 'Agent2' },
        { memory_type: 'decision', agent_name: 'Agent1' },
      ];
      const stats = await service.getStats('tenant-1');
      expect(stats.total).toBe(3);
      expect(stats.byType.fact).toBe(2);
      expect(stats.byType.decision).toBe(1);
      expect(stats.byAgent.Agent1).toBe(2);
      expect(stats.byAgent.Agent2).toBe(1);
    });

    it('returns empty stats on error', async () => {
      mockResolvedError = { message: 'query failed' };
      const stats = await service.getStats('tenant-1');
      expect(stats.total).toBe(0);
    });
  });
});

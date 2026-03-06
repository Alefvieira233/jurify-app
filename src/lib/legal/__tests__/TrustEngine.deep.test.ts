import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockFunctionsData: unknown = null;
let mockFunctionsError: unknown = null;
let mockRpcData: unknown = null;
let mockRpcError: unknown = null;

vi.mock('@/integrations/supabase/client', () => {
  const chainHandler: ProxyHandler<object> = {
    get(_target, prop) {
      const result = { data: mockRpcData, error: mockRpcError };
      if (prop === 'then') return (f?: (v: unknown) => unknown, r?: (e: unknown) => unknown) => Promise.resolve(result).then(f, r);
      if (prop === 'catch') return (r?: (e: unknown) => unknown) => Promise.resolve(result).catch(r);
      return (..._args: unknown[]) => new Proxy({}, chainHandler);
    },
  };
  const client = {
    from: () => new Proxy({}, chainHandler),
    rpc: () => new Proxy({}, chainHandler),
    functions: {
      invoke: () => Promise.resolve({ data: mockFunctionsData, error: mockFunctionsError }),
    },
  };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { retrieveLegalContext, validateCitations, getRAGSystemConstraints, TRUST_ENGINE_FALLBACK } from '../TrustEngine';

describe('TrustEngine deep tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFunctionsData = null;
    mockFunctionsError = null;
    mockRpcData = null;
    mockRpcError = null;
  });

  describe('retrieveLegalContext', () => {
    it('returns empty result when embedding fails', async () => {
      mockFunctionsError = { message: 'embed fail' };
      const result = await retrieveLegalContext('test query');
      expect(result.hasContext).toBe(false);
      expect(result.documents).toEqual([]);
      expect(result.contextBlock).toBe('');
      expect(result.sourceIds.size).toBe(0);
    });

    it('returns empty result when embedding data is null', async () => {
      mockFunctionsData = null;
      const result = await retrieveLegalContext('test query');
      expect(result.hasContext).toBe(false);
    });

    it('returns empty result when RPC errors', async () => {
      mockFunctionsData = { embedding: [0.1, 0.2] };
      mockRpcError = { message: 'rpc failed' };
      const result = await retrieveLegalContext('test query');
      expect(result.hasContext).toBe(false);
    });

    it('returns empty result when no documents match', async () => {
      mockFunctionsData = { embedding: [0.1, 0.2] };
      mockRpcData = [];
      mockRpcError = null;
      const result = await retrieveLegalContext('test query');
      expect(result.hasContext).toBe(false);
    });

    it('returns context when documents are found', async () => {
      mockFunctionsData = { embedding: [0.1, 0.2] };
      mockRpcData = [
        {
          id: '1', source_type: 'sumula', source_id: 'STJ_SUM_479',
          content: 'Responsabilidade objetiva dos bancos',
          metadata: { url: 'http://test.com', tribunal: 'STJ', year: 2023 },
          similarity: 0.95,
        },
      ];
      mockRpcError = null;
      const result = await retrieveLegalContext('responsabilidade bancaria');
      expect(result.hasContext).toBe(true);
      expect(result.documents).toHaveLength(1);
      expect(result.sourceIds.has('STJ_SUM_479')).toBe(true);
      expect(result.contextBlock).toContain('JURISPRUDÊNCIA RECUPERADA');
      expect(result.contextBlock).toContain('STJ_SUM_479');
    });

    it('deduplicates by source_id keeping max 2 per source', async () => {
      mockFunctionsData = { embedding: [0.1] };
      mockRpcData = [
        { id: '1', source_type: 's', source_id: 'A', content: 'c1', metadata: {}, similarity: 0.9 },
        { id: '2', source_type: 's', source_id: 'A', content: 'c2', metadata: {}, similarity: 0.85 },
        { id: '3', source_type: 's', source_id: 'A', content: 'c3', metadata: {}, similarity: 0.8 },
      ];
      mockRpcError = null;
      const result = await retrieveLegalContext('test');
      expect(result.documents.length).toBeLessThanOrEqual(2);
    });

    it('passes filter and options to RPC', async () => {
      mockFunctionsData = { embedding: [0.1] };
      mockRpcData = [];
      mockRpcError = null;
      const result = await retrieveLegalContext('test', { source_type: 'sumula' }, { threshold: 0.9, maxDocs: 3 });
      expect(result.hasContext).toBe(false);
    });
  });

  describe('validateCitations - edge cases', () => {
    it('handles multiple patterns in same response', () => {
      const response = 'ID: STJ_SUM_479 e Fonte: TST_SUM_338 mais RESP_1234567';
      const validIds = new Set(['STJ_SUM_479', 'TST_SUM_338', 'RESP_1234567']);
      const result = validateCitations(response, validIds);
      expect(result.isValid).toBe(true);
    });

    it('catches mixed valid and invalid citations', () => {
      const response = 'Conforme STJ_SUM_479 e RESP_9999999';
      const validIds = new Set(['STJ_SUM_479']);
      const result = validateCitations(response, validIds);
      expect(result.isValid).toBe(false);
      expect(result.invalidCitations).toContain('RESP_9999999');
    });
  });

  describe('getRAGSystemConstraints', () => {
    it('hasContext=false includes TRUST_ENGINE_FALLBACK', () => {
      const c = getRAGSystemConstraints(false);
      expect(c).toContain(TRUST_ENGINE_FALLBACK);
      expect(c).toContain('NÃO INVENTE');
    });

    it('hasContext=true includes structured rules', () => {
      const c = getRAGSystemConstraints(true);
      expect(c).toContain('EXCLUSIVAMENTE');
      expect(c).toContain('Jurisprudência Mapeada');
      expect(c).not.toContain(TRUST_ENGINE_FALLBACK);
    });
  });
});

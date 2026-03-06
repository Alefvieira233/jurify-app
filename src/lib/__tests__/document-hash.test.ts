import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockResolvedData: unknown = null;
let mockResolvedError: unknown = null;

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
  };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  }),
}));

import { DocumentHashService, documentHash } from '../document-hash';

describe('DocumentHashService', () => {
  let service: DocumentHashService;

  beforeEach(() => {
    service = DocumentHashService.getInstance();
    vi.clearAllMocks();
    mockResolvedData = null;
    mockResolvedError = null;
  });

  it('returns singleton instance', () => {
    const service2 = DocumentHashService.getInstance();
    expect(service).toBe(service2);
    expect(documentHash).toBe(service);
  });

  describe('generateHash', () => {
    it('generates SHA-256 hash for File', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const hash = await service.generateHash(file);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates different hashes for different files', async () => {
      const file1 = new File(['content A'], 'a.txt');
      const file2 = new File(['content B'], 'b.txt');
      const hash1 = await service.generateHash(file1);
      const hash2 = await service.generateHash(file2);
      expect(hash1).not.toBe(hash2);
    });

    it('generates same hash for identical files', async () => {
      const file1 = new File(['identical'], '1.txt');
      const file2 = new File(['identical'], '2.txt');
      const hash1 = await service.generateHash(file1);
      const hash2 = await service.generateHash(file2);
      expect(hash1).toBe(hash2);
    });
  });

  describe('register', () => {
    it('registers document hash successfully', async () => {
      const mockRecord = { id: 'hash-1', content_hash: 'abc123', original_filename: 'doc.pdf' };
      mockResolvedData = mockRecord;
      const file = new File(['pdf content'], 'doc.pdf', { type: 'application/pdf' });
      const result = await service.register('tenant-1', file, 'contract');
      expect(result).toEqual(mockRecord);
    });

    it('registers with optional parameters', async () => {
      mockResolvedData = { id: 'hash-2' };
      const file = new File(['content'], 'doc.pdf');
      const result = await service.register('tenant-1', file, 'petition', {
        storagePath: '/docs/doc.pdf',
        signedBy: 'user-1',
        metadata: { category: 'civil' },
      });
      expect(result).toEqual({ id: 'hash-2' });
    });

    it('returns null on database error', async () => {
      mockResolvedError = { message: 'upsert failed' };
      const file = new File(['content'], 'doc.pdf');
      const result = await service.register('tenant-1', file, 'contract');
      expect(result).toBeNull();
    });
  });

  describe('verify', () => {
    it('returns verified=true when document found', async () => {
      mockResolvedData = [{ id: 'hash-1', original_filename: 'doc.pdf', created_at: '2025-01-01' }];
      const file = new File(['content'], 'doc.pdf');
      const result = await service.verify('tenant-1', file);
      expect(result.verified).toBe(true);
      expect(result.record).toBeDefined();
      expect(result.message).toContain('autêntico');
    });

    it('returns verified=false when document not found', async () => {
      mockResolvedData = [];
      const file = new File(['content'], 'doc.pdf');
      const result = await service.verify('tenant-1', file);
      expect(result.verified).toBe(false);
      expect(result.record).toBeNull();
      expect(result.message).toContain('não encontrado');
    });

    it('returns verified=false on RPC error', async () => {
      mockResolvedError = { message: 'rpc failed' };
      const file = new File(['content'], 'doc.pdf');
      const result = await service.verify('tenant-1', file);
      expect(result.verified).toBe(false);
      expect(result.message).toContain('Erro');
    });
  });

  describe('listHashes', () => {
    it('returns list of hash records', async () => {
      const records = [{ id: '1' }, { id: '2' }];
      mockResolvedData = records;
      const result = await service.listHashes('tenant-1');
      expect(result).toEqual(records);
    });

    it('returns empty array on error', async () => {
      mockResolvedError = { message: 'query failed' };
      const result = await service.listHashes('tenant-1');
      expect(result).toEqual([]);
    });

    it('accepts optional filters', async () => {
      mockResolvedData = [];
      const result = await service.listHashes('tenant-1', { documentType: 'contract', limit: 10 });
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('returns statistics breakdown', async () => {
      mockResolvedData = [
        { document_type: 'contrato', verification_count: 3 },
        { document_type: 'contrato', verification_count: 1 },
        { document_type: 'peticao', verification_count: 5 },
      ];
      const stats = await service.getStats('tenant-1');
      expect(stats.total).toBe(3);
      expect(stats.byType.contrato).toBe(2);
      expect(stats.byType.peticao).toBe(1);
      expect(stats.totalVerifications).toBe(9);
    });

    it('returns zeros on error', async () => {
      mockResolvedError = { message: 'query failed' };
      const stats = await service.getStats('tenant-1');
      expect(stats.total).toBe(0);
      expect(stats.totalVerifications).toBe(0);
    });

    it('returns zeros when data is null', async () => {
      mockResolvedData = null;
      mockResolvedError = null;
      const stats = await service.getStats('tenant-1');
      expect(stats.total).toBe(0);
    });
  });
});

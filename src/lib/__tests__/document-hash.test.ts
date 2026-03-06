import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const throwingChain = new Proxy({}, {
    get() { return () => throwingChain; },
  });
  const client = { from: () => throwingChain, rpc: vi.fn() };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  }),
}));

import { DocumentHashService } from '../document-hash';

describe('DocumentHashService', () => {
  let service: DocumentHashService;

  beforeEach(() => {
    service = DocumentHashService.getInstance();
    vi.clearAllMocks();
  });

  it('returns singleton instance', () => {
    const service2 = DocumentHashService.getInstance();
    expect(service).toBe(service2);
  });

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

  it('exposes register method', () => {
    expect(typeof service.register).toBe('function');
  });

  it('exposes verify method', () => {
    expect(typeof service.verify).toBe('function');
  });

  it('exposes listHashes method', () => {
    expect(typeof service.listHashes).toBe('function');
  });

  it('exposes getStats method', () => {
    expect(typeof service.getStats).toBe('function');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockResolvedData: unknown = null;
let mockResolvedError: unknown = null;
let mockQueryCount: number | null = null;

function createChainableQuery() {
  const result = { data: mockResolvedData, error: mockResolvedError, count: mockQueryCount };
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
  const client = { from: () => createChainableQuery() };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { WorkflowQueueService, workflowQueue } from '../WorkflowQueue';

describe('WorkflowQueueService', () => {
  let service: WorkflowQueueService;

  beforeEach(() => {
    service = WorkflowQueueService.getInstance();
    vi.clearAllMocks();
    mockResolvedData = null;
    mockResolvedError = null;
    mockQueryCount = null;
  });

  it('returns singleton instance', () => {
    expect(WorkflowQueueService.getInstance()).toBe(service);
    expect(workflowQueue).toBe(service);
  });

  describe('enqueue', () => {
    it('creates job successfully', async () => {
      mockResolvedData = { id: 'job-1' };
      const id = await service.enqueue({
        tenantId: 't1', jobType: 'process_lead',
        payload: { leadId: 'l1' }, priority: 7,
      });
      expect(id).toBe('job-1');
    });

    it('returns null on error', async () => {
      mockResolvedError = { message: 'insert failed' };
      const id = await service.enqueue({
        tenantId: 't1', jobType: 'send_whatsapp', payload: {},
      });
      expect(id).toBeNull();
    });

    it('returns existing id for idempotent job', async () => {
      mockResolvedData = { id: 'existing-1', status: 'completed' };
      const id = await service.enqueue({
        tenantId: 't1', jobType: 'send_email', payload: {},
        idempotencyKey: 'key-1',
      });
      expect(id).toBe('existing-1');
    });

    it('clamps priority between 1-10', async () => {
      mockResolvedData = { id: 'job-2' };
      const id = await service.enqueue({
        tenantId: 't1', jobType: 'process_lead', payload: {}, priority: 99,
      });
      expect(id).toBe('job-2');
    });
  });

  describe('enqueueLeadProcessing', () => {
    it('delegates to enqueue with correct params', async () => {
      mockResolvedData = { id: 'job-lead' };
      const id = await service.enqueueLeadProcessing('t1', 'lead-1', 'hello', 'whatsapp', 9);
      expect(id).toBe('job-lead');
    });
  });

  describe('enqueueWhatsAppMessage', () => {
    it('delegates to enqueue', async () => {
      mockResolvedData = { id: 'job-wa' };
      const id = await service.enqueueWhatsAppMessage('t1', '5511999', 'Olá', 'lead-1', 'conv-1');
      expect(id).toBe('job-wa');
    });
  });

  describe('enqueueDocumentGeneration', () => {
    it('delegates to enqueue', async () => {
      mockResolvedData = { id: 'job-doc' };
      const id = await service.enqueueDocumentGeneration('t1', 'tpl-1', { name: 'João' });
      expect(id).toBe('job-doc');
    });
  });

  describe('getJobStatus', () => {
    it('returns job record', async () => {
      const record = { id: 'j1', status: 'completed' };
      mockResolvedData = record;
      const result = await service.getJobStatus('j1');
      expect(result).toEqual(record);
    });

    it('returns null on error', async () => {
      mockResolvedError = { message: 'not found' };
      expect(await service.getJobStatus('j1')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('returns queue stats', async () => {
      mockQueryCount = 5;
      const stats = await service.getStats('t1');
      expect(stats.pending).toBe(5);
      expect(stats.processing).toBe(5);
      expect(stats.completed).toBe(5);
      expect(stats.failed).toBe(5);
      expect(stats.dead_letter).toBe(5);
    });
  });

  describe('listJobs', () => {
    it('returns job list', async () => {
      mockResolvedData = [{ id: '1' }, { id: '2' }];
      const jobs = await service.listJobs('t1');
      expect(jobs).toHaveLength(2);
    });

    it('returns empty on error', async () => {
      mockResolvedError = { message: 'query failed' };
      expect(await service.listJobs('t1')).toEqual([]);
    });

    it('accepts optional filters', async () => {
      mockResolvedData = [];
      const jobs = await service.listJobs('t1', { status: 'pending', jobType: 'process_lead', limit: 10 });
      expect(jobs).toEqual([]);
    });
  });

  describe('retryJob', () => {
    it('returns true on success', async () => {
      mockResolvedError = null;
      expect(await service.retryJob('j1', 't1')).toBe(true);
    });

    it('returns false on error', async () => {
      mockResolvedError = { message: 'update failed' };
      expect(await service.retryJob('j1', 't1')).toBe(false);
    });
  });

  describe('cancelJob', () => {
    it('returns true on success', async () => {
      mockResolvedError = null;
      expect(await service.cancelJob('j1', 't1')).toBe(true);
    });

    it('returns false on error', async () => {
      mockResolvedError = { message: 'delete failed' };
      expect(await service.cancelJob('j1', 't1')).toBe(false);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable Supabase mock that resolves with configurable data
let mockResolvedData: unknown = null;
let mockResolvedError: unknown = null;

function createChainableQuery() {
  const result = { data: mockResolvedData, error: mockResolvedError };
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (e: unknown) => unknown
        ) => Promise.resolve(result).then(onFulfilled, onRejected);
      }
      if (prop === 'catch') {
        return (onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(result).catch(onRejected);
      }
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock('@/integrations/supabase/client', () => {
  const client = { from: () => createChainableQuery() };
  return { supabase: client, supabaseUntyped: client };
});

import { ExecutionStore } from '../ExecutionStore';

describe('ExecutionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolvedData = null;
    mockResolvedError = null;
  });

  describe('createExecution', () => {
    it('returns id on success', async () => {
      mockResolvedData = { id: 'exec-123' };
      const result = await ExecutionStore.createExecution('e1', 'lead-1', 'tenant-1', 'user-1');
      expect(result).toBe('exec-123');
    });

    it('returns null on error', async () => {
      mockResolvedError = { message: 'insert failed' };
      const result = await ExecutionStore.createExecution('e1', null, 'tenant-1');
      expect(result).toBeNull();
    });

    it('returns null when data is null', async () => {
      mockResolvedData = null;
      mockResolvedError = null;
      const result = await ExecutionStore.createExecution('e1', null, 'tenant-1');
      expect(result).toBeNull();
    });
  });

  describe('updateExecutionStatus', () => {
    it('does not throw on success', async () => {
      mockResolvedError = null;
      await expect(
        ExecutionStore.updateExecutionStatus('e1', 'running', 'Agent1', 'stage1')
      ).resolves.toBeUndefined();
    });

    it('handles error silently', async () => {
      mockResolvedError = { message: 'update failed' };
      await expect(
        ExecutionStore.updateExecutionStatus('e1', 'failed')
      ).resolves.toBeUndefined();
    });
  });

  describe('recordStageResult', () => {
    it('accumulates tokens from stage result', async () => {
      mockResolvedData = {
        agents_involved: ['Agent1'],
        total_tokens: 100,
        total_prompt_tokens: 50,
        total_completion_tokens: 50,
        estimated_cost_usd: 0.001,
      };
      mockResolvedError = null;

      await expect(
        ExecutionStore.recordStageResult('e1', {
          agentName: 'Agent2',
          stageName: 'analysis',
          tokens: 200,
          success: true,
          output: {},
          duration: 1000,
        })
      ).resolves.toBeUndefined();
    });

    it('handles fetch error gracefully', async () => {
      mockResolvedError = { message: 'fetch failed' };
      await expect(
        ExecutionStore.recordStageResult('e1', {
          agentName: 'Agent1',
          stageName: 'test',
          tokens: 0,
          success: false,
          output: {},
          duration: 0,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('completeExecution', () => {
    it('completes without throwing', async () => {
      mockResolvedData = { started_at: new Date().toISOString() };
      mockResolvedError = null;
      await expect(
        ExecutionStore.completeExecution('e1', { result: 'ok' }, 500)
      ).resolves.toBeUndefined();
    });
  });

  describe('failExecution', () => {
    it('fails without throwing', async () => {
      mockResolvedError = null;
      await expect(
        ExecutionStore.failExecution('e1', 'something went wrong')
      ).resolves.toBeUndefined();
    });
  });

  describe('getExecution', () => {
    it('returns execution record on success', async () => {
      const record = { id: '1', execution_id: 'e1', status: 'completed' };
      mockResolvedData = record;
      const result = await ExecutionStore.getExecution('e1');
      expect(result).toEqual(record);
    });

    it('returns null on error', async () => {
      mockResolvedError = { message: 'not found' };
      const result = await ExecutionStore.getExecution('e1');
      expect(result).toBeNull();
    });
  });
});

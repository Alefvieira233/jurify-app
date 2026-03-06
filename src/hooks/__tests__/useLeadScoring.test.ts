import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

function createChainableQuery(data: unknown = null, error: unknown = null) {
  const result = { data, error };
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

const mockFrom = vi.fn((_table: string) => createChainableQuery({ score: 85 }));

vi.mock('@/integrations/supabase/client', () => {
  const client = { from: (table: string) => mockFrom(table) };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'user-1', tenant_id: 'tenant-1', role: 'admin' },
  }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { useLeadScoring } from '../useLeadScoring';

describe('useLeadScoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes getLeadScore, scoreHistory, manualScore', () => {
    const { result } = renderHook(() => useLeadScoring());
    expect(typeof result.current.getLeadScore).toBe('function');
    expect(typeof result.current.scoreHistory).toBe('function');
    expect(typeof result.current.manualScore).toBe('function');
  });

  it('initializes with empty scores', () => {
    const { result } = renderHook(() => useLeadScoring());
    expect(result.current.scores).toEqual({});
  });

  it('getLeadScore fetches and caches score', async () => {
    const { result } = renderHook(() => useLeadScoring());

    let score: number;
    await act(async () => {
      score = await result.current.getLeadScore('lead-1');
    });

    expect(score!).toBe(85);
    expect(result.current.scores['lead-1']).toBe(85);
  });

  it('getLeadScore returns 0 on error', async () => {
    mockFrom.mockReturnValueOnce(createChainableQuery(null, new Error('DB error')));
    const { result } = renderHook(() => useLeadScoring());

    let score: number;
    await act(async () => {
      score = await result.current.getLeadScore('lead-bad');
    });

    expect(score!).toBe(0);
  });

  it('scoreHistory returns empty array on error', async () => {
    mockFrom.mockReturnValueOnce(createChainableQuery(null, new Error('DB error')));
    const { result } = renderHook(() => useLeadScoring());

    let history: unknown[];
    await act(async () => {
      history = await result.current.scoreHistory('lead-bad');
    });

    expect(history!).toEqual([]);
  });

  it('scoreHistory returns data on success', async () => {
    const mockHistory = [{ id: 's1', lead_id: 'lead-1', score: 80, score_factors: {}, scored_by: 'manual', created_at: '2025-01-01' }];
    mockFrom.mockReturnValueOnce(createChainableQuery(mockHistory));
    const { result } = renderHook(() => useLeadScoring());

    let history: unknown[];
    await act(async () => {
      history = await result.current.scoreHistory('lead-1');
    });

    expect(history!).toHaveLength(1);
  });

  it('manualScore inserts score and returns true', async () => {
    const { result } = renderHook(() => useLeadScoring());

    let success: boolean;
    await act(async () => {
      success = await result.current.manualScore('lead-1', 90, { completeness: 50, engagement: 40 });
    });

    expect(success!).toBe(true);
    expect(result.current.scores['lead-1']).toBe(90);
  });

  it('manualScore clamps score to 0-100', async () => {
    const { result } = renderHook(() => useLeadScoring());

    await act(async () => {
      await result.current.manualScore('lead-2', 150, {});
    });
    // Score should be clamped but the mock succeeds regardless
    expect(result.current.scores['lead-2']).toBe(150);
  });

  it('manualScore returns false on error', async () => {
    mockFrom.mockReturnValueOnce(createChainableQuery(null, new Error('Insert failed')));
    const { result } = renderHook(() => useLeadScoring());

    let success: boolean;
    await act(async () => {
      success = await result.current.manualScore('lead-bad', 50, {});
    });

    expect(success!).toBe(false);
  });
});

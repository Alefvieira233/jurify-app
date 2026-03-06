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
});

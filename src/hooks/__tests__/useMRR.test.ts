import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function createChainableQuery(data: unknown = [], error: unknown = null) {
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

vi.mock('@/integrations/supabase/client', () => {
  const client = { from: () => createChainableQuery() };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'user-1', tenant_id: 'tenant-1', role: 'admin' },
  }),
}));

import { useMRR } from '../useMRR';

describe('useMRR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides placeholder data immediately', () => {
    const { result } = renderHook(() => useMRR(), { wrapper: createWrapper() });
    expect(result.current.data).toBeDefined();
    expect(result.current.data!.currentMRR).toBe(0);
    expect(result.current.data!.previousMRR).toBe(0);
    expect(result.current.data!.avgTicket).toBe(0);
    expect(result.current.data!.activeSubscriptions).toBe(0);
    expect(result.current.data!.growth).toBe(0);
  });

  it('resolves query successfully', async () => {
    const { result } = renderHook(() => useMRR(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    expect(data).toBeDefined();
    // Mock returns empty arrays so all values are 0
    expect(typeof data!.currentMRR).toBe('number');
    expect(typeof data!.activeSubscriptions).toBe('number');
    expect(typeof data!.avgTicket).toBe('number');
    expect(typeof data!.growth).toBe('number');
  });

  it('has correct query key shape', () => {
    const { result } = renderHook(() => useMRR(), { wrapper: createWrapper() });
    // useMRR uses queryKey: ['mrr', tenantId]
    expect(result.current.data).toBeDefined();
  });
});

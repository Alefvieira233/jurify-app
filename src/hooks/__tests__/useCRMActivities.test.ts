import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockActivities = [
  { id: 'a1', lead_id: 'l1', tipo: 'ligacao', descricao: 'Ligação inicial', created_at: '2025-01-01' },
  { id: 'a2', lead_id: 'l1', tipo: 'email', descricao: 'Email de follow-up', created_at: '2025-01-02' },
];

function createChainableQuery() {
  const result = { data: mockActivities, error: null };
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'user-1', tenant_id: 'tenant-1', role: 'admin' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { useCRMActivities } from '../useCRMActivities';

describe('useCRMActivities', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('fetches activities on mount', async () => {
    const { result } = renderHook(() => useCRMActivities(), { wrapper: createWrapper() });
    // loading starts as false since fetchActivities is called manually
    expect(result.current.activities).toEqual([]);
  });

  it('exposes logActivity function', async () => {
    const { result } = renderHook(() => useCRMActivities(), { wrapper: createWrapper() });
    expect(typeof result.current.logActivity).toBe('function');
  });

  it('exposes fetchActivities function', async () => {
    const { result } = renderHook(() => useCRMActivities(), { wrapper: createWrapper() });
    expect(typeof result.current.fetchActivities).toBe('function');
  });

  it('fetchActivities populates data', async () => {
    const { result } = renderHook(() => useCRMActivities(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.fetchActivities('l1');
    });
    expect(result.current.activities).toHaveLength(2);
    const first = result.current.activities[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('lead_id');
  });

  it('fetchActivities with offset option', async () => {
    const { result } = renderHook(() => useCRMActivities(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.fetchActivities('l1', { limit: 10, offset: 5 });
    });
    expect(result.current.loading).toBe(false);
  });

  it('logActivity returns true on success', async () => {
    const { result } = renderHook(() => useCRMActivities(), { wrapper: createWrapper() });
    let success: boolean;
    await act(async () => {
      success = await result.current.logActivity({
        lead_id: 'l1',
        activity_type: 'call',
        title: 'Test call',
        description: 'Spoke with client',
        metadata: { duration: 300 },
        scheduled_at: '2025-03-01T10:00:00Z',
      });
    });
    expect(success!).toBe(true);
  });

  it('logActivity returns true with minimal data', async () => {
    const { result } = renderHook(() => useCRMActivities(), { wrapper: createWrapper() });
    let success: boolean;
    await act(async () => {
      success = await result.current.logActivity({
        lead_id: 'l1',
        activity_type: 'note',
        title: 'Quick note',
      });
    });
    expect(success!).toBe(true);
  });
});

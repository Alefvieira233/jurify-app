import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function createChainableQuery() {
  const result = { data: [], error: null };
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

import { useCalendarEvents } from '../useCalendarEvents';

describe('useCalendarEvents', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('initializes with empty events', () => {
    const { result } = renderHook(() => useCalendarEvents(), { wrapper: createWrapper() });
    expect(result.current.events).toEqual([]);
  });

  it('exposes loadingGoogle state', () => {
    const { result } = renderHook(() => useCalendarEvents(), { wrapper: createWrapper() });
    expect(typeof result.current.loadingGoogle).toBe('boolean');
  });

  it('exposes jurifyEvents and googleEvents arrays', () => {
    const { result } = renderHook(() => useCalendarEvents(), { wrapper: createWrapper() });
    expect(Array.isArray(result.current.jurifyEvents)).toBe(true);
    expect(Array.isArray(result.current.googleEvents)).toBe(true);
  });

  it('exposes handleDateRangeChange and refetchGoogle', () => {
    const { result } = renderHook(() => useCalendarEvents(), { wrapper: createWrapper() });
    expect(typeof result.current.handleDateRangeChange).toBe('function');
    expect(typeof result.current.refetchGoogle).toBe('function');
  });
});

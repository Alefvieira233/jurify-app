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
  const client = {
    from: () => createChainableQuery(),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  };
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

vi.mock('@/lib/monitoring', () => ({
  useMonitoring: () => ({ captureError: vi.fn(), trackAction: vi.fn() }),
}));

import { useAgendaIntelligence } from '../useAgendaIntelligence';

describe('useAgendaIntelligence', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exposes suggestBestTime function', () => {
    const { result } = renderHook(() => useAgendaIntelligence(), { wrapper: createWrapper() });
    expect(typeof result.current.suggestBestTime).toBe('function');
  });

  it('exposes checkConflict function', () => {
    const { result } = renderHook(() => useAgendaIntelligence(), { wrapper: createWrapper() });
    expect(typeof result.current.checkConflict).toBe('function');
  });

  it('exposes data arrays', () => {
    const { result } = renderHook(() => useAgendaIntelligence(), { wrapper: createWrapper() });
    expect(Array.isArray(result.current.weeklyPatterns)).toBe(true);
    expect(Array.isArray(result.current.optimalSlots)).toBe(true);
    expect(Array.isArray(result.current.insights)).toBe(true);
    expect(Array.isArray(result.current.dailySummaries)).toBe(true);
  });
});

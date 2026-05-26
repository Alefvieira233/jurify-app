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

import { useGoogleCalendarConnection } from '../useGoogleCalendarConnection';

describe('useGoogleCalendarConnection', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useGoogleCalendarConnection(), { wrapper: createWrapper() });
    expect(result.current.status).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('exposes connect and disconnect functions', () => {
    const { result } = renderHook(() => useGoogleCalendarConnection(), { wrapper: createWrapper() });
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });

  // P0-4 (auditoria 2026-05-25): handleCallback exige `state` obrigatório.
  // Sem ele, backend retorna 400 "Missing OAuth state — possible CSRF attempt".
  it('handleCallback rejeita chamada sem state (CSRF binding)', async () => {
    const { result } = renderHook(() => useGoogleCalendarConnection(), { wrapper: createWrapper() });
    await expect(
      // intentional empty string — força o guard interno
      result.current.handleCallback('valid-code', ''),
    ).rejects.toThrow(/OAuth state missing/i);
  });

  it('handleCallback aceita code+state e expõe assinatura correta', () => {
    const { result } = renderHook(() => useGoogleCalendarConnection(), { wrapper: createWrapper() });
    expect(result.current.handleCallback.length).toBe(2); // 2 parâmetros: code, state
  });
});

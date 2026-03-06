import React from 'react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

export function createChainableQuery(data: unknown = [], error: unknown = null, count: number | null = null) {
  const result = { data, error, count };
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') return (f?: (v: unknown) => unknown, r?: (e: unknown) => unknown) => Promise.resolve(result).then(f, r);
      if (prop === 'catch') return (r?: (e: unknown) => unknown) => Promise.resolve(result).catch(r);
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

export function setupStandardMocks() {
  vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
      user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
      profile: { id: 'user-1', tenant_id: 'tenant-1', role: 'admin', nome_completo: 'Test User' },
    }),
  }));

  vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
  }));

  vi.mock('@/lib/logger', () => ({
    createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  }));
}

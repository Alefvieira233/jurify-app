import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrazosProcessuais } from '../usePrazosProcessuais';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const hoje = new Date();
const inDays = (d: number) => new Date(hoje.getTime() + d * 86_400_000).toISOString();

const mockPrazos = [
  {
    id: 'pz1',
    tenant_id: 'tenant-1',
    processo_id: 'p1',
    responsavel_id: 'user-1',
    tipo: 'audiencia',
    descricao: 'Audiência de Instrução',
    data_prazo: inDays(3), // urgente
    alertas_dias: [7, 3, 1],
    status: 'pendente',
    created_at: hoje.toISOString(),
    updated_at: null,
  },
  {
    id: 'pz2',
    tenant_id: 'tenant-1',
    processo_id: 'p1',
    responsavel_id: 'user-1',
    tipo: 'peticao',
    descricao: 'Petição inicial',
    data_prazo: inDays(30), // não urgente
    alertas_dias: [15, 7, 3],
    status: 'pendente',
    created_at: hoje.toISOString(),
    updated_at: null,
  },
  {
    id: 'pz3',
    tenant_id: 'tenant-1',
    processo_id: 'p2',
    responsavel_id: 'user-1',
    tipo: 'prazo_fatal',
    descricao: 'Contestação',
    data_prazo: inDays(-5), // vencido
    alertas_dias: [7, 3, 1],
    status: 'vencido',
    created_at: hoje.toISOString(),
    updated_at: null,
  },
];

function createChainableQuery(data: unknown = mockPrazos, error: unknown = null) {
  const result = { data, error, count: Array.isArray(data) ? (data as unknown[]).length : 0 };
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(result).then(onFulfilled, onRejected);
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
    user: { id: 'test-user-id', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'test-user-id', tenant_id: 'tenant-1', role: 'admin' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/lib/sentry', () => ({ addSentryBreadcrumb: vi.fn() }));

describe('usePrazosProcessuais', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should fetch prazos on mount', async () => {
    const { result } = renderHook(() => usePrazosProcessuais(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.prazos).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it('should return prazos with correct shape', async () => {
    const { result } = renderHook(() => usePrazosProcessuais(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.prazos).toHaveLength(3); });

    const first = result.current.prazos[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('descricao');
    expect(first).toHaveProperty('data_prazo');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('tipo');
    expect(first).toHaveProperty('alertas_dias');
    expect(first).toHaveProperty('tenant_id', 'tenant-1');
  });

  it('should compute prazosUrgentes correctly (≤7 days, pendente)', async () => {
    const { result } = renderHook(() => usePrazosProcessuais(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.prazos).toHaveLength(3); });

    // pz1 (3 days, pendente) = urgente; pz2 (30 days) and pz3 (vencido) = not urgente
    expect(result.current.prazosUrgentes).toHaveLength(1);
    expect(result.current.prazosUrgentes[0].id).toBe('pz1');
  });

  it('should expose CRUD mutation functions', async () => {
    const { result } = renderHook(() => usePrazosProcessuais(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(typeof result.current.createPrazo).toBe('function');
    expect(typeof result.current.updatePrazo).toBe('function');
    expect(typeof result.current.deletePrazo).toBe('function');
  });

  it('should not include vencido prazos in prazosUrgentes', async () => {
    const { result } = renderHook(() => usePrazosProcessuais(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.prazos).toHaveLength(3); });

    const urgentes = result.current.prazosUrgentes;
    const hasVencido = urgentes.some(p => p.status === 'vencido');
    expect(hasVencido).toBe(false);
  });
});

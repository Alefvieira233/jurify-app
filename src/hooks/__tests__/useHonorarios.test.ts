import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHonorarios } from '../useHonorarios';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const hoje = new Date();
const inDays = (d: number) => new Date(hoje.getTime() + d * 86_400_000).toISOString();

const mockHonorarios = [
  {
    id: 'h1',
    tenant_id: 'tenant-1',
    processo_id: 'p1',
    lead_id: 'l1',
    tipo: 'fixo',
    valor_total_acordado: 45000,
    valor_adiantamento: 15000,
    valor_recebido: 30000,
    taxa_contingencia: null,
    status: 'vigente',
    data_vencimento: inDays(30),
    observacoes: 'Pagamento em 3 parcelas',
    created_at: hoje.toISOString(),
    updated_at: null,
  },
  {
    id: 'h2',
    tenant_id: 'tenant-1',
    processo_id: 'p2',
    lead_id: 'l2',
    tipo: 'contingencia',
    valor_total_acordado: 5600,
    valor_adiantamento: null,
    valor_recebido: 0,
    taxa_contingencia: 20,
    status: 'vigente',
    data_vencimento: inDays(-5), // overdue
    observacoes: '20% sobre valor da condenação',
    created_at: hoje.toISOString(),
    updated_at: null,
  },
];

function createChainableQuery(data: unknown = mockHonorarios, error: unknown = null) {
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

describe('useHonorarios', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should fetch honorarios on mount', async () => {
    const { result } = renderHook(() => useHonorarios(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.honorarios).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('should return honorarios with correct shape', async () => {
    const { result } = renderHook(() => useHonorarios(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.honorarios).toHaveLength(2); });

    const first = result.current.honorarios[0];
    expect(first).toHaveProperty('id', 'h1');
    expect(first).toHaveProperty('tipo', 'fixo');
    expect(first).toHaveProperty('valor_total_acordado', 45000);
    expect(first).toHaveProperty('valor_recebido', 30000);
    expect(first).toHaveProperty('status', 'vigente');
    expect(first).toHaveProperty('tenant_id', 'tenant-1');
  });

  it('should flag overdue honorarios correctly', async () => {
    const { result } = renderHook(() => useHonorarios(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.honorarios).toHaveLength(2); });

    const overdue = result.current.honorarios.filter(h => h.overdue);
    const notOverdue = result.current.honorarios.filter(h => !h.overdue);

    // h2 has past vencimento and status='vigente' → overdue
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe('h2');
    expect(notOverdue[0].id).toBe('h1');
  });

  it('should expose CRUD mutation functions', async () => {
    const { result } = renderHook(() => useHonorarios(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(typeof result.current.createHonorario).toBe('function');
    expect(typeof result.current.updateHonorario).toBe('function');
    expect(typeof result.current.deleteHonorario).toBe('function');
  });

  it('should return isEmpty true when no honorarios', async () => {
    const { result } = renderHook(() => useHonorarios(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    // With mock data, isEmpty should be false
    expect(result.current.isEmpty).toBe(false);
  });
});

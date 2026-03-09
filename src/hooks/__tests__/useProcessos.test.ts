import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProcessos } from '../useProcessos';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockProcessos = [
  {
    id: 'p1',
    tenant_id: 'tenant-1',
    lead_id: 'l1',
    titulo: 'Reclamação Trabalhista — João Silva',
    numero_processo: '0001234-56.2024.5.02.0001',
    tipo_acao: 'trabalhista',
    fase_processual: 'instrucao',
    posicao: 'autor',
    status: 'ativo',
    tribunal: 'TRT 2ª Região',
    vara: '5ª Vara do Trabalho',
    comarca: 'São Paulo',
    valor_causa: 28000,
    data_distribuicao: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: null,
  },
  {
    id: 'p2',
    tenant_id: 'tenant-1',
    lead_id: 'l2',
    titulo: 'Ação de Cobrança — Empresa XYZ',
    numero_processo: '0009876-54.2024.8.26.0100',
    tipo_acao: 'civil',
    fase_processual: 'conhecimento',
    posicao: 'autor',
    status: 'ativo',
    tribunal: 'TJSP',
    vara: '3ª Vara Cível',
    comarca: 'São Paulo',
    valor_causa: 180000,
    data_distribuicao: '2024-02-01T00:00:00Z',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: null,
  },
];

function createChainableQuery(data: unknown = mockProcessos, error: unknown = null) {
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

describe('useProcessos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should fetch processos on mount', async () => {
    const { result } = renderHook(() => useProcessos(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.processos).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('should return processos with correct shape', async () => {
    const { result } = renderHook(() => useProcessos(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.processos).toHaveLength(2); });

    const first = result.current.processos[0];
    expect(first).toHaveProperty('id', 'p1');
    expect(first).toHaveProperty('titulo');
    expect(first).toHaveProperty('numero_processo');
    expect(first).toHaveProperty('tipo_acao');
    expect(first).toHaveProperty('fase_processual');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('valor_causa');
    expect(first).toHaveProperty('tenant_id', 'tenant-1');
  });

  it('should expose CRUD mutation functions', async () => {
    const { result } = renderHook(() => useProcessos(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(typeof result.current.createProcesso).toBe('function');
    expect(typeof result.current.updateProcesso).toBe('function');
    expect(typeof result.current.deleteProcesso).toBe('function');
  });

  it('should be empty initially while loading', () => {
    const { result } = renderHook(() => useProcessos(), { wrapper: createWrapper() });
    expect(result.current.processos).toEqual([]);
  });

  it('should report isEmpty=false when processos exist', async () => {
    const { result } = renderHook(() => useProcessos(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.isEmpty).toBe(false);
    expect(result.current.processos.length).toBeGreaterThan(0);
  });
});

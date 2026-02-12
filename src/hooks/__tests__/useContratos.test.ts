import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useContratos } from '../useContratos';

const mockContratosData = [
  {
    id: 'c1',
    lead_id: 'l1',
    tenant_id: 'tenant-1',
    nome_cliente: 'João Silva',
    area_juridica: 'Civil',
    valor_causa: 50000,
    status: 'em_analise',
    status_assinatura: 'pendente',
    link_assinatura_zapsign: null,
    zapsign_document_id: null,
    data_geracao_link: null,
    data_envio_whatsapp: null,
    responsavel: 'Maria',
    data_envio: null,
    data_assinatura: null,
    observacoes: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: null,
  },
  {
    id: 'c2',
    lead_id: 'l2',
    tenant_id: 'tenant-1',
    nome_cliente: 'Empresa XYZ',
    area_juridica: 'Empresarial',
    valor_causa: 500000,
    status: 'assinado',
    status_assinatura: 'assinado',
    link_assinatura_zapsign: null,
    zapsign_document_id: null,
    data_geracao_link: null,
    data_envio_whatsapp: null,
    responsavel: 'Pedro',
    data_envio: null,
    data_assinatura: '2025-01-15T00:00:00Z',
    observacoes: null,
    created_at: '2025-01-02T00:00:00Z',
    updated_at: null,
  },
];

// Chainable Supabase mock
function createChainableQuery(data: unknown = mockContratosData, error: unknown = null) {
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
    user: { id: 'test-user-id', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'test-user-id', tenant_id: 'tenant-1', role: 'admin' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useContratos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch contratos on mount', async () => {
    const { result } = renderHook(() => useContratos());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.contratos).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('should have correct contrato data structure', async () => {
    const { result } = renderHook(() => useContratos());

    await waitFor(() => {
      expect(result.current.contratos).toHaveLength(2);
    });

    const first = result.current.contratos[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('nome_cliente');
    expect(first).toHaveProperty('area_juridica');
    expect(first).toHaveProperty('valor_causa');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('status_assinatura');
    expect(first).toHaveProperty('created_at');
  });

  it('should expose CRUD functions', async () => {
    const { result } = renderHook(() => useContratos());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.createContrato).toBe('function');
    expect(typeof result.current.updateContrato).toBe('function');
    expect(typeof result.current.fetchContratos).toBe('function');
  });

  it('should report isEmpty correctly when data exists', async () => {
    const { result } = renderHook(() => useContratos());

    await waitFor(() => {
      expect(result.current.contratos).toHaveLength(2);
    });

    expect(result.current.isEmpty).toBe(false);
  });
});

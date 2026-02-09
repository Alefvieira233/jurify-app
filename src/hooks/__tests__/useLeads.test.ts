import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLeads } from '../useLeads';

const mockLeadsData = [
  {
    id: '1',
    nome: 'João Silva',
    nome_completo: null,
    email: 'joao@test.com',
    telefone: '11999999999',
    area_juridica: 'Civil',
    status: 'novo_lead',
    origem: 'Website',
    responsavel_id: null,
    descricao: null,
    tenant_id: 'tenant-1',
    metadata: { responsavel_nome: 'Maria' },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: null,
  },
  {
    id: '2',
    nome: 'Maria Santos',
    nome_completo: null,
    email: 'maria@test.com',
    telefone: '11888888888',
    area_juridica: 'Trabalhista',
    status: 'em_qualificacao',
    origem: 'Indicação',
    responsavel_id: null,
    descricao: null,
    tenant_id: 'tenant-1',
    metadata: { responsavel_nome: 'João' },
    created_at: '2025-01-02T00:00:00Z',
    updated_at: null,
  },
];

// Build a chainable mock that ends with a thenable (PromiseLike)
function createChainableQuery(data: unknown = mockLeadsData, error: unknown = null, count: number = 2) {
  const result = { data, error, count };

  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        // Must accept both onFulfilled and onRejected to be a proper thenable
        return (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (e: unknown) => unknown
        ) => Promise.resolve(result).then(onFulfilled, onRejected);
      }
      if (prop === 'catch') {
        return (onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(result).catch(onRejected);
      }
      // Any method call (.select, .order, .eq, .range, etc.) returns the same proxy
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };

  return new Proxy({}, handler);
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => createChainableQuery(),
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'test-user-id', tenant_id: 'tenant-1', role: 'admin' },
  }),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch leads on mount', async () => {
    const { result } = renderHook(() => useLeads());

    await waitFor(() => {
      expect(result.current.leads).toHaveLength(2);
    });

    expect(result.current.isEmpty).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have correct lead data structure', async () => {
    const { result } = renderHook(() => useLeads());

    await waitFor(() => {
      expect(result.current.leads).toHaveLength(2);
    });

    const firstLead = result.current.leads[0];

    expect(firstLead).toHaveProperty('id');
    expect(firstLead).toHaveProperty('nome_completo');
    expect(firstLead).toHaveProperty('email');
    expect(firstLead).toHaveProperty('telefone');
    expect(firstLead).toHaveProperty('area_juridica');
    expect(firstLead).toHaveProperty('status');
    expect(firstLead).toHaveProperty('origem');
  });

  it('should provide createLead function', async () => {
    const { result } = renderHook(() => useLeads());

    await waitFor(() => {
      expect(result.current.leads).toHaveLength(2);
    });

    expect(typeof result.current.createLead).toBe('function');
  });

  it('should provide updateLead function', async () => {
    const { result } = renderHook(() => useLeads());

    await waitFor(() => {
      expect(result.current.leads).toHaveLength(2);
    });

    expect(typeof result.current.updateLead).toBe('function');
  });

  it('should provide fetchLeads function', async () => {
    const { result } = renderHook(() => useLeads());

    await waitFor(() => {
      expect(result.current.leads).toHaveLength(2);
    });

    expect(typeof result.current.fetchLeads).toBe('function');
  });
});

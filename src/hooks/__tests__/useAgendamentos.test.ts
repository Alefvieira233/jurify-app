import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAgendamentos } from '../useAgendamentos';

const mockAgendamentosData = [
  {
    id: 'a1',
    lead_id: 'l1',
    tenant_id: 'tenant-1',
    area_juridica: 'Civil',
    data_hora: '2025-02-01T14:00:00Z',
    responsavel: 'Maria',
    observacoes: 'Reunião inicial',
    google_event_id: null,
    status: 'agendado',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: null,
  },
  {
    id: 'a2',
    lead_id: 'l2',
    tenant_id: 'tenant-1',
    area_juridica: 'Trabalhista',
    data_hora: '2025-02-02T10:00:00Z',
    responsavel: 'Pedro',
    observacoes: 'Assinatura de procuração',
    google_event_id: null,
    status: 'confirmado',
    created_at: '2025-01-02T00:00:00Z',
    updated_at: null,
  },
];

// Chainable Supabase mock
function createChainableQuery(data: unknown = mockAgendamentosData, error: unknown = null) {
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

describe('useAgendamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch agendamentos on mount', async () => {
    const { result } = renderHook(() => useAgendamentos());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.agendamentos).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('should have correct agendamento data structure', async () => {
    const { result } = renderHook(() => useAgendamentos());

    await waitFor(() => {
      expect(result.current.agendamentos).toHaveLength(2);
    });

    const first = result.current.agendamentos[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('data_hora');
    expect(first).toHaveProperty('responsavel');
    expect(first).toHaveProperty('area_juridica');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('observacoes');
    expect(first).toHaveProperty('google_event_id');
  });

  it('should normalize agendamento fields', async () => {
    const { result } = renderHook(() => useAgendamentos());

    await waitFor(() => {
      expect(result.current.agendamentos).toHaveLength(2);
    });

    const first = result.current.agendamentos[0];
    expect(first.responsavel).toBe('Maria');
    expect(first.area_juridica).toBe('Civil');
    expect(first.observacoes).toBe('Reunião inicial');
  });

  it('should expose CRUD functions', async () => {
    const { result } = renderHook(() => useAgendamentos());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.createAgendamento).toBe('function');
    expect(typeof result.current.updateAgendamento).toBe('function');
    expect(typeof result.current.deleteAgendamento).toBe('function');
    expect(typeof result.current.fetchAgendamentos).toBe('function');
  });

  it('should report isEmpty correctly when data exists', async () => {
    const { result } = renderHook(() => useAgendamentos());

    await waitFor(() => {
      expect(result.current.agendamentos).toHaveLength(2);
    });

    expect(result.current.isEmpty).toBe(false);
  });
});

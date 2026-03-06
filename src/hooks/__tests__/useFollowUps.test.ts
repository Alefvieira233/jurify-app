import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockFollowUps = [
  {
    id: 'f1', lead_id: 'l1', tenant_id: 'tenant-1', tipo: 'ligacao',
    descricao: 'Ligar para cliente', data_agendada: '2025-03-01T10:00:00Z',
    data_conclusao: null, status: 'pendente', prioridade: 'alta',
    observacoes: null, created_at: '2025-02-01T00:00:00Z', updated_at: null,
  },
  {
    id: 'f2', lead_id: 'l2', tenant_id: 'tenant-1', tipo: 'email',
    descricao: 'Enviar proposta', data_agendada: '2025-02-15T14:00:00Z',
    data_conclusao: '2025-02-15T15:00:00Z', status: 'concluido', prioridade: 'media',
    observacoes: 'OK', created_at: '2025-02-01T00:00:00Z', updated_at: null,
  },
];

function createChainableQuery() {
  const result = { data: mockFollowUps, error: null, count: 2 };
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

import { useFollowUps } from '../useFollowUps';

describe('useFollowUps', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('initializes with empty follow-ups', () => {
    const { result } = renderHook(() => useFollowUps(), { wrapper: createWrapper() });
    expect(result.current.followUps).toEqual([]);
    expect(result.current.overdueCount).toBe(0);
  });

  it('exposes CRUD functions', () => {
    const { result } = renderHook(() => useFollowUps(), { wrapper: createWrapper() });
    expect(typeof result.current.createFollowUp).toBe('function');
    expect(typeof result.current.completeFollowUp).toBe('function');
    expect(typeof result.current.cancelFollowUp).toBe('function');
    expect(typeof result.current.snoozeFollowUp).toBe('function');
    expect(typeof result.current.rescheduleFollowUp).toBe('function');
    expect(typeof result.current.fetchFollowUps).toBe('function');
    expect(typeof result.current.getOverdueCount).toBe('function');
  });

  it('exposes loading state', () => {
    const { result } = renderHook(() => useFollowUps(), { wrapper: createWrapper() });
    expect(typeof result.current.loading).toBe('boolean');
  });
});

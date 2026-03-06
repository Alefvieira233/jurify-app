import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function createChainableQuery() {
  const result = { data: [], error: null, count: 0 };
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') return (f?: (v: unknown) => unknown, r?: (e: unknown) => unknown) => Promise.resolve(result).then(f, r);
      if (prop === 'catch') return (r?: (e: unknown) => unknown) => Promise.resolve(result).catch(r);
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

function createExecChainableQuery() {
  const execData = [
    { current_agent: 'Agent A', status: 'success' },
    { current_agent: 'Agent A', status: 'error' },
    { current_agent: 'Agent B', status: 'completed' },
    { current_agent: null, status: 'failed' },
  ];
  const result = { data: execData, error: null };
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
  const mockChannel = {
    on: () => mockChannel,
    subscribe: (cb?: (status: string) => void) => { cb?.('SUBSCRIBED'); return mockChannel; },
    unsubscribe: vi.fn(),
  };
  const client = {
    from: () => createExecChainableQuery(),
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: () => mockChannel,
    removeChannel: vi.fn().mockResolvedValue(undefined),
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

import { useDashboardMetricsFast } from '../useDashboardMetricsFast';

describe('useDashboardMetricsFast', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('initializes with default metrics', () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    expect(result.current.metrics).toBeDefined();
  });

  it('exposes loading state', () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('exposes refetch function', () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    expect(typeof result.current.refetch).toBe('function');
  });

  it('exposes error state', () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    expect(result.current.error).toBeNull();
  });

  it('loading becomes false after query resolves', async () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('falls back to defaults when RPC returns null', async () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // RPC mock returns null, so it should use DEFAULT_METRICS (fallback)
    expect(result.current.metrics.totalLeads).toBe(0);
    expect(result.current.isViewFallback).toBe(true);
  });

  it('isEmpty is true when totalLeads is 0', async () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.isEmpty).toBe(true);
  });

  it('isStale is always false', () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    expect(result.current.isStale).toBe(false);
  });

  it('metrics has all expected fields', async () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    const m = result.current.metrics;
    expect(m).toHaveProperty('totalLeads');
    expect(m).toHaveProperty('leadsNovoMes');
    expect(m).toHaveProperty('contratos');
    expect(m).toHaveProperty('contratosAssinados');
    expect(m).toHaveProperty('agendamentos');
    expect(m).toHaveProperty('agendamentosHoje');
    expect(m).toHaveProperty('agendamentosSemana');
    expect(m).toHaveProperty('agentesAtivos');
    expect(m).toHaveProperty('execucoesAgentesHoje');
    expect(m).toHaveProperty('execucoesTotais');
    expect(m).toHaveProperty('execucoesSucesso');
    expect(m).toHaveProperty('execucoesErro');
    expect(m).toHaveProperty('leadsPorStatus');
    expect(m).toHaveProperty('leadsPorArea');
    expect(m).toHaveProperty('execucoesRecentesAgentes');
    expect(m).toHaveProperty('refreshedAt');
  });
});

describe('useDashboardMetricsFast with materialized view data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const dashRow = {
      total_leads: 42,
      leads_novo_mes: 10,
      total_contratos: 5,
      contratos_assinados: 3,
      total_agendamentos: 8,
      agendamentos_hoje: 2,
      agendamentos_semana: 4,
      agentes_ativos: 3,
      execucoes_hoje: 15,
      total_execucoes: 100,
      execucoes_sucesso: 90,
      execucoes_erro: 10,
      status_novo_lead: 10,
      status_em_qualificacao: 8,
      status_proposta_enviada: 6,
      status_contrato_assinado: 5,
      status_em_atendimento: 3,
      status_lead_perdido: 2,
      refreshed_at: '2025-03-01T00:00:00Z',
    };
    mockRpc
      .mockResolvedValueOnce({ data: [dashRow], error: null }) // get_dashboard_metrics
      .mockResolvedValueOnce({ data: [{ area: 'Trabalhista', total: 20 }, { area: 'Civil', total: 15 }], error: null }); // get_leads_por_area
  });

  it('fetches real metrics from materialized view', async () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.metrics.totalLeads).toBe(42);
    expect(result.current.metrics.leadsNovoMes).toBe(10);
    expect(result.current.metrics.contratos).toBe(5);
    expect(result.current.isViewFallback).toBe(false);
    expect(result.current.isEmpty).toBe(false);
  });

  it('parses leadsPorArea correctly', async () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.metrics.leadsPorArea).toHaveLength(2);
    expect(result.current.metrics.leadsPorArea[0].area).toBe('Trabalhista');
    expect(result.current.metrics.leadsPorArea[0].total).toBe(20);
  });

  it('parses leadsPorStatus correctly', async () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.metrics.leadsPorStatus.novo_lead).toBe(10);
    expect(result.current.metrics.leadsPorStatus.lead_perdido).toBe(2);
  });

  it('aggregates execucoesRecentesAgentes from query data', async () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    const agents = result.current.metrics.execucoesRecentesAgentes;
    expect(agents.length).toBeGreaterThan(0);
    // Agent A has 2 executions (most active), sorted first
    expect(agents[0].agente_nome).toBe('Agent A');
    expect(agents[0].total_execucoes).toBe(2);
    expect(agents[0].sucesso).toBe(1);
    expect(agents[0].erro).toBe(1);
  });

  it('refreshedAt is populated', async () => {
    const { result } = renderHook(() => useDashboardMetricsFast(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.metrics.refreshedAt).toBe('2025-03-01T00:00:00Z');
  });
});

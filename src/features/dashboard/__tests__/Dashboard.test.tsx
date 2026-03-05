import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const mockRefetch = vi.fn();
const mockNavigate = vi.fn();

const mockMetrics = {
  totalLeads: 42,
  leadsNovoMes: 8,
  contratos: 15,
  contratosAssinados: 10,
  agendamentos: 20,
  agendamentosHoje: 3,
  agendamentosSemana: 7,
  agentesAtivos: 5,
  execucoesAgentesHoje: 12,
  execucoesTotais: 100,
  execucoesSucesso: 85,
  execucoesErro: 15,
  leadsPorStatus: {
    novo_lead: 10, em_qualificacao: 8, proposta_enviada: 7,
    contrato_assinado: 10, em_atendimento: 5, lead_perdido: 2,
  },
  leadsPorArea: [
    { area: 'Trabalhista', total: 15 },
    { area: 'Civil', total: 12 },
  ],
  execucoesRecentesAgentes: [
    { agente_nome: 'Qualificador', total_execucoes: 30, sucesso: 25, erro: 5 },
    { agente_nome: 'Analista', total_execucoes: 20, sucesso: 18, erro: 2 },
  ],
  refreshedAt: null,
};

vi.mock('@/hooks/useDashboardMetricsFast', () => ({
  useDashboardMetricsFast: () => ({
    metrics: mockMetrics,
    loading: false,
    error: null,
    refetch: mockRefetch,
    isEmpty: false,
    isStale: false,
    isViewFallback: false,
  }),
}));

vi.mock('@/hooks/useAgendaMetrics', () => ({
  useAgendaMetrics: () => ({
    data: { hoje: 3, semana: 7, taxaComparecimento: 85, horariosPico: ['09:00', '14:00'] },
    isLoading: false,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'test@test.com' },
    profile: { id: 'u1', tenant_id: 't1', role: 'admin', subscription_tier: 'free' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

import Dashboard from '../Dashboard';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Dashboard header', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
  });

  it('renders subtitle text', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText(/métricas em tempo real/i)).toBeInTheDocument();
  });

  it('shows Atualizar button that calls refetch', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    const btn = screen.getByText('Atualizar');
    fireEvent.click(btn);
    expect(mockRefetch).toHaveBeenCalled();
  });

  // --- KPI Cards ---

  it('renders Total de Leads KPI', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Total de Leads')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders Contratos KPI', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Contratos')).toBeInTheDocument();
    expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Agendamentos KPI', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getAllByText('Agendamentos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders Agentes IA KPI', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Agentes IA')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
  });

  // --- Pipeline ---

  it('renders Pipeline de Leads section', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Pipeline de Leads')).toBeInTheDocument();
  });

  it('renders pipeline status labels', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Novos Leads')).toBeInTheDocument();
    expect(screen.getByText('Em Qualificação')).toBeInTheDocument();
    expect(screen.getByText('Proposta Enviada')).toBeInTheDocument();
  });

  // --- Áreas Jurídicas ---

  it('renders Áreas Jurídicas section', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Áreas Jurídicas')).toBeInTheDocument();
    expect(screen.getByText('Trabalhista')).toBeInTheDocument();
    expect(screen.getByText('Civil')).toBeInTheDocument();
  });

  // --- Agenda Intelligence ---

  it('renders Inteligência de Agenda section', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Inteligência de Agenda')).toBeInTheDocument();
  });

  it('shows agenda metrics', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Comparecimento')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('09:00 · 14:00')).toBeInTheDocument();
  });

  // --- Agentes Performance ---

  it('renders Performance dos Agentes IA section', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Performance dos Agentes IA')).toBeInTheDocument();
  });

  it('renders agent names', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Qualificador')).toBeInTheDocument();
    expect(screen.getByText('Analista')).toBeInTheDocument();
  });

  // --- Plan & Quick Actions ---

  it('renders Plano Atual section with Free badge', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Plano Atual')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('renders quick action buttons', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Novo lead')).toBeInTheDocument();
    expect(screen.getByText('Agendar consulta')).toBeInTheDocument();
    expect(screen.getByText('Fazer upgrade')).toBeInTheDocument();
  });

  it('navigates to pipeline on Novo lead click', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Novo lead'));
    expect(mockNavigate).toHaveBeenCalledWith('/pipeline');
  });

  it('navigates to billing on Fazer upgrade click', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Fazer upgrade'));
    expect(mockNavigate).toHaveBeenCalledWith('/billing');
  });
});

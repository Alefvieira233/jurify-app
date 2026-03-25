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

  it('renders hero title', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText(/O que você precisa automatizar hoje\?/i)).toBeInTheDocument();
  });

  it('renders efficiency badge', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText(/Seu escritório trabalhando mais rápido/i)).toBeInTheDocument();
  });

  it('renders search input with correct placeholder', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText(/Ex: 'Criar Petição INSS', 'Analisar Contrato'\.\.\./i)).toBeInTheDocument();
  });

  it('renders tabs', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Assistentes Práticos')).toBeInTheDocument();
    expect(screen.getByText('Meus Arquivos')).toBeInTheDocument();
    expect(screen.getByText('Histórico')).toBeInTheDocument();
  });

  it('renders AI agent cards', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Elaborar Petição Inicial (INSS)')).toBeInTheDocument();
    expect(screen.getByText('Análise de Contrato ou Acordo')).toBeInTheDocument();
    expect(screen.getByText('Assistente de Triagem de WhatsApp')).toBeInTheDocument();
  });

  it('filters agents by search query', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    const input = screen.getByPlaceholderText(/Ex: 'Criar Petição INSS', 'Analisar Contrato'\.\.\./i);

    fireEvent.change(input, { target: { value: 'Petição' } });

    expect(screen.getByText('Elaborar Petição Inicial (INSS)')).toBeInTheDocument();
    expect(screen.queryByText('Análise de Contrato ou Acordo')).not.toBeInTheDocument();
  });

  it('shows empty state when no tool matches search', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    const input = screen.getByPlaceholderText(/Ex: 'Criar Petição INSS', 'Analisar Contrato'\.\.\./i);

    fireEvent.change(input, { target: { value: 'NonExistentTool' } });

    expect(screen.getByText('Nenhuma ferramenta encontrada')).toBeInTheDocument();
  });
});

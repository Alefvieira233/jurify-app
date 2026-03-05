import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const mockAgentes = [
  { id: 'a1', nome: 'Qualificador', tipo: 'qualificador', status: 'ativo', descricao: 'Qualifica leads', modelo: 'gpt-4o', created_at: '2025-01-01T00:00:00Z', area_juridica: 'Direito Trabalhista' },
  { id: 'a2', nome: 'Analista', tipo: 'analista', status: 'ativo', descricao: 'Analisa casos', modelo: 'gpt-4o', created_at: '2025-01-02T00:00:00Z', area_juridica: 'Direito Civil' },
  { id: 'a3', nome: 'Redator', tipo: 'redator', status: 'inativo', descricao: 'Redige documentos', modelo: 'gpt-4o', created_at: '2025-01-03T00:00:00Z', area_juridica: null },
];

const mockFetchAgentes = vi.fn();
const mockUpdateAgente = vi.fn().mockResolvedValue(true);
const mockDeleteAgente = vi.fn().mockResolvedValue(true);

vi.mock('@/hooks/useAgentesIA', () => ({
  useAgentesIA: () => ({
    agentes: mockAgentes,
    loading: false,
    error: null,
    isEmpty: false,
    fetchAgentes: mockFetchAgentes,
    updateAgente: mockUpdateAgente,
    deleteAgente: mockDeleteAgente,
    createAgente: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAgentesMetrics', () => ({
  useAgentesMetrics: () => ({
    metrics: { execucoesHoje: 12, execucoesMes: 0, sucessoRate: 90, agenteMaisAtivo: null },
    loading: false,
    ultimaExecucaoFormatada: 'Há 5 min',
  }),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (v: string) => v,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'test@test.com' },
    profile: { id: 'u1', tenant_id: 't1', role: 'admin' },
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

vi.mock('@/utils/monitoring', () => ({
  trackUserAction: vi.fn(),
}));

// Mock heavy child components — NovoAgenteForm is rendered conditionally (no open prop)
vi.mock('@/components/NovoAgenteForm', () => ({
  default: () => <div data-testid="novo-agente-form">Form</div>,
}));
vi.mock('@/components/DetalhesAgente', () => ({
  default: () => <div data-testid="detalhes-agente">Detalhes</div>,
}));
vi.mock('@/components/ApiKeysManager', () => ({
  default: () => <div data-testid="api-keys-manager">ApiKeys</div>,
}));
vi.mock('@/components/LogsMonitoramento', () => ({
  default: () => <div data-testid="logs-monitoramento">Logs</div>,
}));

import AgentesIAManager from '../AgentesIAManager';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('AgentesIAManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with title', () => {
    render(<AgentesIAManager />, { wrapper: createWrapper() });
    expect(screen.getAllByText(/agentes de ia/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders subtitle', () => {
    render(<AgentesIAManager />, { wrapper: createWrapper() });
    expect(screen.getByText(/gerencie seus assistentes/i)).toBeInTheDocument();
  });

  it('renders Novo Agente button', () => {
    render(<AgentesIAManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Novo Agente')).toBeInTheDocument();
  });

  it('renders stats cards', () => {
    render(<AgentesIAManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Ativos')).toBeInTheDocument();
  });

  it('renders tabs: Agentes, API Keys, Logs', () => {
    render(<AgentesIAManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Agentes')).toBeInTheDocument();
    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
  });

  it('renders search input with placeholder', () => {
    render(<AgentesIAManager />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText(/nome, área jurídica/i)).toBeInTheDocument();
  });

  it('renders agent count summary', () => {
    render(<AgentesIAManager />, { wrapper: createWrapper() });
    // "{filteredCount} de {totalCount} agentes"
    expect(screen.getByText(/agentes/)).toBeInTheDocument();
  });

  it('opens novo agente form when button is clicked', () => {
    render(<AgentesIAManager />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Novo Agente'));
    expect(screen.getByTestId('novo-agente-form')).toBeInTheDocument();
  });
});

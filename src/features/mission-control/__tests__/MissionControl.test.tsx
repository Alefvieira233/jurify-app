import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseRealtimeAgents = vi.fn();
vi.mock('../hooks/useRealtimeAgents', () => ({
  useRealtimeAgents: () => mockUseRealtimeAgents(),
}));

import { MissionControl } from '../MissionControl';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, children),
    );
}

const mockAgentStatuses = [
  {
    name: 'Qualificador',
    status: 'idle' as const,
    currentTask: null,
    lastActivity: null,
    metrics: { totalExecutions: 10, successRate: 95.0, avgLatencyMs: 200, totalTokens: 5000 },
  },
  {
    name: 'Classificador',
    status: 'processing' as const,
    currentTask: 'Lead #42',
    lastActivity: new Date().toISOString(),
    metrics: { totalExecutions: 25, successRate: 88.5, avgLatencyMs: 350, totalTokens: 12000 },
  },
];

describe('MissionControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      profile: { tenant_id: 'tenant-1' },
    });
  });

  it('renders the header and title', () => {
    mockUseRealtimeAgents.mockReturnValue({
      agentStatuses: [],
      activeExecutions: [],
      recentLogs: [],
      isConnected: true,
      error: null,
      refresh: vi.fn(),
    });

    render(<MissionControl />, { wrapper: createWrapper() });

    expect(screen.getByText('Mission Control')).toBeInTheDocument();
    expect(screen.getByText('Monitoramento em tempo real do sistema multiagentes')).toBeInTheDocument();
  });

  it('shows connected status when connected', () => {
    mockUseRealtimeAgents.mockReturnValue({
      agentStatuses: [],
      activeExecutions: [],
      recentLogs: [],
      isConnected: true,
      error: null,
      refresh: vi.fn(),
    });

    render(<MissionControl />, { wrapper: createWrapper() });

    expect(screen.getByText('Conectado')).toBeInTheDocument();
  });

  it('shows disconnected status when not connected', () => {
    mockUseRealtimeAgents.mockReturnValue({
      agentStatuses: [],
      activeExecutions: [],
      recentLogs: [],
      isConnected: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<MissionControl />, { wrapper: createWrapper() });

    expect(screen.getByText('Desconectado')).toBeInTheDocument();
  });

  it('renders agent status cards', () => {
    mockUseRealtimeAgents.mockReturnValue({
      agentStatuses: mockAgentStatuses,
      activeExecutions: [],
      recentLogs: [],
      isConnected: true,
      error: null,
      refresh: vi.fn(),
    });

    render(<MissionControl />, { wrapper: createWrapper() });

    expect(screen.getByText('Qualificador')).toBeInTheDocument();
    expect(screen.getByText('Classificador')).toBeInTheDocument();
    expect(screen.getByText('95.0%')).toBeInTheDocument();
  });

  it('displays error alert when error exists', () => {
    mockUseRealtimeAgents.mockReturnValue({
      agentStatuses: [],
      activeExecutions: [],
      recentLogs: [],
      isConnected: false,
      error: 'Falha na conexao com o servidor',
      refresh: vi.fn(),
    });

    render(<MissionControl />, { wrapper: createWrapper() });

    expect(screen.getByText('Falha na conexao com o servidor')).toBeInTheDocument();
  });

  it('shows empty executions message', () => {
    mockUseRealtimeAgents.mockReturnValue({
      agentStatuses: [],
      activeExecutions: [],
      recentLogs: [],
      isConnected: true,
      error: null,
      refresh: vi.fn(),
    });

    render(<MissionControl />, { wrapper: createWrapper() });

    expect(screen.getByText('Nenhuma execução ativa no momento')).toBeInTheDocument();
  });

  it('calls refresh when Atualizar button is clicked', () => {
    const refreshFn = vi.fn().mockResolvedValue(undefined);
    mockUseRealtimeAgents.mockReturnValue({
      agentStatuses: [],
      activeExecutions: [],
      recentLogs: [],
      isConnected: true,
      error: null,
      refresh: refreshFn,
    });

    render(<MissionControl />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Atualizar'));
    expect(refreshFn).toHaveBeenCalled();
  });
});

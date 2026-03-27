import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/useLeads', () => ({
  useLeads: () => ({
    leads: [
      { id: '1', status: 'novo', created_at: new Date().toISOString() },
      { id: '2', status: 'ganho', created_at: new Date().toISOString() },
      { id: '3', status: 'em_contato', created_at: new Date().toISOString() },
    ],
    loading: false,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'test', tenant_id: 'tenant1', nome_completo: 'Test User' },
    user: { id: 'test' },
  }),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => ({
    getLeadVisibilityScope: () => 'all',
    getUserDepartamentos: () => [],
  }),
}));

vi.mock('@/components/relatorios/RankingAgentesTable', () => ({
  default: () => React.createElement('div', { 'data-testid': 'ranking-table' }, 'RankingTable'),
}));

import Dashboard from '../Dashboard';

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, null, children);
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard title', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders stat cards', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    // Use getAllByText for labels that appear in both stat cards and the pipeline distribution list
    expect(screen.getAllByText('Nova Conversa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sucesso').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Análise').length).toBeGreaterThanOrEqual(1);
  });

  it('renders pipeline overview', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Eventos por Status')).toBeInTheDocument();
    expect(screen.getByText('Distribuição do Pipeline')).toBeInTheDocument();
  });

  it('renders period selector', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Semana')).toBeInTheDocument();
    expect(screen.getByText('Mês')).toBeInTheDocument();
    expect(screen.getByText('Trimestre')).toBeInTheDocument();
  });

  it('displays correct lead counts', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    // Total leads = 3 (stat card total is not shown, but 1 novo, 1 ganho, 1 em_contato)
    // In "Distribuição do Pipeline", it should show "3 leads".
    // We use getAllByText because it appears for both "Total no período" and "Total geral"
    const leadCountElements = screen.getAllByText(/3 leads/i);
    expect(leadCountElements.length).toBeGreaterThanOrEqual(1);
  });
});

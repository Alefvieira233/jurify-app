import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    Sankey: () => React.createElement('div', { 'data-testid': 'sankey-chart' }),
  };
});

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

  it('renders stat cards section', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Eventos por Status')).toBeInTheDocument();
    // Labels appear in both stat cards and pipeline distribution
    expect(screen.getAllByText('Nova Conversa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Qualificado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sucesso').length).toBeGreaterThanOrEqual(1);
  });

  it('renders pipeline distribution', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Distribuição do Pipeline')).toBeInTheDocument();
  });

  it('renders period selector', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Semana')).toBeInTheDocument();
    expect(screen.getByText('Mês')).toBeInTheDocument();
    expect(screen.getByText('Trimestre')).toBeInTheDocument();
  });

  it('displays lead totals', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    // "3 leads" appears in both period total and overall total
    expect(screen.getAllByText('3 leads').length).toBe(2);
  });

  it('renders sankey chart section', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Fluxo do Pipeline')).toBeInTheDocument();
  });
});

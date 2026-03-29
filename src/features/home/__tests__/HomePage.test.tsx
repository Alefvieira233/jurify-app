import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from '../HomePage';

// Mock hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { nome_completo: 'Test User', tenant_id: 't1' },
    user: { id: 'u1' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useLeads', () => ({
  useLeads: () => ({
    leads: [{ id: '1', status: 'novo', created_at: new Date().toISOString() }],
    loading: false,
  }),
}));

vi.mock('@/hooks/useTarefas', () => ({
  useTarefas: () => ({
    tarefas: [{ id: '1', status: 'pendente', titulo: 'Test', created_at: new Date().toISOString() }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useAgendamentos', () => ({
  useAgendamentos: () => ({
    agendamentos: [{ id: '1', data_hora: new Date().toISOString(), status: 'agendado' }],
    loading: false,
  }),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => ({
    getLeadVisibilityScope: () => 'all',
    getUserDepartamentos: () => [],
  }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/usePrazosProcessuais', () => ({
  usePrazosProcessuais: () => ({
    prazosUrgentes: [],
    loading: false,
  }),
}));

const renderHomePage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a time-of-day greeting', () => {
    renderHomePage();
    expect(screen.getByText(/Bom dia|Boa tarde|Boa noite/)).toBeInTheDocument();
  });

  it('renders the user first name', () => {
    renderHomePage();
    expect(screen.getByText(/Test/)).toBeInTheDocument();
  });

  it('renders all 4 stat card labels', () => {
    renderHomePage();
    expect(screen.getByText('Leads hoje')).toBeInTheDocument();
    expect(screen.getByText('Total de leads')).toBeInTheDocument();
    expect(screen.getByText('Tarefas pendentes')).toBeInTheDocument();
    expect(screen.getByText('Agendamentos')).toBeInTheDocument();
  });

  it('renders quick action buttons', () => {
    renderHomePage();
    expect(screen.getByText(/Novo Lead/)).toBeInTheDocument();
    expect(screen.getByText(/Nova Conversa/)).toBeInTheDocument();
    expect(screen.getByText(/Nova Tarefa/)).toBeInTheDocument();
    expect(screen.getByText(/Agendar/)).toBeInTheDocument();
  });

  it('renders stat values', () => {
    renderHomePage();
    // Each card shows "1" for the single mock item
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const mockAgendamentos = [
  { id: 'ag1', data_hora: '2025-03-10T09:00:00Z', responsavel: 'Dr. Maria Silva', status: 'agendado', tipo: 'Consulta', local: 'Escritório', observacoes: null, tenant_id: 't1', created_at: '2025-01-01T00:00:00Z' },
  { id: 'ag2', data_hora: '2025-03-11T14:00:00Z', responsavel: 'Dr. Pedro Costa', status: 'confirmado', tipo: 'Audiência', local: 'Fórum', observacoes: null, tenant_id: 't1', created_at: '2025-01-02T00:00:00Z' },
  { id: 'ag3', data_hora: '2025-03-12T10:00:00Z', responsavel: 'Dr. Ana Lima', status: 'cancelado', tipo: 'Reunião', local: 'Online', observacoes: null, tenant_id: 't1', created_at: '2025-01-03T00:00:00Z' },
];

const mockFetchAgendamentos = vi.fn();
const mockDeleteAgendamento = vi.fn().mockResolvedValue(true);

vi.mock('@/hooks/useAgendamentos', () => ({
  useAgendamentos: () => ({
    agendamentos: mockAgendamentos,
    loading: false,
    error: null,
    isEmpty: false,
    fetchAgendamentos: mockFetchAgendamentos,
    deleteAgendamento: mockDeleteAgendamento,
    createAgendamento: vi.fn(),
    updateAgendamento: vi.fn(),
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

vi.mock('@/utils/formatting', () => ({
  fmtMessageTime: (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
}));

// Mock heavy child components
vi.mock('@/components/NovoAgendamentoForm', () => ({
  NovoAgendamentoForm: ({ open }: { open: boolean }) => open ? <div data-testid="novo-agendamento-form">Form</div> : null,
}));
vi.mock('@/components/DetalhesAgendamento', () => ({
  DetalhesAgendamento: ({ open }: { open: boolean }) => open ? <div data-testid="detalhes-agendamento">Detalhes</div> : null,
}));
vi.mock('@/components/agenda/CalendarPanel', () => ({
  default: () => <div data-testid="calendar-panel">Calendar</div>,
}));

import AgendamentosManager from '../AgendamentosManager';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('AgendamentosManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with Agendamentos title', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    expect(screen.getAllByText('Agendamentos').length).toBeGreaterThanOrEqual(1);
  });

  it('renders agendamento count in subtitle', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    expect(screen.getByText(/3 agendamentos no total/)).toBeInTheDocument();
  });

  it('renders Novo Agendamento button', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Novo Agendamento')).toBeInTheDocument();
  });

  it('renders responsavel names in list', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    expect(screen.getByText(/Dr\. Maria Silva/)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Pedro Costa/)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Ana Lima/)).toBeInTheDocument();
  });

  it('renders status labels', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    expect(screen.getAllByText('Agendado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Confirmado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cancelado').length).toBeGreaterThanOrEqual(1);
  });

  it('renders search input', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText(/buscar por responsavel/i)).toBeInTheDocument();
  });

  it('filters agendamentos by search term', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    const input = screen.getByPlaceholderText(/buscar por responsavel/i);
    fireEvent.change(input, { target: { value: 'Maria' } });
    expect(screen.getByText(/Dr\. Maria Silva/)).toBeInTheDocument();
    expect(screen.queryByText(/Dr\. Pedro Costa/)).not.toBeInTheDocument();
  });

  it('opens dialog when Novo Agendamento is clicked', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Novo Agendamento'));
    // Dialog renders "Novo Agendamento" title inside DialogHeader
    expect(screen.getAllByText('Novo Agendamento').length).toBeGreaterThanOrEqual(2);
  });

  it('renders view mode toggle buttons', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders status filter select', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    const selects = document.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Atualizar button', () => {
    render(<AgendamentosManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Atualizar')).toBeInTheDocument();
  });
});

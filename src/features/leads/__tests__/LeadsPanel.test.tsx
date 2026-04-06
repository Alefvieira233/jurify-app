import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks before importing component
const mockUseLeads = vi.fn();
vi.mock('@/hooks/useLeads', () => ({
  useLeads: () => mockUseLeads(),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (val: string) => val,
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/features/timeline/TimelineConversas', () => ({
  default: () => React.createElement('div', { 'data-testid': 'timeline' }, 'Timeline'),
}));

vi.mock('@/components/forms/NovoLeadForm', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'novo-lead-form' }, 'Form') : null,
}));

vi.mock('@/components/forms/LeadDrawer', () => ({
  default: ({ lead }: { lead: { nome_completo: string } }) =>
    React.createElement('div', { 'data-testid': 'lead-drawer' }, lead.nome_completo),
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: () => null,
}));

import LeadsPanel from '../LeadsPanel';

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

const mockLeads = [
  {
    id: 'lead-1',
    nome: 'Maria Silva',
    nome_completo: 'Maria Silva',
    email: 'maria@test.com',
    telefone: '11999999999',
    area_juridica: 'Trabalhista',
    status: 'novo',
    origem: 'whatsapp',
    valor_causa: 50000,
    responsavel_id: null,
    descricao: null,
    tenant_id: 'tenant-1',
    metadata: null,
  },
  {
    id: 'lead-2',
    nome: 'Joao Santos',
    nome_completo: 'Joao Santos',
    email: 'joao@test.com',
    telefone: '11888888888',
    area_juridica: 'Civil',
    status: 'qualificado',
    origem: 'site',
    valor_causa: 100000,
    responsavel_id: 'user-1',
    descricao: null,
    tenant_id: 'tenant-1',
    metadata: null,
  },
];

describe('LeadsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons when data is loading', () => {
    mockUseLeads.mockReturnValue({
      leads: [],
      loading: true,
      error: null,
      isEmpty: true,
      fetchLeads: vi.fn(),
      deleteLead: vi.fn(),
    });

    const { container } = render(<LeadsPanel />, { wrapper: createWrapper() });

    // Skeleton elements should be present (Skeleton uses the class)
    const skeletons = container.querySelectorAll('.animate-pulse, [class*="Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no leads exist', () => {
    mockUseLeads.mockReturnValue({
      leads: [],
      loading: false,
      error: null,
      isEmpty: true,
      fetchLeads: vi.fn(),
      deleteLead: vi.fn(),
    });

    render(<LeadsPanel />, { wrapper: createWrapper() });

    expect(screen.getByText('Base de contatos vazia')).toBeInTheDocument();
    expect(screen.getByText(/Cadastrar Manualmente/)).toBeInTheDocument();
  });

  it('renders lead cards when data exists', () => {
    mockUseLeads.mockReturnValue({
      leads: mockLeads,
      loading: false,
      error: null,
      isEmpty: false,
      fetchLeads: vi.fn(),
      deleteLead: vi.fn(),
    });

    render(<LeadsPanel />, { wrapper: createWrapper() });

    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Joao Santos')).toBeInTheDocument();
    expect(screen.getByText('Trabalhista')).toBeInTheDocument();
    expect(screen.getByText('Civil')).toBeInTheDocument();
  });

  it('displays volume count matching filtered leads', () => {
    mockUseLeads.mockReturnValue({
      leads: mockLeads,
      loading: false,
      error: null,
      isEmpty: false,
      fetchLeads: vi.fn(),
      deleteLead: vi.fn(),
    });

    render(<LeadsPanel />, { wrapper: createWrapper() });

    // Volume count should show 2
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const fetchLeads = vi.fn();
    mockUseLeads.mockReturnValue({
      leads: [],
      loading: false,
      error: 'Falha de rede',
      isEmpty: true,
      fetchLeads,
      deleteLead: vi.fn(),
    });

    render(<LeadsPanel />, { wrapper: createWrapper() });

    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
    expect(screen.getByText('Falha de rede')).toBeInTheDocument();
    expect(screen.getByText(/Tentar Novamente/)).toBeInTheDocument();
  });

  it('search input updates search term', () => {
    mockUseLeads.mockReturnValue({
      leads: mockLeads,
      loading: false,
      error: null,
      isEmpty: false,
      fetchLeads: vi.fn(),
      deleteLead: vi.fn(),
    });

    render(<LeadsPanel />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/Buscar contato/);
    fireEvent.change(searchInput, { target: { value: 'Maria' } });

    // After typing "Maria", only Maria Silva should be visible
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.queryByText('Joao Santos')).not.toBeInTheDocument();
  });

  it('clicking a lead card opens the drawer', () => {
    mockUseLeads.mockReturnValue({
      leads: mockLeads,
      loading: false,
      error: null,
      isEmpty: false,
      fetchLeads: vi.fn(),
      deleteLead: vi.fn(),
    });

    render(<LeadsPanel />, { wrapper: createWrapper() });

    const mariaCard = screen.getByText('Maria Silva').closest('[role="button"]');
    expect(mariaCard).toBeTruthy();
    fireEvent.click(mariaCard!);

    expect(screen.getByTestId('lead-drawer')).toHaveTextContent('Maria Silva');
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (val: string) => val,
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseRBAC = vi.fn();
vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => mockUseRBAC(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockUsePrazos = vi.fn();
vi.mock('@/hooks/usePrazosProcessuais', () => ({
  usePrazosProcessuais: () => mockUsePrazos(),
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('./components/PrazoAlertaBadge', () => ({
  default: () => null,
}));

vi.mock('./components/NovoPrazoForm', () => ({
  default: () => React.createElement('div', { 'data-testid': 'novo-prazo-form' }, 'Form'),
}));

vi.mock('./components/PrazosCalendario', () => ({
  PrazosCalendario: () => React.createElement('div', null, 'Calendario'),
}));

vi.mock('./PrazosDashboard', () => ({
  default: () => React.createElement('div', null, 'Dashboard'),
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title, description }: { title: string; description?: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' },
      React.createElement('h2', null, title),
      description && React.createElement('p', null, description),
    ),
}));

vi.mock('@/components/ErrorState', () => ({
  default: ({ title, message }: { title?: string; message?: string }) =>
    React.createElement('div', { 'data-testid': 'error-state' },
      React.createElement('h2', null, title ?? 'Erro ao carregar dados'),
      message && React.createElement('p', null, message),
    ),
}));

vi.mock('@/components/PaginationControls', () => ({
  default: () => React.createElement('div', { 'data-testid': 'pagination' }),
}));

import PrazosManager from '../PrazosManager';

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

const basePrazosReturn = {
  prazos: [],
  prazosUrgentes: [],
  loading: false,
  error: null,
  isEmpty: true,
  fetchPrazos: vi.fn(),
  createPrazo: vi.fn(),
  updatePrazo: vi.fn(),
  deletePrazo: vi.fn(),
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  hasPrevPage: false,
  hasNextPage: false,
  prevPage: vi.fn(),
  nextPage: vi.fn(),
};

describe('PrazosManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ profile: { tenant_id: 'tenant-1' } });
    mockUseRBAC.mockReturnValue({ can: () => true });
  });

  it('renders loading skeletons when loading', () => {
    mockUsePrazos.mockReturnValue({ ...basePrazosReturn, loading: true });

    const { container } = render(<PrazosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Prazos Processuais')).toBeInTheDocument();
    const skeletons = container.querySelectorAll('.animate-pulse, [class*="Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state when error exists', () => {
    mockUsePrazos.mockReturnValue({
      ...basePrazosReturn,
      error: 'Falha de rede',
    });

    render(<PrazosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Erro ao carregar prazos')).toBeInTheDocument();
  });

  it('renders empty state when no prazos exist', () => {
    mockUsePrazos.mockReturnValue({ ...basePrazosReturn });

    render(<PrazosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Nenhum Prazo')).toBeInTheDocument();
  });

  it('renders prazo items when data exists', () => {
    const mockPrazos = [
      {
        id: 'prazo-1',
        descricao: 'Audiencia trabalhista',
        tipo: 'audiencia',
        status: 'pendente',
        data_prazo: '2026-04-15T10:00:00Z',
        observacoes: 'Preparar documentos',
        tenant_id: 'tenant-1',
      },
      {
        id: 'prazo-2',
        descricao: 'Recurso ordinario',
        tipo: 'recurso',
        status: 'pendente',
        data_prazo: '2026-04-20T14:00:00Z',
        observacoes: null,
        tenant_id: 'tenant-1',
      },
    ];

    mockUsePrazos.mockReturnValue({
      ...basePrazosReturn,
      prazos: mockPrazos,
      isEmpty: false,
    });

    render(<PrazosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Audiencia trabalhista')).toBeInTheDocument();
    expect(screen.getByText('Recurso ordinario')).toBeInTheDocument();
    expect(screen.getByText('Audiência')).toBeInTheDocument();
    expect(screen.getByText('Recurso')).toBeInTheDocument();
  });

  it('shows Novo Prazo button when user has create permission', () => {
    mockUsePrazos.mockReturnValue({ ...basePrazosReturn, isEmpty: false, prazos: [] });

    render(<PrazosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Novo Prazo')).toBeInTheDocument();
  });

  it('hides Novo Prazo button when user lacks create permission', () => {
    mockUseRBAC.mockReturnValue({ can: () => false });
    mockUsePrazos.mockReturnValue({ ...basePrazosReturn });

    render(<PrazosManager />, { wrapper: createWrapper() });

    expect(screen.queryByText('Novo Prazo')).not.toBeInTheDocument();
  });
});

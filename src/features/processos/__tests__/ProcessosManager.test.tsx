import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks
const mockUseProcessos = vi.fn();
vi.mock('@/hooks/useProcessos', () => ({
  useProcessos: (opts: unknown) => mockUseProcessos(opts),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (val: string) => val,
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/usePrazosProcessuais', () => ({
  usePrazosProcessuais: () => ({ prazosUrgentes: [] }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', tenant_id: 'tenant-1' },
    user: { id: 'user-1' },
  }),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => ({
    can: () => true,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabaseUntyped: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ count: 5, error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      })),
    })),
  },
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' }, title),
}));

vi.mock('@/components/ErrorState', () => ({
  default: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'error-state' }, title),
}));

vi.mock('@/components/PaginationControls', () => ({
  default: () => React.createElement('div', { 'data-testid': 'pagination' }),
}));

vi.mock('../components/NovoProcessoForm', () => ({
  default: () => React.createElement('div', null, 'Form'),
}));

vi.mock('../components/ProcessoDetalhes', () => ({
  default: () => React.createElement('div', null, 'Detalhes'),
}));

vi.mock('../components/EncerrarProcessoDialog', () => ({
  EncerrarProcessoDialog: () => null,
}));

vi.mock('@/schemas/processoSchema', () => ({
  PROCESSO_STATUS_LABELS: {
    ativo: 'Ativo',
    suspenso: 'Suspenso',
    arquivado: 'Arquivado',
  },
}));

vi.mock('@/constants/statusConfig', () => ({
  getStatusClasses: () => 'bg-blue-500/10 text-blue-500',
}));

vi.mock('../components/ProcessoCard', () => ({
  default: ({ processo, onView }: any) =>
    React.createElement(
      'div',
      {
        'data-testid': `processo-card-${processo.id}`,
        onClick: () => onView(processo),
        role: 'button',
      },
      React.createElement('span', null, processo.numero_processo),
    ),
  TIPO_LABELS: { civel: 'Civel', trabalhista: 'Trabalhista' },
}));

import ProcessosManager from '../ProcessosManager';

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

const mockProcessos = [
  {
    id: 'p1',
    numero_processo: '0001234-56.2026.5.02.0001',
    tipo_acao: 'civel',
    status: 'ativo',
    fase_processual: 'conhecimento',
    tribunal: 'TJSP',
    vara: '1a Vara',
    comarca: 'Sao Paulo',
    valor_causa: 150000,
    tenant_id: 'tenant-1',
  },
  {
    id: 'p2',
    numero_processo: '0009876-54.2026.8.26.0100',
    tipo_acao: 'trabalhista',
    status: 'suspenso',
    fase_processual: 'execucao',
    tribunal: 'TRT2',
    vara: '2a Vara',
    comarca: 'Campinas',
    valor_causa: 80000,
    tenant_id: 'tenant-1',
  },
];

describe('ProcessosManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with skeletons', () => {
    mockUseProcessos.mockReturnValue({
      processos: [],
      loading: true,
      error: null,
      isEmpty: true,
      fetchProcessos: vi.fn(),
      createProcesso: vi.fn(),
      updateProcesso: vi.fn(),
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: vi.fn(),
      nextPage: vi.fn(),
    });

    render(<ProcessosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Processos Jurídicos')).toBeInTheDocument();
  });

  it('renders error state on failure', () => {
    mockUseProcessos.mockReturnValue({
      processos: [],
      loading: false,
      error: 'Network error',
      isEmpty: true,
      fetchProcessos: vi.fn(),
      createProcesso: vi.fn(),
      updateProcesso: vi.fn(),
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: vi.fn(),
      nextPage: vi.fn(),
    });

    render(<ProcessosManager />, { wrapper: createWrapper() });

    expect(screen.getByTestId('error-state')).toHaveTextContent('Erro ao carregar processos');
  });

  it('renders empty state when no processes exist', () => {
    mockUseProcessos.mockReturnValue({
      processos: [],
      loading: false,
      error: null,
      isEmpty: true,
      fetchProcessos: vi.fn(),
      createProcesso: vi.fn(),
      updateProcesso: vi.fn(),
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: vi.fn(),
      nextPage: vi.fn(),
    });

    render(<ProcessosManager />, { wrapper: createWrapper() });

    expect(screen.getByTestId('empty-state')).toHaveTextContent('Nenhum Processo');
  });

  it('renders process list with correct data', () => {
    mockUseProcessos.mockReturnValue({
      processos: mockProcessos,
      loading: false,
      error: null,
      isEmpty: false,
      fetchProcessos: vi.fn(),
      createProcesso: vi.fn(),
      updateProcesso: vi.fn(),
      currentPage: 1,
      totalPages: 1,
      totalCount: 2,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: vi.fn(),
      nextPage: vi.fn(),
    });

    render(<ProcessosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('0001234-56.2026.5.02.0001')).toBeInTheDocument();
    expect(screen.getByText('0009876-54.2026.8.26.0100')).toBeInTheDocument();
  });

  it('displays stats cards with total count', () => {
    mockUseProcessos.mockReturnValue({
      processos: mockProcessos,
      loading: false,
      error: null,
      isEmpty: false,
      fetchProcessos: vi.fn(),
      createProcesso: vi.fn(),
      updateProcesso: vi.fn(),
      currentPage: 1,
      totalPages: 1,
      totalCount: 2,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: vi.fn(),
      nextPage: vi.fn(),
    });

    render(<ProcessosManager />, { wrapper: createWrapper() });

    // Stats cards: Total, Ativos, Taxa de Exito, Prazos Urgentes
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Ativos')).toBeInTheDocument();
    expect(screen.getByText('Taxa de Êxito')).toBeInTheDocument();
    expect(screen.getByText('Prazos Urgentes')).toBeInTheDocument();
  });

  it('shows Novo Processo button when user has create permission', () => {
    mockUseProcessos.mockReturnValue({
      processos: mockProcessos,
      loading: false,
      error: null,
      isEmpty: false,
      fetchProcessos: vi.fn(),
      createProcesso: vi.fn(),
      updateProcesso: vi.fn(),
      currentPage: 1,
      totalPages: 1,
      totalCount: 2,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: vi.fn(),
      nextPage: vi.fn(),
    });

    render(<ProcessosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Novo Processo')).toBeInTheDocument();
  });
});

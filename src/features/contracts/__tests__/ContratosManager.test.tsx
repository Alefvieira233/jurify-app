import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks
const mockUseContratos = vi.fn();
vi.mock('@/hooks/useContratos', () => ({
  useContratos: () => mockUseContratos(),
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', tenant_id: 'tenant-1' },
    user: { id: 'user-1' },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabaseUntyped: {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) })),
    })),
  },
}));

vi.mock('@/components/UploadContratos', () => ({
  default: () => React.createElement('div', { 'data-testid': 'upload' }, 'Upload'),
}));

vi.mock('@/components/NovoContratoForm', () => ({
  NovoContratoForm: () => React.createElement('div', { 'data-testid': 'novo-form' }, 'Form'),
}));

vi.mock('@/components/DetalhesContrato', () => ({
  DetalhesContrato: () => React.createElement('div', { 'data-testid': 'detalhes' }, 'Detalhes'),
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: ({ open, description }: { open: boolean; description: string }) =>
    open ? React.createElement('div', { 'data-testid': 'confirm-dialog' }, description) : null,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' }, title),
}));

vi.mock('@/components/ErrorState', () => ({
  default: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'error-state' }, title),
}));

vi.mock('../components/ContratoCard', () => ({
  default: ({ contrato, onOpenDetails, onDelete }: any) =>
    React.createElement('div', { 'data-testid': `contrato-card-${contrato.id}` },
      React.createElement('span', null, contrato.nome_cliente),
      React.createElement('span', null, contrato.status),
      React.createElement('button', { 'data-testid': `delete-${contrato.id}`, onClick: () => onDelete(contrato) }, 'Delete'),
    ),
}));

import ContratosManager from '../ContratosManager';

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

const mockContratos = [
  {
    id: 'c1',
    lead_id: 'l1',
    tenant_id: 'tenant-1',
    nome_cliente: 'Cliente Alpha',
    area_juridica: 'Trabalhista',
    valor_causa: 30000,
    status: 'rascunho',
    responsavel: 'Advogado X',
    data_envio: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    lead_id: 'l2',
    tenant_id: 'tenant-1',
    nome_cliente: 'Cliente Beta',
    area_juridica: 'Civil',
    valor_causa: 50000,
    status: 'assinado',
    responsavel: 'Advogado Y',
    data_envio: '2026-01-05T00:00:00Z',
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-05T00:00:00Z',
  },
];

describe('ContratosManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with skeletons', () => {
    mockUseContratos.mockReturnValue({
      contratos: [],
      loading: true,
      error: null,
      isEmpty: true,
      fetchContratos: vi.fn(),
    });

    render(<ContratosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Gestão de Contratos')).toBeInTheDocument();
    expect(screen.getByText(/Gerencie contratos e assinaturas digitais/)).toBeInTheDocument();
  });

  it('renders empty state when no contracts exist', () => {
    mockUseContratos.mockReturnValue({
      contratos: [],
      loading: false,
      error: null,
      isEmpty: true,
      fetchContratos: vi.fn(),
    });

    render(<ContratosManager />, { wrapper: createWrapper() });

    expect(screen.getByTestId('empty-state')).toHaveTextContent('Nenhum contrato cadastrado');
  });

  it('renders error state on fetch failure', () => {
    mockUseContratos.mockReturnValue({
      contratos: [],
      loading: false,
      error: 'Connection failed',
      isEmpty: true,
      fetchContratos: vi.fn(),
    });

    render(<ContratosManager />, { wrapper: createWrapper() });

    expect(screen.getByTestId('error-state')).toHaveTextContent('Erro ao carregar contratos');
  });

  it('renders contract list with correct count text', () => {
    mockUseContratos.mockReturnValue({
      contratos: mockContratos,
      loading: false,
      error: null,
      isEmpty: false,
      fetchContratos: vi.fn(),
    });

    render(<ContratosManager />, { wrapper: createWrapper() });

    // The total count is rendered in the header subtitle (span + text)
    expect(screen.getByText(/contratos no total/)).toBeInTheDocument();
    // The Contratos heading
    expect(screen.getByText('Contratos')).toBeInTheDocument();
    // The Live badge
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders search and status filter controls', () => {
    mockUseContratos.mockReturnValue({
      contratos: mockContratos,
      loading: false,
      error: null,
      isEmpty: false,
      fetchContratos: vi.fn(),
    });

    render(<ContratosManager />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText(/Buscar por nome do cliente/)).toBeInTheDocument();
    // Tabs for contratos and upload
    expect(screen.getByText('Lista de Contratos')).toBeInTheDocument();
    expect(screen.getByText('Upload de Contratos')).toBeInTheDocument();
  });

  it('displays Novo Contrato button', () => {
    mockUseContratos.mockReturnValue({
      contratos: mockContratos,
      loading: false,
      error: null,
      isEmpty: false,
      fetchContratos: vi.fn(),
    });

    render(<ContratosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Novo Contrato')).toBeInTheDocument();
  });
});

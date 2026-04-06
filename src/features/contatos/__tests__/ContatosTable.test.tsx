import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks
const mockUseLeads = vi.fn();
vi.mock('@/hooks/useLeads', () => ({
  useLeads: () => mockUseLeads(),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/useDepartamentos', () => ({
  useDepartamentos: () => ({ activeDepartamentos: [{ id: 'dep-1', nome: 'Juridico' }] }),
}));

vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: () => ({ members: [{ id: 'member-1', nome_completo: 'Maria Silva', email: 'maria@test.com' }] }),
}));

vi.mock('@/hooks/useVirtualList', () => ({
  useVirtualList: ({ count }: { count: number }) => ({
    parentRef: { current: null },
    virtualizer: {
      getVirtualItems: () =>
        Array.from({ length: count }, (_, i) => ({
          index: i,
          start: i * 56,
          size: 56,
          key: String(i),
        })),
      getTotalSize: () => count * 56,
    },
  }),
}));

vi.mock('@/hooks/useTableKeyboardNav', () => ({
  useTableKeyboardNav: () => ({ getRowProps: () => ({}) }),
}));

vi.mock('@/utils/formatting', () => ({
  getInitials: (name: string | null) => (name ? name.charAt(0) : 'L'),
  getAvatarHex: () => '#4A90D9',
  fmtPhone: (p: string) => p,
}));

vi.mock('@/constants/statusConfig', () => ({
  getStatusConfig: () => ({
    label: 'Novo',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-500',
  }),
}));

vi.mock('@/components/ui/ScreenReaderAnnounce', () => ({
  ScreenReaderAnnounce: () => null,
}));

vi.mock('@/features/leads/LeadDrawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'lead-drawer' }, 'Drawer') : null,
}));

import ContatosTable from '../ContatosTable';

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
    nome: 'Joao',
    nome_completo: 'Joao Silva',
    email: 'joao@test.com',
    telefone: '11999990001',
    status: 'novo',
    responsavel_id: 'member-1',
    departamento_id: 'dep-1',
  },
  {
    id: 'lead-2',
    nome: 'Ana',
    nome_completo: 'Ana Costa',
    email: 'ana@test.com',
    telefone: '11999990002',
    status: 'novo',
    responsavel_id: null,
    departamento_id: null,
  },
];

describe('ContatosTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when loading', () => {
    mockUseLeads.mockReturnValue({ leads: [], loading: true, error: null });

    const { container } = render(<ContatosTable />, { wrapper: createWrapper() });

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state with retry button when error occurs', () => {
    mockUseLeads.mockReturnValue({ leads: [], loading: false, error: 'Network error' });

    render(<ContatosTable />, { wrapper: createWrapper() });

    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
    expect(screen.getByText('Recarregar')).toBeInTheDocument();
  });

  it('renders empty state when no contacts exist', () => {
    mockUseLeads.mockReturnValue({ leads: [], loading: false, error: null });

    render(<ContatosTable />, { wrapper: createWrapper() });

    expect(screen.getByText('Nenhum contato encontrado')).toBeInTheDocument();
  });

  it('renders contact rows with correct data', () => {
    mockUseLeads.mockReturnValue({ leads: mockLeads, loading: false, error: null });

    render(<ContatosTable />, { wrapper: createWrapper() });

    expect(screen.getByText('Joao Silva')).toBeInTheDocument();
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    expect(screen.getByText('joao@test.com')).toBeInTheDocument();
  });

  it('filters contacts by search term', () => {
    mockUseLeads.mockReturnValue({ leads: mockLeads, loading: false, error: null });

    render(<ContatosTable />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText('Buscar contatos...');
    fireEvent.change(searchInput, { target: { value: 'Joao' } });

    expect(screen.getByText('Joao Silva')).toBeInTheDocument();
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument();
  });

  it('displays correct count of filtered contacts', () => {
    mockUseLeads.mockReturnValue({ leads: mockLeads, loading: false, error: null });

    render(<ContatosTable />, { wrapper: createWrapper() });

    expect(screen.getByText('2 contatos')).toBeInTheDocument();
  });
});

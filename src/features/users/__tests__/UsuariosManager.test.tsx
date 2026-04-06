import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
    profile: { id: 'user-1', tenant_id: 'tenant-1', role: 'admin' },
    user: { id: 'user-1' },
  }),
}));

const mockUseRBAC = vi.fn();
vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => mockUseRBAC(),
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    usuarios: { all: ['usuarios'] },
  },
}));

const mockSupabaseData = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabaseUntyped: {
    from: () => ({
      select: () => ({
        order: () => ({
          eq: () => mockSupabaseData(),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    }),
  },
}));

vi.mock('@/utils/formatting', () => ({
  getInitials: (name: string) => name.charAt(0),
  getAvatarHex: () => '#4A90D9',
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title, description }: { title: string; description?: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' },
      React.createElement('span', null, title),
      description && React.createElement('p', null, description),
    ),
}));

vi.mock('@/components/ErrorState', () => ({
  default: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'error-state' }, title),
}));

vi.mock('../components/NovoUsuarioForm', () => ({
  default: () => React.createElement('div', { 'data-testid': 'novo-usuario-form' }, 'Novo Form'),
}));

vi.mock('../components/EditarUsuarioForm', () => ({
  default: () => React.createElement('div', { 'data-testid': 'editar-usuario-form' }, 'Editar Form'),
}));

vi.mock('../components/GerenciarPermissoesForm', () => ({
  default: () => React.createElement('div', { 'data-testid': 'permissoes-form' }, 'Permissoes Form'),
}));

import UsuariosManager from '../UsuariosManager';

const mockUsuarios = [
  {
    id: 'u-1',
    nome_completo: 'Carlos Advogado',
    email: 'carlos@jurify.com',
    cargo: 'Advogado Senior',
    ativo: true,
    data_ultimo_acesso: '2026-04-01T10:00:00Z',
    user_roles: [{ role: 'advogado', ativo: true }],
  },
  {
    id: 'u-2',
    nome_completo: 'Ana Suporte',
    email: 'ana@jurify.com',
    cargo: 'Atendente',
    ativo: false,
    data_ultimo_acesso: null,
    user_roles: [{ role: 'suporte', ativo: true }],
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  // Pre-populate the query cache to avoid triggering the actual query
  queryClient.setQueryData(['usuarios'], mockUsuarios);
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, children),
    );
}

function createEmptyWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['usuarios'], []);
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('UsuariosManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRBAC.mockReturnValue({
      can: () => true,
      canDeleteUsers: true,
      userRole: 'administrador',
    });
    mockSupabaseData.mockResolvedValue({ data: mockUsuarios, error: null });
  });

  it('renders access restricted alert when user lacks permission', () => {
    mockUseRBAC.mockReturnValue({
      can: () => false,
      canDeleteUsers: false,
      userRole: 'suporte',
    });

    render(<UsuariosManager />, { wrapper: createWrapper() });

    expect(screen.getByText(/Acesso Restrito/)).toBeInTheDocument();
  });

  it('renders team member cards with names and emails', async () => {
    render(<UsuariosManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Carlos Advogado')).toBeInTheDocument();
    });
    expect(screen.getByText('carlos@jurify.com')).toBeInTheDocument();
    expect(screen.getByText('Ana Suporte')).toBeInTheDocument();
  });

  it('displays role badges for team members', async () => {
    render(<UsuariosManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Advogado')).toBeInTheDocument();
    });
    expect(screen.getByText('Suporte')).toBeInTheDocument();
  });

  it('renders empty state when no members exist', async () => {
    render(<UsuariosManager />, { wrapper: createEmptyWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  it('filters members by search term', async () => {
    render(<UsuariosManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Carlos Advogado')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar membro/);
    fireEvent.change(searchInput, { target: { value: 'Carlos' } });

    expect(screen.getByText('Carlos Advogado')).toBeInTheDocument();
    expect(screen.queryByText('Ana Suporte')).not.toBeInTheDocument();
  });

  it('shows Adicionar Membro button when user has create permission', async () => {
    render(<UsuariosManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Adicionar Membro')).toBeInTheDocument();
    });
  });
});

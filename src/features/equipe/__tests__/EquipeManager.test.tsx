import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseRBAC = vi.fn();
vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => mockUseRBAC(),
}));

const mockUseTeamMembers = vi.fn();
vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: () => mockUseTeamMembers(),
}));

vi.mock('@/hooks/useDepartamentos', () => ({
  useDepartamentos: () => ({ departamentos: [] }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabaseUntyped: {
    from: () => ({
      select: () => ({
        in: () => ({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title, description }: { title: string; description?: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' },
      React.createElement('h2', null, title),
      description && React.createElement('p', null, description),
    ),
}));

vi.mock('@/components/ErrorState', () => ({
  default: ({ title }: { title?: string }) =>
    React.createElement('div', { 'data-testid': 'error-state' },
      React.createElement('h2', null, title ?? 'Erro ao carregar dados'),
    ),
}));

import EquipeManager from '../EquipeManager';

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

const mockMembers = [
  {
    id: 'user-1',
    nome_completo: 'Ana Oliveira',
    email: 'ana@test.com',
    cargo: 'Advogada Senior',
    telefone: '11999999999',
    role: 'advogado',
    tenant_id: 'tenant-1',
  },
  {
    id: 'user-2',
    nome_completo: 'Carlos Lima',
    email: 'carlos@test.com',
    cargo: null,
    telefone: null,
    role: 'admin',
    tenant_id: 'tenant-1',
  },
];

describe('EquipeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ profile: { tenant_id: 'tenant-1' } });
    mockUseRBAC.mockReturnValue({ isAdmin: true, isManager: false });
  });

  it('renders loading skeletons when loading', () => {
    mockUseTeamMembers.mockReturnValue({
      members: [],
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
      updateMember: vi.fn(),
      isUpdating: false,
    });

    const { container } = render(<EquipeManager />, { wrapper: createWrapper() });

    const skeletons = container.querySelectorAll('.animate-pulse, [class*="Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state when data fails to load', () => {
    mockUseTeamMembers.mockReturnValue({
      members: [],
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
      updateMember: vi.fn(),
      isUpdating: false,
    });

    render(<EquipeManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Erro ao carregar equipe')).toBeInTheDocument();
  });

  it('renders empty state when no members exist', () => {
    mockUseTeamMembers.mockReturnValue({
      members: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      updateMember: vi.fn(),
      isUpdating: false,
    });

    render(<EquipeManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Nenhum membro encontrado')).toBeInTheDocument();
  });

  it('renders team member cards with names and emails', () => {
    mockUseTeamMembers.mockReturnValue({
      members: mockMembers,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      updateMember: vi.fn(),
      isUpdating: false,
    });

    render(<EquipeManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Ana Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Carlos Lima')).toBeInTheDocument();
    expect(screen.getByText('ana@test.com')).toBeInTheDocument();
    expect(screen.getByText('Advogada Senior')).toBeInTheDocument();
  });

  it('filters members by search term', () => {
    mockUseTeamMembers.mockReturnValue({
      members: mockMembers,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      updateMember: vi.fn(),
      isUpdating: false,
    });

    render(<EquipeManager />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome/);
    fireEvent.change(searchInput, { target: { value: 'Ana' } });

    expect(screen.getByText('Ana Oliveira')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Lima')).not.toBeInTheDocument();
  });

  it('displays member count metrics', () => {
    mockUseTeamMembers.mockReturnValue({
      members: mockMembers,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      updateMember: vi.fn(),
      isUpdating: false,
    });

    render(<EquipeManager />, { wrapper: createWrapper() });

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Membros')).toBeInTheDocument();
  });
});

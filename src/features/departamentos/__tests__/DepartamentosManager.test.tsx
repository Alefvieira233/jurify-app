import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseDepartamentos = vi.fn();
vi.mock('@/hooks/useDepartamentos', () => ({
  useDepartamentos: () => mockUseDepartamentos(),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => ({
    can: () => true,
  }),
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) =>
    React.createElement('div', { 'data-testid': 'empty-state' },
      React.createElement('span', null, title),
      action ? React.createElement('button', { 'data-testid': 'empty-action', onClick: action.onClick }, action.label) : null,
    ),
}));

vi.mock('@/components/ErrorState', () => ({
  default: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'error-state' }, title),
}));

vi.mock('../DepartamentoForm', () => ({
  default: () => React.createElement('div', { 'data-testid': 'depto-form' }, 'Form'),
}));

vi.mock('../MembrosSection', () => ({
  default: () => React.createElement('div', { 'data-testid': 'membros-section' }, 'Membros'),
}));

import DepartamentosManager from '../DepartamentosManager';

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

const mockDepartamentos = [
  {
    id: 'dept-1',
    nome: 'Comercial',
    descricao: 'Equipe de vendas',
    cor: '#3b82f6',
    ativo: true,
    membros_count: 5,
    tenant_id: 'tenant-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'dept-2',
    nome: 'Jurídico Cível',
    descricao: 'Processos civeis',
    cor: '#10b981',
    ativo: true,
    membros_count: 3,
    tenant_id: 'tenant-1',
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'dept-3',
    nome: 'Financeiro',
    descricao: null,
    cor: '#f59e0b',
    ativo: false,
    membros_count: 0,
    tenant_id: 'tenant-1',
    created_at: '2026-01-03T00:00:00Z',
    updated_at: '2026-01-03T00:00:00Z',
  },
];

describe('DepartamentosManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons when loading', () => {
    mockUseDepartamentos.mockReturnValue({
      departamentos: [],
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
      deleteDepto: vi.fn(),
    });

    const { container } = render(<DepartamentosManager />, { wrapper: createWrapper() });
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [class*="Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no departments exist', () => {
    mockUseDepartamentos.mockReturnValue({
      departamentos: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteDepto: vi.fn(),
    });

    render(<DepartamentosManager />, { wrapper: createWrapper() });

    expect(screen.getByTestId('empty-state')).toHaveTextContent('Nenhum departamento criado');
  });

  it('renders error state on failure', () => {
    mockUseDepartamentos.mockReturnValue({
      departamentos: [],
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
      deleteDepto: vi.fn(),
    });

    render(<DepartamentosManager />, { wrapper: createWrapper() });

    expect(screen.getByTestId('error-state')).toHaveTextContent('Erro ao carregar departamentos');
  });

  it('renders department cards with correct data', () => {
    mockUseDepartamentos.mockReturnValue({
      departamentos: mockDepartamentos,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteDepto: vi.fn(),
    });

    render(<DepartamentosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Comercial')).toBeInTheDocument();
    expect(screen.getByText('Jurídico Cível')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Equipe de vendas')).toBeInTheDocument();
    expect(screen.getByText('5 membros')).toBeInTheDocument();
    expect(screen.getByText('3 membros')).toBeInTheDocument();
  });

  it('displays area count and total members in metrics bar', () => {
    mockUseDepartamentos.mockReturnValue({
      departamentos: mockDepartamentos,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteDepto: vi.fn(),
    });

    render(<DepartamentosManager />, { wrapper: createWrapper() });

    // Areas count = 3
    expect(screen.getByText('3')).toBeInTheDocument();
    // Total membros = 5 + 3 + 0 = 8
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('shows Novo Departamento button when user has create permission', () => {
    mockUseDepartamentos.mockReturnValue({
      departamentos: mockDepartamentos,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteDepto: vi.fn(),
    });

    render(<DepartamentosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Novo Departamento')).toBeInTheDocument();
  });

  it('search filters departments by name', () => {
    mockUseDepartamentos.mockReturnValue({
      departamentos: mockDepartamentos,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteDepto: vi.fn(),
    });

    render(<DepartamentosManager />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/Buscar departamento/);
    fireEvent.change(searchInput, { target: { value: 'Comercial' } });

    expect(screen.getByText('Comercial')).toBeInTheDocument();
    expect(screen.queryByText('Jurídico Cível')).not.toBeInTheDocument();
    expect(screen.queryByText('Financeiro')).not.toBeInTheDocument();
  });
});

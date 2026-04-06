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

const mockUseRBAC = vi.fn();
vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => mockUseRBAC(),
}));

const mockUseTags = vi.fn();
vi.mock('@/hooks/useTags', () => ({
  useTags: () => mockUseTags(),
}));

vi.mock('@/types/crm-operacional', () => ({
  TAG_CATEGORIAS: ['prioridade', 'temperatura', 'operacional', 'qualificacao'],
}));

vi.mock('@/features/tags/TagForm', () => ({
  TagForm: ({ tag }: { tag: { nome: string } | null }) =>
    React.createElement('div', { 'data-testid': 'tag-form' }, tag ? `Edit ${tag.nome}` : 'New'),
}));

import { TagsManager } from '../TagsManager';

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

const mockTags = [
  {
    id: 'tag-1',
    nome: 'Urgente',
    cor: '#FF0000',
    categoria: 'prioridade',
    ativo: true,
    ordem: 1,
    tenant_id: 'tenant-1',
  },
  {
    id: 'tag-2',
    nome: 'Frio',
    cor: '#0000FF',
    categoria: 'temperatura',
    ativo: true,
    ordem: 2,
    tenant_id: 'tenant-1',
  },
  {
    id: 'tag-3',
    nome: 'Inativa',
    cor: '#999999',
    categoria: null,
    ativo: false,
    ordem: 3,
    tenant_id: 'tenant-1',
  },
];

describe('TagsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRBAC.mockReturnValue({ can: () => true });
  });

  it('renders empty state when no tags exist', () => {
    mockUseTags.mockReturnValue({
      tags: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteTag: vi.fn(),
    });

    render(<TagsManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Nenhuma tag encontrada')).toBeInTheDocument();
  });

  it('renders tag items with names and categories', () => {
    mockUseTags.mockReturnValue({
      tags: mockTags,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteTag: vi.fn(),
    });

    render(<TagsManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Urgente')).toBeInTheDocument();
    expect(screen.getByText('Frio')).toBeInTheDocument();
    expect(screen.getByText('Prioridade')).toBeInTheDocument();
    expect(screen.getByText('Temperatura')).toBeInTheDocument();
  });

  it('shows inactive badge for inactive tags', () => {
    mockUseTags.mockReturnValue({
      tags: mockTags,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteTag: vi.fn(),
    });

    render(<TagsManager />, { wrapper: createWrapper() });

    // The tag named "Inativa" appears as the tag name AND as the inactive badge
    const inativaElements = screen.getAllByText('Inativa');
    expect(inativaElements.length).toBeGreaterThanOrEqual(2);
  });

  it('shows Nova Tag button when user has create permission', () => {
    mockUseTags.mockReturnValue({
      tags: mockTags,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteTag: vi.fn(),
    });

    render(<TagsManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Nova Tag')).toBeInTheDocument();
  });

  it('renders edit buttons for each tag', () => {
    mockUseTags.mockReturnValue({
      tags: mockTags,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteTag: vi.fn(),
    });

    render(<TagsManager />, { wrapper: createWrapper() });

    const editButtons = screen.getAllByLabelText(/Editar tag/);
    expect(editButtons).toHaveLength(3);
  });

  it('renders delete buttons when user has permission', () => {
    mockUseTags.mockReturnValue({
      tags: mockTags,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteTag: vi.fn(),
    });

    render(<TagsManager />, { wrapper: createWrapper() });

    const deleteButtons = screen.getAllByLabelText(/Remover tag/);
    expect(deleteButtons).toHaveLength(3);
  });

  it('hides delete buttons when user lacks permission', () => {
    mockUseRBAC.mockReturnValue({ can: (resource: string, action: string) => action !== 'delete' });
    mockUseTags.mockReturnValue({
      tags: mockTags,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      deleteTag: vi.fn(),
    });

    render(<TagsManager />, { wrapper: createWrapper() });

    expect(screen.queryByLabelText(/Remover tag/)).not.toBeInTheDocument();
  });
});

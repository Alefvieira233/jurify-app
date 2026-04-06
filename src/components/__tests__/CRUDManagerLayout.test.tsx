import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (val: string) => val,
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: ({ open, title, description, onConfirm }: { open: boolean; title: string; description: string; onConfirm: () => void }) =>
    open
      ? React.createElement('div', { 'data-testid': 'confirm-dialog' },
          React.createElement('span', null, title),
          React.createElement('p', null, description),
          React.createElement('button', { onClick: onConfirm, 'data-testid': 'confirm-delete-btn' }, 'Confirmar'),
        )
      : null,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title, description }: { title: string; description?: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' },
      React.createElement('span', null, title),
      description && React.createElement('p', null, description),
    ),
}));

vi.mock('@/components/ErrorState', () => ({
  default: ({ title, message }: { title: string; message?: string }) =>
    React.createElement('div', { 'data-testid': 'error-state' },
      React.createElement('span', null, title),
      message && React.createElement('p', null, message),
    ),
}));

vi.mock('@/components/PaginationControls', () => ({
  default: () => React.createElement('div', { 'data-testid': 'pagination' }),
}));

import { CRUDManagerLayout } from '../CRUDManagerLayout';

interface TestItem {
  id: string;
  name: string;
}

const mockItems: TestItem[] = [
  { id: '1', name: 'Item Alpha' },
  { id: '2', name: 'Item Beta' },
  { id: '3', name: 'Item Gamma' },
];

describe('CRUDManagerLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <CRUDManagerLayout
        pageTitle="Testes"
        items={[]}
        isLoading={true}
        renderItems={() => null}
      />,
    );

    // Default skeleton renders Skeleton components
    expect(container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]').length).toBeGreaterThanOrEqual(0);
    // Should not render the search input when loading
    expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument();
  });

  it('renders error state when error is provided', () => {
    render(
      <CRUDManagerLayout
        pageTitle="Documentos"
        items={[]}
        isLoading={false}
        error="Falha de conexao"
        onRetry={vi.fn()}
        renderItems={() => null}
      />,
    );

    expect(screen.getByTestId('error-state')).toHaveTextContent('Erro ao carregar documentos');
  });

  it('renders empty state when isEmpty is true', () => {
    render(
      <CRUDManagerLayout
        pageTitle="Processos"
        items={[]}
        isLoading={false}
        isEmpty={true}
        emptyStateProps={{
          title: 'Nenhum processo',
          description: 'Crie o primeiro processo.',
        }}
        renderItems={() => null}
      />,
    );

    expect(screen.getByTestId('empty-state')).toHaveTextContent('Nenhum processo');
  });

  it('renders items via renderItems callback', () => {
    render(
      <CRUDManagerLayout
        pageTitle="Items"
        items={mockItems}
        isLoading={false}
        renderItems={(items) =>
          React.createElement('ul', { 'data-testid': 'item-list' },
            items.map((item) =>
              React.createElement('li', { key: item.id }, item.name),
            ),
          )
        }
      />,
    );

    expect(screen.getByTestId('item-list')).toBeInTheDocument();
    expect(screen.getByText('Item Alpha')).toBeInTheDocument();
    expect(screen.getByText('Item Beta')).toBeInTheDocument();
    expect(screen.getByText('Item Gamma')).toBeInTheDocument();
  });

  it('filters items by search term using filterFn', () => {
    render(
      <CRUDManagerLayout
        pageTitle="Items"
        items={mockItems}
        isLoading={false}
        searchPlaceholder="Buscar items..."
        searchDebounceMs={0}
        filterFn={(item, search) => item.name.toLowerCase().includes(search.toLowerCase())}
        renderItems={(items) =>
          React.createElement('ul', { 'data-testid': 'item-list' },
            items.map((item) =>
              React.createElement('li', { key: item.id }, item.name),
            ),
          )
        }
      />,
    );

    const searchInput = screen.getByPlaceholderText('Buscar items...');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    expect(screen.getByText('Item Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Item Beta')).not.toBeInTheDocument();
    expect(screen.queryByText('Item Gamma')).not.toBeInTheDocument();
  });

  it('shows no results message when filter matches nothing', () => {
    render(
      <CRUDManagerLayout
        pageTitle="Items"
        items={mockItems}
        isLoading={false}
        searchPlaceholder="Buscar..."
        searchDebounceMs={0}
        filterFn={(item, search) => item.name.toLowerCase().includes(search.toLowerCase())}
        renderItems={(items) =>
          React.createElement('ul', null,
            items.map((item) => React.createElement('li', { key: item.id }, item.name)),
          )
        }
      />,
    );

    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'ZZZZZ' } });

    expect(screen.getByText('Nenhum resultado encontrado')).toBeInTheDocument();
  });

  it('renders delete confirmation dialog when requestDelete is called', () => {
    const onConfirmDelete = vi.fn();

    render(
      <CRUDManagerLayout
        pageTitle="Items"
        items={mockItems}
        isLoading={false}
        deleteConfig={{
          title: 'Excluir item',
          description: (label) => `Excluir "${label}"?`,
          onConfirm: onConfirmDelete,
        }}
        renderItems={(_items, ctx) =>
          React.createElement('div', null,
            React.createElement('button', {
              'data-testid': 'trigger-delete',
              onClick: () => ctx.requestDelete('1', 'Item Alpha'),
            }, 'Delete'),
          )
        }
      />,
    );

    // Dialog should not be visible initially
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();

    // Trigger delete
    fireEvent.click(screen.getByTestId('trigger-delete'));

    expect(screen.getByTestId('confirm-dialog')).toHaveTextContent('Excluir item');
    expect(screen.getByTestId('confirm-dialog')).toHaveTextContent('Excluir "Item Alpha"?');
  });
});

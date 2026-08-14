import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState Component', () => {
  it('renders title and description correctly without action button', () => {
    render(<EmptyState title="Nenhum item encontrado" description="Tente buscar novamente" />);
    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
    expect(screen.getByText('Tente buscar novamente')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders action button and triggers onClick callback when clicked', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="Nenhum registro"
        description="Crie um novo item"
        action={{
          label: 'Criar Item',
          onClick: handleAction,
        }}
      />
    );

    const button = screen.getByRole('button', { name: /criar item/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

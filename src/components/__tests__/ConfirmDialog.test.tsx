import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';

describe('ConfirmDialog Component', () => {
  it('renders title and description when open', () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
        onConfirm={handleConfirm}
      />
    );

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Delete Item"
        description="This action cannot be undone."
        onConfirm={handleConfirm}
      />
    );

    const confirmBtn = screen.getByText('Confirmar');
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});

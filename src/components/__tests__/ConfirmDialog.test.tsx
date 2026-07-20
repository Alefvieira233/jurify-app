import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';
import { vi, describe, it, expect } from 'vitest';

describe('ConfirmDialog Component', () => {
  it('renders title and description when open', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Are you sure?"
        description="This action cannot be undone."
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm is clicked', () => {
    const onConfirmMock = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Are you sure?"
        description="This action cannot be undone."
        onConfirm={onConfirmMock}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirmar' });
    fireEvent.click(confirmButton);
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });
});

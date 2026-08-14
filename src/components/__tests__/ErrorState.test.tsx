import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from '../ErrorState';

describe('ErrorState Component', () => {
  it('renders default title and no message or retry button when not provided', () => {
    render(<ErrorState />);
    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders custom title, message and handles onRetry click', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Custom Error Title"
        message="Detailed error message"
        onRetry={handleRetry}
      />
    );

    expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
    expect(screen.getByText('Detailed error message')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /tentar novamente/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});

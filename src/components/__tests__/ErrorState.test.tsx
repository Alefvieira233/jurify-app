import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from '../ErrorState';
import { describe, it, expect, vi } from 'vitest';

describe('ErrorState', () => {
  it('renders default title and provided message', () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onRetry callback when retry button is clicked', () => {
    const onRetryMock = vi.fn();
    render(<ErrorState onRetry={onRetryMock} />);
    const button = screen.getByRole('button', { name: /tentar novamente/i });
    fireEvent.click(button);
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });
});

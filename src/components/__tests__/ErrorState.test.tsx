import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from '../ErrorState';
import { vi, describe, it, expect } from 'vitest';

describe('ErrorState Component', () => {
  it('renders default title and message correctly', () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom title correctly', () => {
    render(<ErrorState title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('calls onRetry callback when clicked', () => {
    const onRetryMock = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetryMock} />);

    const button = screen.getByRole('button', { name: /tentar novamente/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// vi.hoisted ensures these are available when vi.mock factories run (hoisted above imports)
const { mockCaptureException } = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  captureException: mockCaptureException,
}));

vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  RefreshCw: () => null,
}));

import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error on demand
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="child">Child content</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error from React error boundary logging
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Child content');
  });

  it('should render default fallback UI when an error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
    expect(
      screen.getByText('Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.')
    ).toBeInTheDocument();
    expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
    expect(screen.getByText('Recarregar Página')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toHaveTextContent('Custom error UI');
    expect(screen.queryByText('Ops! Algo deu errado')).not.toBeInTheDocument();
  });

  it('should call Sentry.captureException when an error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({
        contexts: {
          react: {
            componentStack: expect.any(String),
          },
        },
        tags: {
          errorBoundary: true,
        },
      })
    );
  });

  it('should reset error state when "Tentar Novamente" button is clicked', () => {
    const TestWrapper = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <div>
          <button data-testid="toggle" onClick={() => setShouldThrow(false)}>
            Fix
          </button>
          <ErrorBoundary>
            <ThrowError shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </div>
      );
    };

    render(<TestWrapper />);

    // Error UI is shown
    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();

    // Fix the child so it won't throw again
    fireEvent.click(screen.getByTestId('toggle'));

    // Click "Tentar Novamente" to reset the error boundary
    fireEvent.click(screen.getByText('Tentar Novamente'));

    // Child should render again
    expect(screen.getByTestId('child')).toHaveTextContent('Child content');
    expect(screen.queryByText('Ops! Algo deu errado')).not.toBeInTheDocument();
  });

  it('should call window.location.reload when "Recarregar Página" button is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Recarregar Página'));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});

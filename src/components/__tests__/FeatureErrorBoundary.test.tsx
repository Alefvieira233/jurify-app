import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const { mockCaptureException } = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  captureException: mockCaptureException,
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  RefreshCw: () => null,
}));

import { FeatureErrorBoundary } from '../FeatureErrorBoundary';

// Component that throws on demand
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Component crashed');
  }
  return <div data-testid="child">Working content</div>;
};

describe('FeatureErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children normally when no error occurs', () => {
    render(
      <FeatureErrorBoundary feature="Dashboard">
        <ThrowError shouldThrow={false} />
      </FeatureErrorBoundary>,
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Working content');
  });

  it('shows error UI when child throws an error', () => {
    render(
      <FeatureErrorBoundary feature="Processos">
        <ThrowError shouldThrow={true} />
      </FeatureErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Ocorreu um erro inesperado/)).toBeInTheDocument();
  });

  it('displays feature name in the error message', () => {
    render(
      <FeatureErrorBoundary feature="Contratos">
        <ThrowError shouldThrow={true} />
      </FeatureErrorBoundary>,
    );

    expect(screen.getByText('Erro em Contratos')).toBeInTheDocument();
  });

  it('calls Sentry.captureException with feature context', () => {
    render(
      <FeatureErrorBoundary feature="Leads">
        <ThrowError shouldThrow={true} />
      </FeatureErrorBoundary>,
    );

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Component crashed' }),
      expect.objectContaining({
        tags: expect.objectContaining({
          errorBoundary: 'feature',
          feature: 'Leads',
        }),
      }),
    );
  });

  it('resets error state when "Recarregar secao" button is clicked', () => {
    const TestWrapper = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <div>
          <button data-testid="fix" onClick={() => setShouldThrow(false)}>Fix</button>
          <FeatureErrorBoundary feature="Timeline">
            <ThrowError shouldThrow={shouldThrow} />
          </FeatureErrorBoundary>
        </div>
      );
    };

    render(<TestWrapper />);

    // Error UI should be displayed
    expect(screen.getByText('Erro em Timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();

    // Fix the child component
    fireEvent.click(screen.getByTestId('fix'));

    // Reset the boundary
    fireEvent.click(screen.getByText('Recarregar secao'));

    // Child should render again
    expect(screen.getByTestId('child')).toHaveTextContent('Working content');
    expect(screen.queryByText('Erro em Timeline')).not.toBeInTheDocument();
  });
});

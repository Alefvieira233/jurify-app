import { render, screen } from '@testing-library/react';
import LoadingState from '../LoadingState';
import { describe, it, expect } from 'vitest';

describe('LoadingState Component', () => {
  it('renders default text correctly', () => {
    render(<LoadingState />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders custom text correctly', () => {
    render(<LoadingState text="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('does not render spinner when showSpinner is false', () => {
    const { container } = render(<LoadingState showSpinner={false} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});

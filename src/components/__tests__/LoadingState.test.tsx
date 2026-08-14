import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingState from '../LoadingState';

describe('LoadingState Component', () => {
  it('renders default text when no text prop is passed', () => {
    render(<LoadingState />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders custom text when passed', () => {
    render(<LoadingState text="Carregando dados..." />);
    expect(screen.getByText('Carregando dados...')).toBeInTheDocument();
  });
});

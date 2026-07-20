import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumbs from '../Breadcrumbs';
import { describe, it, expect } from 'vitest';

describe('Breadcrumbs Component', () => {
  it('returns null on root path', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders segments correctly', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/configuracoes']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
  });

  it('handles unknown segments gracefully', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/unknown-seg']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Unknown-seg')).toBeInTheDocument();
  });
});

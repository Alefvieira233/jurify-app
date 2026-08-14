import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumbs from '../Breadcrumbs';

describe('Breadcrumbs Component', () => {
  it('renders breadcrumb items based on current path', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/processos']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Processos')).toBeInTheDocument();
  });
});

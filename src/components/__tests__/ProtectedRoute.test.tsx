import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

// Track Navigate calls
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Navigate: (props: { to: string; replace?: boolean }) => {
      navigateMock(props);
      return <div data-testid="navigate" data-to={props.to} />;
    },
  };
});

// Default: authenticated admin
const mockAuth = {
  user: { id: 'u1', email: 'admin@test.com' },
  profile: { id: 'u1', tenant_id: 't1', role: 'admin' },
  loading: false,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

function renderRoute(requiredRoles?: string[]) {
  return render(
    <MemoryRouter>
      <ProtectedRoute requiredRoles={requiredRoles as any}>
        <div data-testid="protected-content">Protected</div>
      </ProtectedRoute>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to authenticated admin
    mockAuth.user = { id: 'u1', email: 'admin@test.com' } as any;
    mockAuth.profile = { id: 'u1', tenant_id: 't1', role: 'admin' } as any;
    mockAuth.loading = false;
  });

  // --- Auth states ---

  it('shows loading spinner while checking auth', () => {
    mockAuth.loading = true;
    renderRoute();
    const matches = screen.getAllByText(/verificando autenticação/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to /auth when user is null', () => {
    mockAuth.user = null as any;
    renderRoute();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/auth');
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated and no roles required', () => {
    renderRoute();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  // --- RBAC ---

  it('renders children when user role is in requiredRoles', () => {
    renderRoute(['admin', 'manager']);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows access denied when user role is NOT in requiredRoles', () => {
    mockAuth.profile = { id: 'u1', tenant_id: 't1', role: 'viewer' } as any;
    renderRoute(['admin', 'manager']);
    expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('defaults to viewer role when profile.role is undefined', () => {
    mockAuth.profile = { id: 'u1', tenant_id: 't1', role: undefined } as any;
    renderRoute(['admin']);
    expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
  });

  it('passes when requiredRoles is empty array (no restriction)', () => {
    mockAuth.profile = { id: 'u1', tenant_id: 't1', role: 'viewer' } as any;
    renderRoute([]);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('access denied message has proper ARIA attributes', () => {
    mockAuth.profile = { id: 'u1', tenant_id: 't1', role: 'viewer' } as any;
    renderRoute(['admin']);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});

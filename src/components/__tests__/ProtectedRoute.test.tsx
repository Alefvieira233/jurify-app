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

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => {
    const DB_ROLE_TO_RBAC: Record<string, string> = {
      administrador: 'admin', advogado: 'user', comercial: 'user',
      pos_venda: 'user', suporte: 'viewer',
      admin: 'admin', manager: 'manager', user: 'user', viewer: 'viewer',
    };
    const role = DB_ROLE_TO_RBAC[mockAuth.profile?.role ?? ''] ?? 'viewer';
    return {
      userRole: role,
      isAdmin: role === 'admin',
      isManager: role === 'manager',
      isUser: role === 'user',
      isViewer: role === 'viewer',
      can: () => false,
      canAccessResource: () => false,
      canAll: () => false,
      canAny: () => false,
      canManageUsers: role === 'admin',
      canDeleteUsers: role === 'admin',
      canManageConfig: role === 'admin',
      canViewLogs: role === 'admin' || role === 'manager',
      canExecuteAgents: false,
      canManageIntegrations: false,
      canInDepartment: () => false,
      getUserDepartamentos: () => [],
      getLeadVisibilityScope: () => 'own' as const,
      user: mockAuth.user,
      profile: mockAuth.profile,
    };
  },
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

  it('shows loading spinner while checking auth (initial load, no user yet)', () => {
    mockAuth.loading = true;
    mockAuth.user = null as any;
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

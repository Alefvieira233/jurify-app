import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock AuthContext before importing useRBAC
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { useRBAC, usePermission } from '../useRBAC';
import { ROLE_PERMISSIONS } from '@/types/rbac';
import type { User } from '@supabase/supabase-js';

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

describe('useRBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user has no profile', () => {
    it('should return false for can() when profile is null', () => {
      mockUseAuth.mockReturnValue({ user: mockUser, profile: null });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('leads', 'read')).toBe(false);
    });

    it('should return false for can() when user is null', () => {
      mockUseAuth.mockReturnValue({ user: null, profile: null });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('leads', 'read')).toBe(false);
    });

    it('should default userRole to viewer when role is missing', () => {
      mockUseAuth.mockReturnValue({ user: mockUser, profile: { role: undefined } });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.userRole).toBe('viewer');
    });
  });

  describe('admin role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'admin-id', role: 'admin' },
      });
    });

    it('should have full CRUD on leads', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('leads', 'create')).toBe(true);
      expect(result.current.can('leads', 'read')).toBe(true);
      expect(result.current.can('leads', 'update')).toBe(true);
      expect(result.current.can('leads', 'delete')).toBe(true);
    });

    it('should be able to manage usuarios', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('usuarios', 'manage')).toBe(true);
      expect(result.current.can('usuarios', 'delete')).toBe(true);
      expect(result.current.canManageUsers).toBe(true);
      expect(result.current.canDeleteUsers).toBe(true);
    });

    it('should manage configuracoes', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('configuracoes', 'manage')).toBe(true);
      expect(result.current.canManageConfig).toBe(true);
    });

    it('should read logs', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canViewLogs).toBe(true);
    });

    it('should execute agentes_ia', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canExecuteAgents).toBe(true);
    });

    it('should manage integracoes', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canManageIntegrations).toBe(true);
    });

    it('should report isAdmin true', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isManager).toBe(false);
      expect(result.current.isUser).toBe(false);
      expect(result.current.isViewer).toBe(false);
    });
  });

  describe('viewer role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'viewer-id', role: 'viewer' },
      });
    });

    it('should only read leads, not create/update/delete', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('leads', 'read')).toBe(true);
      expect(result.current.can('leads', 'create')).toBe(false);
      expect(result.current.can('leads', 'update')).toBe(false);
      expect(result.current.can('leads', 'delete')).toBe(false);
    });

    it('should not access usuarios or configuracoes', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('usuarios', 'read')).toBe(false);
      expect(result.current.can('configuracoes', 'read')).toBe(false);
    });

    it('should not manage anything', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canManageUsers).toBe(false);
      expect(result.current.canDeleteUsers).toBe(false);
      expect(result.current.canManageConfig).toBe(false);
      expect(result.current.canManageIntegrations).toBe(false);
    });

    it('should report isViewer true', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.isViewer).toBe(true);
      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe('manager role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'manager-id', role: 'manager' },
      });
    });

    it('should have full CRUD on leads', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('leads', 'create')).toBe(true);
      expect(result.current.can('leads', 'read')).toBe(true);
      expect(result.current.can('leads', 'update')).toBe(true);
      expect(result.current.can('leads', 'delete')).toBe(true);
    });

    it('should only read usuarios, not manage', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('usuarios', 'read')).toBe(true);
      expect(result.current.can('usuarios', 'manage')).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
    });

    it('should only read configuracoes, not manage', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('configuracoes', 'read')).toBe(true);
      expect(result.current.can('configuracoes', 'manage')).toBe(false);
    });

    it('should report isManager true', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.isManager).toBe(true);
    });
  });

  describe('user role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'user-id', role: 'user' },
      });
    });

    it('should create/read/update leads but not delete', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('leads', 'create')).toBe(true);
      expect(result.current.can('leads', 'read')).toBe(true);
      expect(result.current.can('leads', 'update')).toBe(true);
      expect(result.current.can('leads', 'delete')).toBe(false);
    });

    it('should not access logs or integracoes', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.can('logs', 'read')).toBe(false);
      expect(result.current.can('integracoes', 'read')).toBe(false);
      expect(result.current.canViewLogs).toBe(false);
    });

    it('should report isUser true', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.current.isUser).toBe(true);
    });
  });

  describe('canAll()', () => {
    it('should return true when user has all requested actions', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'admin-id', role: 'admin' },
      });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canAll('leads', ['create', 'read', 'update', 'delete'])).toBe(true);
    });

    it('should return false when user is missing at least one action', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'viewer-id', role: 'viewer' },
      });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canAll('leads', ['read', 'create'])).toBe(false);
    });

    it('should return true for empty actions array', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'viewer-id', role: 'viewer' },
      });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canAll('leads', [])).toBe(true);
    });
  });

  describe('canAny()', () => {
    it('should return true when user has at least one requested action', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'viewer-id', role: 'viewer' },
      });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canAny('leads', ['read', 'delete'])).toBe(true);
    });

    it('should return false when user has none of the requested actions', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'viewer-id', role: 'viewer' },
      });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canAny('usuarios', ['create', 'manage'])).toBe(false);
    });

    it('should return false for empty actions array', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'admin-id', role: 'admin' },
      });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canAny('leads', [])).toBe(false);
    });
  });

  describe('canAccessResource()', () => {
    it('should return true when resource has any actions', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'admin-id', role: 'admin' },
      });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canAccessResource('leads')).toBe(true);
    });

    it('should return false when resource has empty actions', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { id: 'user-id', role: 'user' },
      });
      const { result } = renderHook(() => useRBAC());

      // user role has empty actions for logs
      expect(result.current.canAccessResource('logs')).toBe(false);
    });

    it('should return false when no user/profile', () => {
      mockUseAuth.mockReturnValue({ user: null, profile: null });
      const { result } = renderHook(() => useRBAC());

      expect(result.current.canAccessResource('leads')).toBe(false);
    });
  });
});

describe('usePermission', () => {
  it('should return the result of can() for given resource and action', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: { id: 'admin-id', role: 'admin' },
    });
    const { result } = renderHook(() => usePermission('leads', 'delete'));

    expect(result.current).toBe(true);
  });

  it('should return false for unauthorized action', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: { id: 'viewer-id', role: 'viewer' },
    });
    const { result } = renderHook(() => usePermission('leads', 'delete'));

    expect(result.current).toBe(false);
  });
});

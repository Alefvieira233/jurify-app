import { useAuth } from '@/contexts/AuthContext';
import { UserRole, Resource, Action, ROLE_PERMISSIONS } from '@/types/rbac';

/**
 * RBAC permission helper.
 */
export const useRBAC = () => {
  const { user, profile } = useAuth();

  // Default to viewer when role is missing.
  const userRole: UserRole = (profile?.role as UserRole) || 'viewer';

  const can = (resource: Resource, action: Action): boolean => {
    if (!user || !profile) {
      return false;
    }

    const permissions = ROLE_PERMISSIONS[userRole];
    const resourcePermission = permissions.find(p => p.resource === resource);

    return resourcePermission?.actions.includes(action) ?? false;
  };

  const canAccessResource = (resource: Resource): boolean => {
    if (!user || !profile) {
      return false;
    }

    const permissions = ROLE_PERMISSIONS[userRole];
    const resourcePermission = permissions.find(p => p.resource === resource);

    return (resourcePermission?.actions.length ?? 0) > 0;
  };

  const canAll = (resource: Resource, actions: Action[]): boolean => {
    return actions.every(action => can(resource, action));
  };

  const canAny = (resource: Resource, actions: Action[]): boolean => {
    return actions.some(action => can(resource, action));
  };

  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const isUser = userRole === 'user';
  const isViewer = userRole === 'viewer';

  const canManageUsers = can('usuarios', 'manage');
  const canDeleteUsers = can('usuarios', 'delete');
  const canManageConfig = can('configuracoes', 'manage');
  const canViewLogs = can('logs', 'read');
  const canExecuteAgents = can('agentes_ia', 'execute');
  const canManageIntegrations = can('integracoes', 'manage');

  return {
    can,
    canAccessResource,
    canAll,
    canAny,
    userRole,
    isAdmin,
    isManager,
    isUser,
    isViewer,
    canManageUsers,
    canDeleteUsers,
    canManageConfig,
    canViewLogs,
    canExecuteAgents,
    canManageIntegrations,
    user,
    profile,
  };
};

export const usePermission = (resource: Resource, action: Action): boolean => {
  const { can } = useRBAC();
  return can(resource, action);
};
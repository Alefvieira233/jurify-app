import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, Resource, Action, ROLE_PERMISSIONS } from '@/types/rbac';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { DepartamentoMembro } from '@/types/crm-operacional';

type DepartmentAction = 'ver_todos' | 'atribuir' | 'mover' | 'editar' | 'arquivar' | 'metricas' | 'gerenciar';

const ACTION_TO_PERMISSION: Record<DepartmentAction, keyof DepartamentoMembro> = {
  ver_todos: 'pode_ver_todos_leads',
  atribuir: 'pode_atribuir_responsavel',
  mover: 'pode_mover_leads',
  editar: 'pode_editar_propriedades',
  arquivar: 'pode_arquivar',
  metricas: 'pode_ver_metricas',
  gerenciar: 'pode_gerenciar',
};

// Map database roles (app_role enum) to RBAC roles used in the permission matrix.
const DB_ROLE_TO_RBAC: Record<string, UserRole> = {
  administrador: 'admin',
  advogado: 'user',
  comercial: 'user',
  pos_venda: 'user',
  suporte: 'viewer',
  // Direct RBAC roles (for forward-compatibility if DB enum is updated)
  admin: 'admin',
  manager: 'manager',
  user: 'user',
  viewer: 'viewer',
};

/**
 * RBAC permission helper.
 */
export const useRBAC = () => {
  const { user, profile } = useAuth();

  // Map the DB role to an RBAC role; default to viewer when unknown.
  const userRole: UserRole = DB_ROLE_TO_RBAC[profile?.role ?? ''] ?? 'viewer';

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
  const canManageIntegrations = can('integracoes', 'read');

  // ── Department-scoped permission helpers ──

  const userDepartamentosQuery = useQuery({
    queryKey: queryKeys.userDepartamentos.list(profile?.id),
    queryFn: async (): Promise<DepartamentoMembro[]> => {
      const { data, error } = await supabase
        .from('departamento_membros')
        .select('*')
        .eq('profile_id', profile!.id);
      if (error) throw error;
      return (data ?? []) as DepartamentoMembro[];
    },
    enabled: !!profile?.id,
  });

  const userMemberships = userDepartamentosQuery.data ?? [];

  const canInDepartment = (departamentoId: string, action: string): boolean => {
    if (!user || !profile) return false;
    if (userRole === 'admin') return true;

    const permKey = ACTION_TO_PERMISSION[action as DepartmentAction];
    if (!permKey) return false;

    const membership = userMemberships.find(
      (m) => m.departamento_id === departamentoId
    );
    if (!membership) return false;

    return !!membership[permKey];
  };

  const getUserDepartamentos = (): string[] => {
    return userMemberships.map((m) => m.departamento_id);
  };

  const getLeadVisibilityScope = (): 'own' | 'department' | 'all' => {
    if (userRole === 'admin' || userRole === 'manager') return 'all';

    const hasDeptoVisibility = userMemberships.some(
      (m) => m.pode_ver_todos_leads
    );
    if (hasDeptoVisibility) return 'department';

    return 'own';
  };

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
    canInDepartment,
    getUserDepartamentos,
    getLeadVisibilityScope,
    user,
    profile,
  };
};

export const usePermission = (resource: Resource, action: Action): boolean => {
  const { can } = useRBAC();
  return can(resource, action);
};
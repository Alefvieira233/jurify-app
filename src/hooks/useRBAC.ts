import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, Resource, Action, ROLE_PERMISSIONS } from '@/types/rbac';
import { supabaseUntyped } from '@/integrations/supabase/client';
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
  const canManageIntegrations = can('integracoes', 'read');

  // ── Department-scoped permission helpers ──

  const userDepartamentosQuery = useQuery({
    queryKey: ['user_departamentos', profile?.id],
    queryFn: async (): Promise<DepartamentoMembro[]> => {
      const { data, error } = await supabaseUntyped
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
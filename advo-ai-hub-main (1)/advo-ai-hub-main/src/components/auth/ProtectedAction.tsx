import React, { ReactNode } from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import { Resource, Action } from '@/types/rbac';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface ProtectedActionProps {
  resource: Resource;
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;
  showMessage?: boolean;
}

/**
 * Componente para proteger ações baseado em RBAC
 *
 * @example
 * <ProtectedAction resource="usuarios" action="delete">
 *   <Button>Deletar Usuário</Button>
 * </ProtectedAction>
 *
 * @example
 * <ProtectedAction
 *   resource="configuracoes"
 *   action="manage"
 *   fallback={<p>Sem permissão</p>}
 * >
 *   <ConfiguracoesForm />
 * </ProtectedAction>
 */
export const ProtectedAction: React.FC<ProtectedActionProps> = ({
  resource,
  action,
  children,
  fallback,
  showMessage = false,
}) => {
  const { can } = useRBAC();

  const hasPermission = can(resource, action);

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showMessage) {
      return (
        <Alert variant="destructive" className="my-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para executar esta ação.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
};

interface ProtectedSectionProps {
  resource: Resource;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente para proteger seções inteiras baseado em acesso ao recurso
 *
 * @example
 * <ProtectedSection resource="logs">
 *   <LogsPanel />
 * </ProtectedSection>
 */
export const ProtectedSection: React.FC<ProtectedSectionProps> = ({
  resource,
  children,
  fallback,
}) => {
  const { canAccessResource } = useRBAC();

  const hasAccess = canAccessResource(resource);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar esta seção.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};

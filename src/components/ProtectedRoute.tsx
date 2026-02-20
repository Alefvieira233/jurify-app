import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/rbac';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, loading, profile } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return <LoadingSpinner fullScreen text="Verificando autenticação..." />;
  }

  // If no user authenticated, redirect to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If specific roles are required, check user role
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = (profile?.role as UserRole) || 'viewer';
    if (!requiredRoles.includes(userRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen" role="alert" aria-live="assertive">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground mb-4">
              Você não tem permissão para acessar esta página.
            </p>
            <p className="text-sm text-muted-foreground">
              Acesso não autorizado. Contate o administrador.
            </p>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;

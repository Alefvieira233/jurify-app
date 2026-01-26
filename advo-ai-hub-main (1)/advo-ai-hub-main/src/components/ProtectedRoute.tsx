
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return <LoadingSpinner fullScreen text="Verificando autenticação..." />;
  }

  // If no user authenticated, redirect to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
};

export default ProtectedRoute;

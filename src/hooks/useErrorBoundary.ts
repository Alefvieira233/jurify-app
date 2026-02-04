
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  userId?: string;
}

export const useErrorBoundary = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const { toast } = useToast();

  const logError = useCallback((error: Error, errorInfo?: { componentStack?: string }) => {
    const errorDetail: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: Date.now(),
    };

    setErrors(prev => [...prev.slice(-9), errorDetail]); // Manter últimos 10 erros

    console.error('🚨 [ErrorBoundary] Erro capturado:', errorDetail);

    // Em produção, enviar para serviço de monitoramento
    if (process.env.NODE_ENV === 'production') {
      // Implementar envio para Sentry, LogRocket, etc.
    }

    toast({
      title: 'Erro interno',
      description: 'Um erro inesperado ocorreu. Nossa equipe foi notificada.',
      variant: 'destructive',
    });
  }, [toast]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    logError,
    clearErrors,
    hasErrors: errors.length > 0,
  };
};

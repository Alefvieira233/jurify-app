/**
 * Monitoring & Error Tracking Service
 * 
 * Centraliza logging de erros e métricas
 * Versão simplificada sem JSX para evitar conflitos
 */

interface ErrorContext {
  userId?: string;
  tenantId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

class MonitoringService {
  private isProduction = import.meta.env.PROD;
  private errors: Array<{ error: Error; context: ErrorContext; timestamp: Date }> = [];

  // Error tracking
  captureError(error: Error, context: ErrorContext = {}) {
    const errorData = {
      error,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      timestamp: new Date(),
    };

    // Store locally for debugging
    this.errors.push(errorData);

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    // Send to monitoring service
    if (this.isProduction) {
      this.sendToMonitoring(errorData);
    } else {
      // Dev: console com contexto rico
      console.group(`🔴 Error: ${error.message}`);
      console.error(error);
      console.log('Context:', context);
      console.groupEnd();
    }
  }

  // Track business metrics
  trackMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: MetricData = { name, value, tags };

    if (this.isProduction) {
      this.sendMetric(metric);
    } else {
      console.log(`📊 ${name}: ${value}`, tags || '');
    }
  }

  // Track user actions
  trackAction(action: string, properties?: Record<string, unknown>) {
    this.trackMetric(`action.${action}`, 1, {
      ...(properties as Record<string, string>),
    });
  }

  // Get recent errors for debugging
  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }

  // Clear errors
  clearErrors() {
    this.errors = [];
  }

  // Send to Sentry (already configured in sentry.ts)
  private sendToMonitoring(errorData: { error: Error; context: ErrorContext; timestamp: Date }) {
    try {
      // Dynamic import to avoid circular deps — Sentry is initialized in sentry.ts
      import('@sentry/react').then((Sentry) => {
        Sentry.captureException(errorData.error, {
          contexts: { monitoring: errorData.context as unknown as Record<string, unknown> },
          tags: {
            component: errorData.context.component || 'unknown',
            action: errorData.context.action || 'unknown',
          },
        });
      }).catch(() => {
        // Sentry not available — silent fallback
      });
    } catch {
      // Non-blocking
    }
  }

  private sendMetric(metric: MetricData) {
    // Metrics are logged locally; for production, integrate with your APM
    // (DataDog, New Relic, etc.) when available
    console.debug('[monitoring] metric:', metric.name, metric.value, metric.tags || '');
  }
}

// Singleton instance
export const monitoring = new MonitoringService();

// React Hook para fácil uso
export function useMonitoring() {
  const captureError = (error: Error, context?: Partial<ErrorContext>) => {
    monitoring.captureError(error, context);
  };

  const trackMetric = (name: string, value: number, tags?: Record<string, string>) => {
    monitoring.trackMetric(name, value, tags);
  };

  const trackAction = (action: string, properties?: Record<string, unknown>) => {
    monitoring.trackAction(action, properties);
  };

  return {
    captureError,
    trackMetric,
    trackAction,
    getRecentErrors: monitoring.getRecentErrors.bind(monitoring),
    clearErrors: monitoring.clearErrors.bind(monitoring),
  };
}

// Helper para wrap functions com error tracking
export function withErrorTracking<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context: Partial<ErrorContext>
): T {
  return ((...args: unknown[]) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          monitoring.captureError(error, context);
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      monitoring.captureError(error as Error, context);
      throw error;
    }
  }) as T;
}

// Export default para facilitar uso
export default monitoring;

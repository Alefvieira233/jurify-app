/**
 * Sentry configuration - error tracking and performance monitoring.
 *
 * Bundle optimization (DEB-036):
 * - Named imports instead of `import * as Sentry` to enable tree-shaking
 * - Replay and Feedback integrations removed (heaviest sub-packages, ~200KB each)
 * - Lazy initialization: Sentry.init runs async in production only
 * - Only browserTracingIntegration kept (lightweight, essential for APM)
 */

import {
  init,
  browserTracingIntegration,
  captureException,
  captureMessage,
  setUser,
  setContext,
  addBreadcrumb,
  withScope,
  withErrorBoundary,
  startInactiveSpan,
} from '@sentry/react';
import type { SeverityLevel } from '@sentry/react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

/** Whether Sentry has been initialized — used for guard checks. */
let sentryInitialized = false;

/**
 * Initialize Sentry only in production.
 * Non-blocking: the app renders immediately while Sentry boots.
 */
export function initSentry() {
  if (sentryInitialized) return;
  if (import.meta.env.MODE !== 'production') {
    console.log('[sentry] disabled in development mode');
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('[sentry] DSN not configured');
    return;
  }

  init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    integrations: [
      browserTracingIntegration(),
      // Replay and Feedback removed — they add ~400KB to the bundle
      // and are not essential for error tracking. Re-enable via lazy
      // loading when session replay is needed for specific tenants.
    ],
    tracesSampleRate: 0.1,
    beforeSend(event, hint) {
      const error = hint.originalException;

      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);

        if (message.includes('chrome-extension://')) {
          return null;
        }

        if (message.includes('Network Error') || message.includes('Failed to fetch')) {
          console.warn('[sentry] network error (not sent):', message);
          return null;
        }
      }

      return event;
    },
    ignoreErrors: [
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      /chrome-extension/,
      /moz-extension/,
      /adblock/i,
      'AbortError',
      'timeout',
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      /googletagmanager\.com/i,
      /google-analytics\.com/i,
    ],
  });

  sentryInitialized = true;
  console.log('[sentry] initialized');
}

/**
 * Set user context for Sentry.
 */
export function setSentryUser(user: SupabaseUser | null) {
  if (!user) {
    setUser(null);
    return;
  }

  setUser({
    id: user.id,
    email: user.email,
    username: user.user_metadata?.full_name || user.email?.split('@')[0],
  });
}

/**
 * Add custom context.
 */
export function setSentryContext(key: string, value: Record<string, unknown>) {
  setContext(key, value);
}

/**
 * Add breadcrumb.
 */
export function addSentryBreadcrumb(message: string, category?: string, level?: SeverityLevel) {
  addBreadcrumb({
    message,
    category: category || 'user-action',
    level: level || 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture an error manually.
 */
export function captureSentryError(error: Error, context?: Record<string, unknown>) {
  captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Capture a message.
 */
export function captureSentryMessage(message: string, level: SeverityLevel = 'info') {
  captureMessage(message, level);
}

/**
 * Performance transaction (legacy API). Returns null if unsupported.
 */
export function startSentryTransaction(name: string, op: string = 'custom') {
  if (typeof startInactiveSpan === 'function') {
    return startInactiveSpan({ name, op });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Agent-specific monitoring helpers
// ---------------------------------------------------------------------------

/**
 * Capture an agent execution error with full context.
 * Triggers a Sentry alert with agent name, tenant, and lead info.
 */
export function captureAgentError(
  error: Error,
  context: {
    agentName: string;
    tenantId?: string;
    leadId?: string;
    executionId?: string;
    stage?: string;
  }
) {
  withScope((scope) => {
    scope.setTag('agent.name', context.agentName);
    scope.setTag('agent.stage', context.stage ?? 'unknown');
    scope.setContext('agent', {
      agentName: context.agentName,
      tenantId: context.tenantId,
      leadId: context.leadId,
      executionId: context.executionId,
      stage: context.stage,
    });
    scope.setLevel('error');
    captureException(error);
  });
}

/**
 * Alert when agent response time exceeds threshold (default: 10s).
 */
export function reportSlowAgent(
  agentName: string,
  durationMs: number,
  thresholdMs = 10_000
) {
  if (durationMs <= thresholdMs) return;

  withScope((scope) => {
    scope.setTag('agent.name', agentName);
    scope.setTag('alert.type', 'slow_response');
    scope.setLevel('warning');
    captureMessage(
      `Agent ${agentName} exceeded response time: ${durationMs}ms (threshold: ${thresholdMs}ms)`,
      'warning'
    );
  });
}

/**
 * Alert when agent failure rate for a tenant exceeds threshold (default: 5%).
 */
export function reportHighAgentFailureRate(
  tenantId: string,
  failureRate: number,
  thresholdPct = 5
) {
  if (failureRate <= thresholdPct) return;

  withScope((scope) => {
    scope.setTag('alert.type', 'high_failure_rate');
    scope.setTag('tenant.id', tenantId);
    scope.setLevel('error');
    captureMessage(
      `Agent failure rate for tenant ${tenantId}: ${failureRate.toFixed(1)}% (threshold: ${thresholdPct}%)`,
      'error'
    );
  });
}

/**
 * HOC for error boundary.
 */
export const withSentryErrorBoundary = withErrorBoundary;

/**
 * Hook helpers for Sentry.
 */
export const useSentry = () => {
  return {
    captureError: captureSentryError,
    captureMessage: captureSentryMessage,
    addBreadcrumb: addSentryBreadcrumb,
    setUser: setSentryUser,
    setContext: setSentryContext,
  };
};

// ---------------------------------------------------------------------------
// Performance instrumentation
// ---------------------------------------------------------------------------

/**
 * Measure performance of a critical operation and report to Sentry.
 * Logs a warning if the operation exceeds 3 seconds.
 */
export function measurePerformance<T>(
  name: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = performance.now();
  return operation().then(
    (result) => {
      const duration = performance.now() - start;
      if (duration > 3000) {
        captureMessage(`Slow operation: ${name} (${Math.round(duration)}ms)`, {
          level: 'warning',
          tags: { operation: name, ...tags },
          extra: { duration_ms: Math.round(duration) },
        });
      }
      return result;
    },
    (error) => {
      const duration = performance.now() - start;
      captureException(error, {
        tags: { operation: name, ...tags },
        extra: { duration_ms: Math.round(duration) },
      });
      throw error;
    }
  );
}

// Re-export for consumers that need direct access
export { captureException, captureMessage, withScope, setContext, setUser } from '@sentry/react';
export type { SeverityLevel } from '@sentry/react';
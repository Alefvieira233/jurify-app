/**
 * Sentry configuration - error tracking and performance monitoring.
 */

import * as Sentry from '@sentry/react';
import type { User } from '@supabase/supabase-js';

/**
 * Initialize Sentry only in production.
 */
export function initSentry() {
  if (import.meta.env.MODE !== 'production') {
    console.log('[sentry] disabled in development mode');
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('[sentry] DSN not configured');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.feedbackIntegration({
        colorScheme: 'system',
        showBranding: false,
      }),
    ],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      if (import.meta.env.MODE === 'development') {
        return null;
      }

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

  console.log('[sentry] initialized');
}

/**
 * Set user context for Sentry.
 */
export function setSentryUser(user: User | null) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.user_metadata?.full_name || user.email?.split('@')[0],
  });
}

/**
 * Add custom context.
 */
export function setSentryContext(key: string, value: Record<string, unknown>) {
  Sentry.setContext(key, value);
}

/**
 * Add breadcrumb.
 */
export function addSentryBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel) {
  Sentry.addBreadcrumb({
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
  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Capture a message.
 */
export function captureSentryMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Performance transaction (legacy API). Returns null if unsupported.
 */
export function startSentryTransaction(name: string, op: string = 'custom') {
  // startTransaction foi removido na Sentry v8+. Usar startInactiveSpan.
  const sentryObj = Sentry as unknown as Record<string, unknown>;
  if (typeof sentryObj.startInactiveSpan === 'function') {
    return (sentryObj.startInactiveSpan as (opts: { name: string; op: string }) => unknown)({ name, op });
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
  Sentry.withScope((scope) => {
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
    Sentry.captureException(error);
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

  Sentry.withScope((scope) => {
    scope.setTag('agent.name', agentName);
    scope.setTag('alert.type', 'slow_response');
    scope.setLevel('warning');
    Sentry.captureMessage(
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

  Sentry.withScope((scope) => {
    scope.setTag('alert.type', 'high_failure_rate');
    scope.setTag('tenant.id', tenantId);
    scope.setLevel('error');
    Sentry.captureMessage(
      `Agent failure rate for tenant ${tenantId}: ${failureRate.toFixed(1)}% (threshold: ${thresholdPct}%)`,
      'error'
    );
  });
}

/**
 * HOC for error boundary.
 */
export const withSentryErrorBoundary = Sentry.withErrorBoundary;

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
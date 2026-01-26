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
export function setSentryContext(key: string, value: Record<string, any>) {
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
export function captureSentryError(error: Error, context?: Record<string, any>) {
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
  const anySentry = Sentry as any;
  if (typeof anySentry.startTransaction === 'function') {
    return anySentry.startTransaction({
      name,
      op,
    });
  }
  return null;
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
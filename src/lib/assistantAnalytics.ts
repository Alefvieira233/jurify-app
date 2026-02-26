/**
 * Assistant Analytics — Client-side tracking for JurifyBot usage.
 *
 * Tracks query patterns, response times, tool usage, and errors.
 * Data is stored in-memory for the session and optionally flushed
 * to Supabase via the assistant_audit table (server-side).
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('AssistantAnalytics');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueryMetric {
  query: string;
  responseTimeMs: number;
  toolsUsed: string[];
  success: boolean;
  timestamp: number;
}

interface AnalyticsSummary {
  totalQueries: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  toolUsageCount: Record<string, number>;
  errorRate: number;
  queriesPerMinute: number;
}

// ---------------------------------------------------------------------------
// In-memory metrics store (session-scoped)
// ---------------------------------------------------------------------------

const metrics: QueryMetric[] = [];
const MAX_METRICS = 500;

/**
 * Track a completed assistant query.
 */
export function trackQuery(
  query: string,
  responseTimeMs: number,
  toolsUsed: string[],
  success: boolean
): void {
  if (metrics.length >= MAX_METRICS) {
    metrics.shift();
  }

  metrics.push({
    query: query.slice(0, 200),
    responseTimeMs,
    toolsUsed,
    success,
    timestamp: Date.now(),
  });

  log.debug('Query tracked', {
    responseTimeMs,
    toolsUsed: toolsUsed.join(','),
    success,
  });
}

/**
 * Track a specific tool usage event.
 */
export function trackToolUsage(toolName: string, executionTimeMs: number): void {
  log.debug('Tool usage', { toolName, executionTimeMs });
}

/**
 * Track an assistant error.
 */
export function trackError(errorType: string, context?: Record<string, unknown>): void {
  log.warn(`Assistant error: ${errorType}`, context ?? {});
}

/**
 * Get analytics summary for the current session.
 */
export function getAnalyticsSummary(): AnalyticsSummary {
  if (metrics.length === 0) {
    return {
      totalQueries: 0,
      avgResponseTimeMs: 0,
      p95ResponseTimeMs: 0,
      toolUsageCount: {},
      errorRate: 0,
      queriesPerMinute: 0,
    };
  }

  const responseTimes = metrics.map((m) => m.responseTimeMs).sort((a, b) => a - b);
  const totalQueries = metrics.length;
  const avgResponseTimeMs = Math.round(
    responseTimes.reduce((s, t) => s + t, 0) / totalQueries
  );
  const p95Index = Math.floor(totalQueries * 0.95);
  const p95ResponseTimeMs = responseTimes[p95Index] ?? responseTimes[responseTimes.length - 1] ?? 0;

  const toolUsageCount: Record<string, number> = {};
  for (const m of metrics) {
    for (const t of m.toolsUsed) {
      toolUsageCount[t] = (toolUsageCount[t] ?? 0) + 1;
    }
  }

  const errors = metrics.filter((m) => !m.success).length;
  const errorRate = Math.round((errors / totalQueries) * 100);

  // Queries per minute (based on time window of stored metrics)
  const oldest = metrics[0]?.timestamp ?? Date.now();
  const windowMinutes = Math.max((Date.now() - oldest) / 60_000, 1);
  const queriesPerMinute = Math.round((totalQueries / windowMinutes) * 10) / 10;

  return {
    totalQueries,
    avgResponseTimeMs,
    p95ResponseTimeMs,
    toolUsageCount,
    errorRate,
    queriesPerMinute,
  };
}

/**
 * Reset all session metrics.
 */
export function resetMetrics(): void {
  metrics.length = 0;
}

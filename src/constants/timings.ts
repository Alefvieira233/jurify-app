/** Centralized timing constants to eliminate magic numbers across the codebase. */

/** Toast notification display duration in ms */
export const TOAST_DURATION_MS = 5000;

/** Default debounce delay for search inputs in ms */
export const SEARCH_DEBOUNCE_MS = 300;

/** Session inactivity timeout in ms (30 minutes) */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** API request timeout in ms */
export const API_TIMEOUT_MS = 15000;

/** Polling interval for realtime fallback in ms */
export const POLLING_INTERVAL_MS = 30000;

/** React Query default stale time in ms (5 minutes) */
export const QUERY_STALE_TIME_MS = 5 * 60 * 1000;

/** React Query garbage collection time in ms (30 minutes) */
export const QUERY_GC_TIME_MS = 30 * 60 * 1000;

/** Maximum retry delay for exponential backoff in ms */
export const MAX_RETRY_DELAY_MS = 15000;

/** Rate limit window for Edge Functions in seconds */
export const RATE_LIMIT_WINDOW_SECONDS = 60;

/** WhatsApp webhook deduplication TTL in seconds */
export const WEBHOOK_DEDUP_TTL_SECONDS = 300;

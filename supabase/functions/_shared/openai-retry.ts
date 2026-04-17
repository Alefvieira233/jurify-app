/**
 * OpenAI Retry Helper — exponential backoff with jitter.
 *
 * Wraps any async function (typically an OpenAI SDK call) and retries on
 * transient failures (5xx, 429, network errors, aborts). Does NOT retry
 * client-side errors (400 bad request, 401 auth) — those are deterministic
 * and retrying just wastes quota.
 *
 * Default: 3 retries, base 500ms, capped at 8s. Override per call site.
 *
 * Usage:
 *   const completion = await withRetry(() =>
 *     openai.chat.completions.create({ ... })
 *   );
 *
 *   // Short-call sites (orchestrator, ~100 tokens):
 *   await withRetry(fn, { retries: 2, baseMs: 300 });
 */

export interface RetryOptions {
  /** Max retries after the initial attempt. Default: 3. Total attempts = retries + 1. */
  retries?: number;
  /** Base delay in ms for exponential backoff. Default: 500. */
  baseMs?: number;
  /** Max single delay in ms. Default: 8000. */
  maxMs?: number;
  /** Optional label for log lines. */
  label?: string;
}

/** HTTP status codes that should NOT be retried (deterministic client errors). */
const NON_RETRIABLE_STATUS = new Set([400, 401, 403, 404, 422]);

function shouldRetry(err: unknown): boolean {
  // Errors from the OpenAI SDK expose .status. Anything in NON_RETRIABLE_STATUS
  // is a client error and won't get better on retry.
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { status?: number; statusCode?: number })?.statusCode;
  if (typeof status === "number" && NON_RETRIABLE_STATUS.has(status)) {
    return false;
  }
  // AbortError (our own 30s timeout) — let the caller decide on next pipeline run
  const name = (err as { name?: string })?.name;
  if (name === "AbortError") {
    return false;
  }
  return true;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const retries = opts?.retries ?? 3;
  const baseMs = opts?.baseMs ?? 500;
  const maxMs = opts?.maxMs ?? 8000;
  const label = opts?.label ?? "openai";

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!shouldRetry(err)) {
        throw err;
      }
      if (attempt === retries) break;
      const jitter = Math.random() * 250;
      const delay = Math.min(baseMs * Math.pow(2, attempt) + jitter, maxMs);
      const status = (err as { status?: number })?.status;
      const msg = (err as { message?: string })?.message ?? String(err);
      console.warn(
        `[${label}] retry ${attempt + 1}/${retries} after ${Math.round(delay)}ms (status=${status ?? "n/a"}): ${msg}`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

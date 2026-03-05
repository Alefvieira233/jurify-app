/**
 * Security Middleware for Edge Functions
 *
 * - Rate limiting (in-memory per-isolate, good enough for burst protection)
 * - Input sanitisation against prompt injection
 * - PII content filtering (CPF, RG, phone)
 * - Audit trail logging to Supabase
 */

import { getCache, setCache, CACHE_TTL } from "./cache.ts";

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

interface RateLimitBucket {
  count: number;
  windowStart: number;
}

/**
 * Check and enforce rate limit for a user.
 * @returns `true` if allowed, `false` if rate-limited.
 */
export function rateLimit(
  userId: string,
  limit = 20,
  windowSeconds = 60
): boolean {
  const key = `rl:${userId}`;
  const now = Date.now();
  const bucket = getCache<RateLimitBucket>(key);

  if (!bucket || now - bucket.windowStart > windowSeconds * 1000) {
    // New window
    setCache<RateLimitBucket>(key, { count: 1, windowStart: now }, windowSeconds);
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  // Increment in-place (cache stores reference)
  bucket.count++;
  setCache<RateLimitBucket>(key, bucket, windowSeconds);
  return true;
}

// ---------------------------------------------------------------------------
// Input sanitisation
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+(instructions?|prompts?|rules?)/i,
  /you\s+are\s+now\s+/i,
  /system\s*:\s*/i,
  /\bDAN\b/,
  /do\s+anything\s+now/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+(if\s+you\s+are|a)\s+/i,
  /jailbreak/i,
  /bypass\s+(your|the)\s+(rules?|restrictions?|filters?)/i,
  /reveal\s+(your|the)\s+(system|instructions?|prompt)/i,
];

/**
 * Sanitise user input: trim, cap length, strip injection attempts.
 * Returns sanitised string or null if malicious.
 */
export function sanitizeInput(
  text: string,
  maxLength = 2000
): { safe: true; text: string } | { safe: false; reason: string } {
  if (!text || typeof text !== "string") {
    return { safe: false, reason: "Empty or invalid input" };
  }

  const trimmed = text.trim().slice(0, maxLength);

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: "Potential prompt injection detected" };
    }
  }

  return { safe: true, text: trimmed };
}

// ---------------------------------------------------------------------------
// PII content filtering
// ---------------------------------------------------------------------------

const PII_PATTERNS: Array<{ pattern: RegExp; label: string; replacement: string }> = [
  { pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, label: "CPF", replacement: "***CPF***" },
  { pattern: /\b\d{2}\.?\d{3}\.?\d{3}-?[\dXx]\b/g, label: "RG", replacement: "***RG***" },
  { pattern: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, label: "Card", replacement: "***CARD***" },
  { pattern: /\b[\w\.-]+@[\w\.-]+\.\w{2,}\b/g, label: "Email", replacement: "***EMAIL***" },
  { pattern: /\b(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}\b/g, label: "Phone", replacement: "***PHONE***" },
  { pattern: /\b(?:OAB[/-\s]?)?[A-Z]{2}\s?\d{4,6}\b/gi, label: "OAB", replacement: "***OAB***" },
];

/** Redact PII from text to ensure data protection. */
export function redactPII(text: string): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

interface AuditEntry {
  user_id: string;
  tenant_id: string;
  action: string;
  query?: string;
  response_time_ms?: number;
  tools_used?: string[];
  success: boolean;
  error?: string;
}

/**
 * Log an interaction to the assistant_audit table (fire-and-forget).
 * Uses Supabase service-role client passed in to avoid circular deps.
 */
export async function auditLog(
  supabase: { from: (table: string) => any },
  entry: AuditEntry
): Promise<void> {
  try {
    await supabase.from("assistant_audit").insert({
      user_id: entry.user_id,
      tenant_id: entry.tenant_id,
      action: entry.action,
      query: entry.query ? redactPII(entry.query) : null,
      response_time_ms: entry.response_time_ms,
      tools_used: entry.tools_used ?? [],
      success: entry.success,
      error: entry.error ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Audit must never break the main flow
    console.warn("[security] auditLog insert failed silently");
  }
}

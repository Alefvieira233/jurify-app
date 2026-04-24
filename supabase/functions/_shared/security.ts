/**
 * Security Middleware for Edge Functions
 *
 * - Input sanitisation against prompt injection
 * - PII content filtering (CPF, RG, phone)
 * - Audit trail logging to Supabase
 *
 * Rate limiting consolidated in rate-limiter.ts
 */

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

// Homoglyph map for common substitution attacks (e.g. "ign0re" → "ignore")
const HOMOGLYPHS: Record<string, string> = {
  "0": "o", "1": "l", "3": "e", "4": "a", "5": "s",
  "@": "a", "$": "s", "!": "i",
};

/**
 * Normalize text to defeat Unicode / homoglyph bypass attacks.
 */
function normalizeForDetection(text: string): string {
  // NFKD decomposes look-alike characters (e.g. ﬁ → fi, ℌ → H)
  let normalized = text.normalize("NFKD");
  // Replace common homoglyphs used to bypass detection
  normalized = normalized.replace(/[01345@$!]/g, (ch) => HOMOGLYPHS[ch] || ch);
  return normalized;
}

/**
 * Sanitise user input: trim, cap length, strip injection attempts.
 * Applies Unicode normalization and homoglyph detection for robustness.
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

  // Check original + normalized version to catch homoglyph attacks
  const normalized = normalizeForDetection(trimmed);

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed) || pattern.test(normalized)) {
      return { safe: false, reason: "Potential prompt injection detected" };
    }
  }

  // Detect base64-encoded payloads that might hide injection instructions
  const base64Match = trimmed.match(/[A-Za-z0-9+/]{40,}={0,2}/);
  if (base64Match) {
    try {
      const decoded = atob(base64Match[0]);
      const decodedNormalized = normalizeForDetection(decoded);
      for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(decoded) || pattern.test(decodedNormalized)) {
          return { safe: false, reason: "Potential encoded prompt injection detected" };
        }
      }
    } catch {
      // Not valid base64 — ignore
    }
  }

  return { safe: true, text: trimmed };
}

// ---------------------------------------------------------------------------
// PII content filtering
// ---------------------------------------------------------------------------

const PII_PATTERNS: Array<{ pattern: RegExp; label: string; replacement: string }> = [
  // SEC-01: Credit card pattern must be first to avoid partial matches as phones
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, label: "Card", replacement: "***CARD***" },
  // SEC-02: Brazilian legal process (CNJ)
  { pattern: /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g, label: "Processo", replacement: "***PROCESSO***" },
  // SEC-03: CNPJ
  { pattern: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, label: "CNPJ", replacement: "***CNPJ***" },
  // SEC-04: CPF (formatted or raw 11 digits)
  { pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, label: "CPF", replacement: "***CPF***" },
  // SEC-05: RG
  { pattern: /\b\d{2}\.?\d{3}\.?\d{3}-?[\dXx]\b/g, label: "RG", replacement: "***RG***" },
  // SEC-06: OAB (Brazilian Bar Association) - case insensitive, optional OAB/ prefix
  { pattern: /\b(?:OAB\/)?(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s?\d{4,6}\b/gi, label: "OAB", replacement: "***OAB***" },
  // SEC-07: Email (leading boundary omitted intentionally for labels like email:user@host)
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, label: "Email", replacement: "***EMAIL***" },
  // SEC-08: Brazilian Phone (leading boundary omitted intentionally for labels like phone:(11)...)
  { pattern: /(?:\+55\s?)?(?:\(\d{2}\)|\d{2})\s?\d{4,5}[-\s]?\d{4}\b/g, label: "Phone", replacement: "***PHONE***" },
];

/**
 * Redact PII from text before logging or sending to external services.
 * Implements defensive checks and comprehensive patterns for Brazilian legal context.
 */
export function redactPII(text: string): string {
  if (!text || typeof text !== "string") {
    return text || "";
  }

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
      query: entry.query,
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

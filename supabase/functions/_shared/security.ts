/**
 * Security Middleware for Edge Functions
 *
 * - Input sanitisation against prompt injection
 * - PII content filtering (CPF, RG, phone, email, CNPJ, OAB, process numbers)
 * - Audit trail logging to Supabase
 *
 * Rate limiting consolidated in rate-limiter.ts
 */

// ---------------------------------------------------------------------------
// Input sanitisation
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS = [
  /ignore\s+(?:.*?\s+)?(instructions?|prompts?|rules?)/i,
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
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s",
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
  const base64Match = trimmed.match(/[A-Za-z0-9+/]{16,}={0,2}/);
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

/**
 * PII redaction patterns prioritized to prevent collision.
 * Email, CNPJ, Processo and Tokens are checked before shorter numbers.
 */
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // CNPJ: 12.345.678/0001-90
  { pattern: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, replacement: "***CNPJ***" },
  // Processo CNJ: 1234567-89.2024.8.26.0001
  { pattern: /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g, replacement: "***PROCESSO***" },
  // Credit Card: 1234 5678 1234 5678
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: "***CARD***" },
  // Email: user@domain.com
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: "***EMAIL***" },
  // OAB: OAB/SP 123456
  { pattern: /\bOAB[\s\/]?[A-Z]{2}[\s\/]?\d{5,6}\b/gi, replacement: "***OAB***" },
  // CPF: 123.456.789-01
  { pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, replacement: "***CPF***" },
  // Phone: (11) 98888-7777 or +5511...
  { pattern: /(?:\+?55[\s.-]?)?\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}\b/g, replacement: "***PHONE***" },
  // RG: 12.345.678-X
  { pattern: /\b\d{2}\.?\d{3}\.?\d{3}-?[\dXx]\b/g, replacement: "***RG***" },
  // Tokens/Keys: Bearer eyJ... or sk-xxx...
  { pattern: /\b(?:Bearer\s+)?(sk-|eyJ)[A-Za-z0-9._\-\/]{10,}\b/g, replacement: "***TOKEN***" },
  { pattern: /\bBearer\s+[A-Za-z0-9._\-\/]{10,}\b/g, replacement: "***TOKEN***" },
];

/**
 * Redact PII from text before logging or sending to client.
 * Returns empty string if input is null or undefined.
 */
export function redactPII(text: string | null | undefined): string {
  if (!text) return "";
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

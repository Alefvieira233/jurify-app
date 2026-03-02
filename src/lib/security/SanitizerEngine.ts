/**
 * 🛡️ LGPD SANITIZER ENGINE
 *
 * Deterministic PII masking for Brazilian legal data BEFORE any external LLM call.
 * Replaces sensitive data with UUID-based tokens, then rehydrates after AI response.
 *
 * Supported patterns:
 * - CPF (XXX.XXX.XXX-XX or 11 digits)
 * - CNPJ (XX.XXX.XXX/XXXX-XX or 14 digits)
 * - OAB registration (e.g., SP123456)
 * - Processo CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)
 * - Phone numbers (Brazilian formats)
 * - Email addresses
 *
 * Zero external dependencies. Works in both browser and Deno Edge Functions.
 */

// ─── PII Pattern Definitions ────────────────────────────────────────────────

interface PIIPattern {
  name: string;
  regex: RegExp;
  prefix: string;
}

const PII_PATTERNS: PIIPattern[] = [
  {
    name: 'PROCESSO_CNJ',
    regex: /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g,
    prefix: 'CNJ',
  },
  {
    name: 'CNPJ',
    regex: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g,
    prefix: 'CNPJ',
  },
  {
    name: 'CPF_FORMATTED',
    regex: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
    prefix: 'CPF',
  },
  {
    name: 'CPF_RAW',
    regex: /(?<!\d)\d{11}(?!\d)/g,
    prefix: 'CPF',
  },
  {
    name: 'OAB',
    regex: /\b(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s?\d{4,6}\b/g,
    prefix: 'OAB',
  },
  {
    name: 'PHONE_BR',
    regex: /(?:\+55\s?)?(?:\(\d{2}\)|\d{2})\s?\d{4,5}[-\s]?\d{4}/g,
    prefix: 'TEL',
  },
  {
    name: 'EMAIL',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    prefix: 'EMAIL',
  },
];

// ─── UUID Generator (no crypto dependency needed) ───────────────────────────

function generateTokenId(): string {
  // Simple UUID v4-like generator that works in all environments
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += hex[Math.floor(Math.random() * 16)];
  }
  return id;
}

// ─── Core Types ─────────────────────────────────────────────────────────────

export type LookupMap = Map<string, string>;

export interface SanitizeResult {
  safePayload: unknown;
  lookupMap: LookupMap;
  piiCount: number;
}

// ─── Sanitizer Engine ───────────────────────────────────────────────────────

export class SanitizerEngine {
  private lookupMap: LookupMap = new Map();
  private reverseMap: Map<string, string> = new Map();
  private tokenCounter = 0;

  /**
   * Sanitize any payload (string, object, array) by replacing PII with tokens.
   * Returns the safe payload + a lookup map for rehydration.
   */
  sanitize(payload: unknown): SanitizeResult {
    this.lookupMap = new Map();
    this.reverseMap = new Map();
    this.tokenCounter = 0;

    const safePayload = this.processValue(payload);

    return {
      safePayload,
      lookupMap: new Map(this.lookupMap),
      piiCount: this.tokenCounter,
    };
  }

  /**
   * Rehydrate a sanitized payload by restoring original PII values.
   */
  static rehydrate(safeOutput: unknown, lookupMap: LookupMap): unknown {
    if (lookupMap.size === 0) return safeOutput;

    if (typeof safeOutput === 'string') {
      return SanitizerEngine.rehydrateString(safeOutput, lookupMap);
    }

    if (Array.isArray(safeOutput)) {
      return safeOutput.map((item) => SanitizerEngine.rehydrate(item, lookupMap));
    }

    if (safeOutput !== null && typeof safeOutput === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(safeOutput as Record<string, unknown>)) {
        result[key] = SanitizerEngine.rehydrate(value, lookupMap);
      }
      return result;
    }

    return safeOutput;
  }

  /**
   * Quick sanitize for a single string (most common case: prompt text).
   */
  sanitizeString(text: string): SanitizeResult {
    return this.sanitize(text);
  }

  // ─── Private Methods ────────────────────────────────────────────────────

  private processValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.processString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.processValue(item));
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        result[key] = this.processValue(val);
      }
      return result;
    }

    // Numbers, booleans, null, undefined — pass through
    return value;
  }

  private processString(text: string): string {
    let result = text;

    for (const pattern of PII_PATTERNS) {
      // Reset lastIndex to avoid stale state with /g flag
      pattern.regex.lastIndex = 0;
      result = result.replace(pattern.regex, (match) => {
        // Check if this exact value was already tokenized (deterministic)
        const existingToken = this.reverseMap.get(match);
        if (existingToken) return existingToken;

        // Create new token
        this.tokenCounter++;
        const token = `[${pattern.prefix}-${generateTokenId()}]`;
        this.lookupMap.set(token, match);
        this.reverseMap.set(match, token);
        return token;
      });
    }

    return result;
  }

  private static rehydrateString(text: string, lookupMap: LookupMap): string {
    let result = text;
    for (const [token, original] of lookupMap) {
      // Replace all occurrences of the token
      result = result.split(token).join(original);
    }
    return result;
  }
}

/**
 * Quick sanitize helper — most common usage in agent code.
 *
 * @example
 * ```ts
 * const { safePayload, lookupMap } = sanitizePII("CPF do cliente: 123.456.789-00");
 * // safePayload = "CPF do cliente: [CPF-a1b2c3d4]"
 * const restored = rehydratePII(aiResponse, lookupMap);
 * ```
 */
export function sanitizePII(text: string): SanitizeResult {
  return new SanitizerEngine().sanitizeString(text);
}

export function rehydratePII(text: unknown, lookupMap: LookupMap): unknown {
  return SanitizerEngine.rehydrate(text, lookupMap);
}

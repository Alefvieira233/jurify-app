/**
 * Structured Logger for Supabase Edge Functions
 *
 * Provides consistent, JSON-structured logging across all Edge Functions.
 * In production, suppresses debug/info. In dev, shows everything.
 *
 * Usage:
 *   import { createEdgeLogger } from "../_shared/logger.ts";
 *   const log = createEdgeLogger("send-whatsapp-message");
 *   log.info("Message sent", { to: "5511..." });
 *   log.error("Failed to send", err);
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  fn: string;
  msg: string;
  ts: string;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// PII REDACTION (LGPD) — aplicado a todos os dados antes de logar
// ============================================================================

const PII_FIELDS = new Set([
  "password", "pass", "senha",
  "token", "access_token", "refresh_token", "jwt", "apikey", "api_key",
  "authorization", "cookie",
  "secret", "webhook_secret", "encryption_key",
  "cpf", "cnpj", "cpf_cnpj",
  "email",
  "telefone", "phone", "from", "to",
  "credit_card", "card_number", "cvv",
]);

const EMAIL_RE = /\b([A-Za-z0-9._%+-]{1,64})@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g;
const PHONE_RE = /\b(\+?\d{1,3})?[\s.-]?\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}\b/g;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}\b/g;
const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[-.]?\d{2}\b/g;
const BEARER_RE = /\b(Bearer|JWT|sbp|eyJ)[_a-zA-Z0-9.\-]{8,}/g;

export function maskString(value: string, keepStart = 4, keepEnd = 2): string {
  if (!value || value.length <= keepStart + keepEnd) return "***";
  return value.slice(0, keepStart) + "*".repeat(Math.max(3, value.length - keepStart - keepEnd)) + value.slice(-keepEnd);
}

export function redactPIIString(text: string): string {
  if (!text) return text;
  return text
    .replace(EMAIL_RE, (_m, user, domain) => `${maskString(user, 2, 1)}@${domain}`)
    .replace(CPF_RE, "***.***.***-**")
    .replace(CNPJ_RE, "**.***.***/****-**")
    .replace(PHONE_RE, (m) => maskString(m, 4, 2))
    .replace(BEARER_RE, (m) => m.slice(0, 6) + "***");
}

export function redactPII(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 6) return "[depth-limit]";
  if (typeof value === "string") return redactPIIString(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value;
  if (Array.isArray(value)) return value.map((v) => redactPII(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const kLower = k.toLowerCase();
      if (PII_FIELDS.has(kLower)) {
        out[k] = typeof v === "string" && v.length > 0 ? maskString(v, 2, 2) : "***";
      } else {
        out[k] = redactPII(v, depth + 1);
      }
    }
    return out;
  }
  return "[unserializable]";
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = Deno.env.get("SUPABASE_DB_NAME") ?? "";
  return env === "production" ? "warn" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];
}

function serialize(entry: LogEntry): string {
  try {
    return JSON.stringify(entry);
  } catch {
    return `[${entry.fn}] ${entry.msg}`;
  }
}

class EdgeLogger {
  private fn: string;

  constructor(functionName: string) {
    this.fn = functionName;
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    if (!shouldLog("debug")) return;
    const entry: LogEntry = { level: "debug", fn: this.fn, msg: redactPIIString(msg), ts: new Date().toISOString(), data: data ? (redactPII(data) as Record<string, unknown>) : undefined };
    console.debug(serialize(entry));
  }

  info(msg: string, data?: Record<string, unknown>): void {
    if (!shouldLog("info")) return;
    const entry: LogEntry = { level: "info", fn: this.fn, msg: redactPIIString(msg), ts: new Date().toISOString(), data: data ? (redactPII(data) as Record<string, unknown>) : undefined };
    console.info(serialize(entry));
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    if (!shouldLog("warn")) return;
    const entry: LogEntry = { level: "warn", fn: this.fn, msg: redactPIIString(msg), ts: new Date().toISOString(), data: data ? (redactPII(data) as Record<string, unknown>) : undefined };
    console.warn(serialize(entry));
  }

  error(msg: string, err?: unknown, data?: Record<string, unknown>): void {
    if (!shouldLog("error")) return;
    const errorStr = err instanceof Error ? err.message : err ? String(err) : undefined;
    const entry: LogEntry = {
      level: "error",
      fn: this.fn,
      msg: redactPIIString(msg),
      ts: new Date().toISOString(),
      data: data ? (redactPII(data) as Record<string, unknown>) : undefined,
      error: errorStr ? redactPIIString(errorStr) : undefined,
    };
    console.error(serialize(entry));
  }
}

/**
 * Create a structured logger for an Edge Function.
 *
 * @example
 * const log = createEdgeLogger("create-checkout-session");
 * log.info("Session created", { customerId: "cus_xxx" });
 */
export function createEdgeLogger(functionName: string): EdgeLogger {
  return new EdgeLogger(functionName);
}

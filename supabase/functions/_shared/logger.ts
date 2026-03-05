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
    const entry: LogEntry = { level: "debug", fn: this.fn, msg, ts: new Date().toISOString(), data };
    console.debug(serialize(entry));
  }

  info(msg: string, data?: Record<string, unknown>): void {
    if (!shouldLog("info")) return;
    const entry: LogEntry = { level: "info", fn: this.fn, msg, ts: new Date().toISOString(), data };
    console.info(serialize(entry));
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    if (!shouldLog("warn")) return;
    const entry: LogEntry = { level: "warn", fn: this.fn, msg, ts: new Date().toISOString(), data };
    console.warn(serialize(entry));
  }

  error(msg: string, err?: unknown, data?: Record<string, unknown>): void {
    if (!shouldLog("error")) return;
    const errorStr = err instanceof Error ? err.message : err ? String(err) : undefined;
    const entry: LogEntry = { level: "error", fn: this.fn, msg, ts: new Date().toISOString(), data, error: errorStr };
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

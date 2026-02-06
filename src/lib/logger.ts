/**
 * 🔧 JURIFY STRUCTURED LOGGER
 *
 * Logger profissional com níveis, contexto e controle por ambiente.
 * Em produção, suprime debug/info. Em dev, mostra tudo.
 *
 * @version 1.0.0
 * @architecture Enterprise Grade
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const IS_PRODUCTION = import.meta.env.PROD;
const MIN_LEVEL: LogLevel = IS_PRODUCTION ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatEntry(entry: LogEntry): string {
  const prefix = `[${entry.module}]`;
  return `${prefix} ${entry.message}`;
}

class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (!shouldLog('debug')) return;
    const entry: LogEntry = { level: 'debug', module: this.module, message, data, timestamp: new Date().toISOString() };
    console.debug(formatEntry(entry), data ?? '');
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (!shouldLog('info')) return;
    const entry: LogEntry = { level: 'info', module: this.module, message, data, timestamp: new Date().toISOString() };
    console.info(formatEntry(entry), data ?? '');
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (!shouldLog('warn')) return;
    const entry: LogEntry = { level: 'warn', module: this.module, message, data, timestamp: new Date().toISOString() };
    console.warn(formatEntry(entry), data ?? '');
  }

  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    if (!shouldLog('error')) return;
    const entry: LogEntry = { level: 'error', module: this.module, message, data, timestamp: new Date().toISOString() };
    console.error(formatEntry(entry), error ?? '', data ?? '');
  }
}

/**
 * Cria uma instância de logger para um módulo específico.
 *
 * @example
 * const log = createLogger('WhatsApp');
 * log.info('Mensagem enviada', { to: '5511...' });
 * log.error('Falha no envio', err);
 */
export function createLogger(module: string): Logger {
  return new Logger(module);
}

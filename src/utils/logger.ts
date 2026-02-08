/**
 * Sistema de Logging Configurável
 *
 * Substitui console.log/error/warn por um logger configurável
 * que pode ser desativado em produção
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

class Logger {
  private config: LoggerConfig;
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4,
  };

  constructor() {
    // Configuração baseada em variáveis de ambiente
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    const enableLogs = import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true';
    const logLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info';

    this.config = {
      level: isDev ? 'debug' : logLevel,
      enableConsole: isDev || enableLogs,
      enableRemote: !isDev, // Em produção, logar remotamente
      remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.config.level === 'none') return false;
    return this.levels[level] >= this.levels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, ..._args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      none: '',
    }[level];

    return `[${timestamp}] ${prefix} ${message}`;
  }

  private async sendToRemote(level: LogLevel, message: string, data?: unknown) {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) {
      return;
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          data,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (error) {
      // Falha silenciosa para não quebrar a aplicação
      if (import.meta.env.DEV) {
        console.error('Failed to send log to remote:', error);
      }
    }
  }

  /**
   * Log de debug - apenas em desenvolvimento
   * @param message - Mensagem a ser logada
   * @param args - Argumentos adicionais
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;

    if (this.config.enableConsole) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  /**
   * Log informativo
   * @param message - Mensagem a ser logada
   * @param args - Argumentos adicionais
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;

    if (this.config.enableConsole) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  /**
   * Log de aviso
   * @param message - Mensagem a ser logada
   * @param args - Argumentos adicionais
   */
  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;

    if (this.config.enableConsole) {
      console.warn(this.formatMessage('warn', message), ...args);
    }

    // Avisos também vão para remote
    this.sendToRemote('warn', message, args);
  }

  /**
   * Log de erro - sempre envia para remote em produção
   * @param message - Mensagem de erro
   * @param error - Objeto de erro (opcional)
   * @param context - Contexto adicional (opcional)
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;

    const errorData = {
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      context,
    };

    if (this.config.enableConsole) {
      console.error(this.formatMessage('error', message), errorData);
    }

    // Erros SEMPRE vão para remote (exceto se disabled)
    this.sendToRemote('error', message, errorData);
  }

  /**
   * Atualiza configuração do logger
   * @param config - Nova configuração
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Retorna configuração atual
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Instância singleton
export const logger = new Logger();

// Exportar também a classe para testes
export { Logger };
export type { LogLevel, LoggerConfig };

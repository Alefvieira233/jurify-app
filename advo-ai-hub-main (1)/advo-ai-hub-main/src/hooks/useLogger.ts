import { useCallback } from 'react';
import { logger } from '@/utils/logger';

/**
 * Hook para usar o logger em componentes React
 *
 * @example
 * const log = useLogger();
 *
 * log.debug('Debug info', { data: 'value' });
 * log.info('User logged in', { userId: 123 });
 * log.warn('Deprecated feature used');
 * log.error('Failed to save', error, { userId: 123 });
 */
export const useLogger = () => {
  const debug = useCallback((message: string, ...args: any[]) => {
    logger.debug(message, ...args);
  }, []);

  const info = useCallback((message: string, ...args: any[]) => {
    logger.info(message, ...args);
  }, []);

  const warn = useCallback((message: string, ...args: any[]) => {
    logger.warn(message, ...args);
  }, []);

  const error = useCallback((message: string, err?: Error | any, context?: Record<string, any>) => {
    logger.error(message, err, context);
  }, []);

  return {
    debug,
    info,
    warn,
    error,
  };
};

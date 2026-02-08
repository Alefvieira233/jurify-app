import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '../logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    // Force console mode for testing
    logger.configure({ enableConsole: true, enableRemote: false, level: 'debug' });
  });

  it('logs debug messages in debug level', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('test debug');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs info messages', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('test info');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs warn messages', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('test warn');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs error messages', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('test error', new Error('boom'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('respects log level - suppresses debug when level is warn', () => {
    logger.configure({ level: 'warn', enableConsole: true, enableRemote: false });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('should not appear');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('respects log level - suppresses info when level is error', () => {
    logger.configure({ level: 'error', enableConsole: true, enableRemote: false });
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('should not appear');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('suppresses all logs when level is none', () => {
    logger.configure({ level: 'none', enableConsole: true, enableRemote: false });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.debug('nope');
    logger.error('nope');
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('returns config via getConfig', () => {
    logger.configure({ level: 'info', enableConsole: false, enableRemote: true });
    const config = logger.getConfig();
    expect(config.level).toBe('info');
    expect(config.enableConsole).toBe(false);
    expect(config.enableRemote).toBe(true);
  });

  it('handles error method with unknown error type', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('something failed', 'string-error');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

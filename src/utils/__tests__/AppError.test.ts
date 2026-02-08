import { describe, it, expect } from 'vitest';
import { AppError, ErrorSeverity } from '../AppError';

describe('AppError', () => {
  it('creates error with default values', () => {
    const error = new AppError('Something went wrong');

    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.severity).toBe(ErrorSeverity.ERROR);
    expect(error.metadata).toEqual({});
    expect(error.originalError).toBeUndefined();
    expect(error.name).toBe('AppError');
  });

  it('creates error with custom options', () => {
    const original = new Error('original');
    const error = new AppError('Custom error', {
      code: 'CUSTOM_CODE',
      severity: ErrorSeverity.CRITICAL,
      metadata: { userId: '123' },
      originalError: original,
    });

    expect(error.code).toBe('CUSTOM_CODE');
    expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    expect(error.metadata).toEqual({ userId: '123' });
    expect(error.originalError).toBe(original);
  });

  it('serializes to JSON correctly', () => {
    const error = new AppError('Test', { code: 'TEST', severity: ErrorSeverity.WARNING });
    const json = error.toJSON();

    expect(json.name).toBe('AppError');
    expect(json.message).toBe('Test');
    expect(json.code).toBe('TEST');
    expect(json.severity).toBe(ErrorSeverity.WARNING);
    expect(json).toHaveProperty('stack');
    expect(json).not.toHaveProperty('originalError');
  });

  describe('AppError.from', () => {
    it('returns same instance if already AppError', () => {
      const original = new AppError('Already AppError', { code: 'EXISTING' });
      const result = AppError.from(original);

      expect(result).toBe(original);
      expect(result.code).toBe('EXISTING');
    });

    it('wraps standard Error', () => {
      const original = new Error('Standard error');
      const result = AppError.from(original);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Standard error');
      expect(result.code).toBe('INTERNAL_ERROR');
      expect(result.originalError).toBe(original);
    });

    it('wraps string error', () => {
      const result = AppError.from('string error');

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('string error');
      expect(result.code).toBe('STRING_ERROR');
    });

    it('wraps unknown error with default message', () => {
      const result = AppError.from(42);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.originalError).toBe(42);
    });

    it('wraps null/undefined with default message', () => {
      const result = AppError.from(null, 'Custom default');

      expect(result.message).toBe('Custom default');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });
});

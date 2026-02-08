import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError, ErrorSeverity } from '@/utils/AppError';

// Mock Sentry
vi.mock('@sentry/react', () => ({
  withScope: vi.fn((cb) => cb({
    setTag: vi.fn(),
    setLevel: vi.fn(),
    setExtras: vi.fn(),
  })),
  captureException: vi.fn(),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('ErrorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AppError.from normalizes standard Error', () => {
    const err = new Error('test');
    const appErr = AppError.from(err);
    expect(appErr).toBeInstanceOf(AppError);
    expect(appErr.message).toBe('test');
    expect(appErr.code).toBe('INTERNAL_ERROR');
  });

  it('AppError.from normalizes string', () => {
    const appErr = AppError.from('string error');
    expect(appErr.message).toBe('string error');
    expect(appErr.code).toBe('STRING_ERROR');
  });

  it('AppError.from normalizes unknown types', () => {
    const appErr = AppError.from({ foo: 'bar' });
    expect(appErr.message).toBe('An unexpected error occurred');
    expect(appErr.code).toBe('UNKNOWN_ERROR');
  });

  it('AppError preserves severity', () => {
    const err = new AppError('critical', { severity: ErrorSeverity.CRITICAL });
    expect(err.severity).toBe(ErrorSeverity.CRITICAL);
  });
});

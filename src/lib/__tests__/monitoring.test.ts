import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  }),
}));

import monitoring, { withErrorTracking } from '../monitoring';

describe('monitoring service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes captureError method', () => {
    expect(typeof monitoring.captureError).toBe('function');
  });

  it('exposes trackMetric method', () => {
    expect(typeof monitoring.trackMetric).toBe('function');
  });

  it('exposes trackAction method', () => {
    expect(typeof monitoring.trackAction).toBe('function');
  });

  it('exposes getRecentErrors method', () => {
    expect(typeof monitoring.getRecentErrors).toBe('function');
  });

  it('exposes clearErrors method', () => {
    expect(typeof monitoring.clearErrors).toBe('function');
  });

  it('can track user action', () => {
    monitoring.trackAction('login', { userId: 'test' });
    // Method exists and doesn't throw
    expect(true).toBe(true);
  });

  it('can track custom metric', () => {
    monitoring.trackMetric('custom_metric', 42);
    // Method exists and doesn't throw
    expect(true).toBe(true);
  });

  it('can capture error', () => {
    const error = new Error('Test error');
    monitoring.captureError(error, { component: 'test' });
    const errors = monitoring.getRecentErrors();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('clearErrors resets error list', () => {
    monitoring.captureError(new Error('test'));
    monitoring.clearErrors();
    
    const errors = monitoring.getRecentErrors();
    expect(errors).toHaveLength(0);
  });
});

describe('withErrorTracking', () => {
  it('wraps synchronous function', () => {
    const fn = vi.fn(() => 'success');
    const wrapped = withErrorTracking(fn, { component: 'test' });
    
    expect(wrapped()).toBe('success');
    expect(fn).toHaveBeenCalled();
  });

  it('captures errors from sync function', () => {
    const error = new Error('sync error');
    const fn = vi.fn(() => { throw error; });
    const wrapped = withErrorTracking(fn, { component: 'test' });
    
    expect(() => wrapped()).toThrow('sync error');
  });

  it('wraps asynchronous function', async () => {
    const fn = vi.fn().mockResolvedValue('async success');
    const wrapped = withErrorTracking(fn, { component: 'test' });
    
    await expect(wrapped()).resolves.toBe('async success');
    expect(fn).toHaveBeenCalled();
  });
});

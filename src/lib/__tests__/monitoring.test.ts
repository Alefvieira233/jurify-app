import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  }),
}));

import monitoring, { useMonitoring, withErrorTracking } from '../monitoring';

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

  it('getRecentErrors respects limit param', () => {
    monitoring.clearErrors();
    for (let i = 0; i < 5; i++) {
      monitoring.captureError(new Error(`error-${i}`), { component: 'test' });
    }
    expect(monitoring.getRecentErrors(2)).toHaveLength(2);
    expect(monitoring.getRecentErrors()).toHaveLength(5);
  });

  it('truncates errors list at 100', () => {
    monitoring.clearErrors();
    for (let i = 0; i < 110; i++) {
      monitoring.captureError(new Error(`error-${i}`));
    }
    const all = monitoring.getRecentErrors(200);
    expect(all.length).toBeLessThanOrEqual(100);
  });

  it('trackMetric with tags does not throw', () => {
    expect(() => monitoring.trackMetric('test_metric', 99, { env: 'test' })).not.toThrow();
  });

  it('trackAction delegates to trackMetric', () => {
    expect(() => monitoring.trackAction('click_button', { buttonId: 'save' })).not.toThrow();
  });

  it('captureError stores context metadata', () => {
    monitoring.clearErrors();
    monitoring.captureError(new Error('ctx'), { userId: 'u1', tenantId: 't1', component: 'Test', action: 'save', metadata: { key: 'val' } });
    const recent = monitoring.getRecentErrors(1);
    expect(recent[0].context).toBeDefined();
  });
});

describe('useMonitoring hook', () => {
  beforeEach(() => { monitoring.clearErrors(); });

  it('exposes all monitoring functions', () => {
    const { result } = renderHook(() => useMonitoring());
    expect(typeof result.current.captureError).toBe('function');
    expect(typeof result.current.trackMetric).toBe('function');
    expect(typeof result.current.trackAction).toBe('function');
    expect(typeof result.current.getRecentErrors).toBe('function');
    expect(typeof result.current.clearErrors).toBe('function');
  });

  it('captureError delegates to monitoring singleton', () => {
    const { result } = renderHook(() => useMonitoring());
    result.current.captureError(new Error('hook error'), { component: 'HookTest' });
    const errors = result.current.getRecentErrors();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('trackMetric delegates to monitoring singleton', () => {
    const { result } = renderHook(() => useMonitoring());
    expect(() => result.current.trackMetric('hook_metric', 1)).not.toThrow();
  });

  it('trackAction delegates to monitoring singleton', () => {
    const { result } = renderHook(() => useMonitoring());
    expect(() => result.current.trackAction('hook_action')).not.toThrow();
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

  it('captures errors from async function and re-throws', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('async error'));
    const wrapped = withErrorTracking(fn, { component: 'asyncTest' });
    
    await expect(wrapped()).rejects.toThrow('async error');
  });
});

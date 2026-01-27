import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));
    expect(result.current).toBe('test');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Value should now be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } }
    );

    // Rapid updates
    rerender({ value: 'second' });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    rerender({ value: 'third' });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Should still be first
    expect(result.current).toBe('first');

    // Complete the full delay
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Should now be third (not second)
    expect(result.current).toBe('third');
  });

  it('should work with different types', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 123 } }
    );

    expect(result.current).toBe(123);

    rerender({ value: 456 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(456);
  });

  it('should handle objects', () => {
    const obj1 = { name: 'John', age: 30 };
    const obj2 = { name: 'Jane', age: 25 };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: obj1 } }
    );

    expect(result.current).toBe(obj1);

    rerender({ value: obj2 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(obj2);
  });

  it('should use default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBe('updated');
  });
});

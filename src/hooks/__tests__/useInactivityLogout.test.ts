import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInactivityLogout } from '../useInactivityLogout';

describe('useInactivityLogout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onLogout after timeout expires', () => {
    const onLogout = vi.fn();
    renderHook(() => useInactivityLogout(onLogout, 5000, true));

    expect(onLogout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('does not call onLogout before timeout', () => {
    const onLogout = vi.fn();
    renderHook(() => useInactivityLogout(onLogout, 5000, true));

    vi.advanceTimersByTime(4999);
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('resets timer on mousemove', () => {
    const onLogout = vi.fn();
    renderHook(() => useInactivityLogout(onLogout, 5000, true));

    vi.advanceTimersByTime(4000);
    window.dispatchEvent(new Event('mousemove'));

    vi.advanceTimersByTime(4000);
    expect(onLogout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('resets timer on keydown', () => {
    const onLogout = vi.fn();
    renderHook(() => useInactivityLogout(onLogout, 5000, true));

    vi.advanceTimersByTime(4000);
    window.dispatchEvent(new Event('keydown'));

    vi.advanceTimersByTime(4999);
    expect(onLogout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('resets timer on scroll', () => {
    const onLogout = vi.fn();
    renderHook(() => useInactivityLogout(onLogout, 5000, true));

    vi.advanceTimersByTime(3000);
    window.dispatchEvent(new Event('scroll'));

    vi.advanceTimersByTime(4999);
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('resets timer on touchstart', () => {
    const onLogout = vi.fn();
    renderHook(() => useInactivityLogout(onLogout, 5000, true));

    vi.advanceTimersByTime(4500);
    window.dispatchEvent(new Event('touchstart'));

    vi.advanceTimersByTime(4500);
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('does NOT set timer when enabled is false', () => {
    const onLogout = vi.fn();
    renderHook(() => useInactivityLogout(onLogout, 5000, false));

    vi.advanceTimersByTime(10000);
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const onLogout = vi.fn();
    const { unmount } = renderHook(() => useInactivityLogout(onLogout, 5000, true));

    unmount();
    vi.advanceTimersByTime(10000);
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('uses default 30 min timeout', () => {
    const onLogout = vi.fn();
    renderHook(() => useInactivityLogout(onLogout));

    vi.advanceTimersByTime(30 * 60 * 1000 - 1);
    expect(onLogout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

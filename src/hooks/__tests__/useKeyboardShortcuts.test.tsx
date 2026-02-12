import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  const fireKey = (key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers })
    );
  };

  it('calls callback when matching key is pressed', () => {
    const cb = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'k', callback: cb, description: 'test' }])
    );

    fireKey('k');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does not call callback for non-matching key', () => {
    const cb = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'k', callback: cb, description: 'test' }])
    );

    fireKey('j');
    expect(cb).not.toHaveBeenCalled();
  });

  it('matches Ctrl modifier', () => {
    const cb = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'k', ctrl: true, callback: cb, description: 'search' },
      ])
    );

    // Without Ctrl — should NOT fire
    fireKey('k');
    expect(cb).not.toHaveBeenCalled();

    // With Ctrl — should fire
    fireKey('k', { ctrlKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('matches Shift modifier', () => {
    const cb = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'n', shift: true, callback: cb, description: 'new' },
      ])
    );

    fireKey('n', { shiftKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('matches Alt modifier', () => {
    const cb = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'h', alt: true, callback: cb, description: 'help' },
      ])
    );

    fireKey('h', { altKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('matches Meta key as Ctrl equivalent', () => {
    const cb = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'k', ctrl: true, callback: cb, description: 'search' },
      ])
    );

    fireKey('k', { metaKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('handles multiple shortcuts', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'a', callback: cb1, description: 'action a' },
        { key: 'b', callback: cb2, description: 'action b' },
      ])
    );

    fireKey('a');
    fireKey('b');
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('is case-insensitive', () => {
    const cb = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'K', callback: cb, description: 'test' }])
    );

    fireKey('k');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('removes listener on unmount', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', callback: cb, description: 'test' }])
    );

    unmount();
    fireKey('x');
    expect(cb).not.toHaveBeenCalled();
  });
});

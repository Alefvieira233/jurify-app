import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { reducer, useToast, toast } from '../use-toast';

describe('use-toast reducer', () => {
  const baseState = { toasts: [] as Array<{ id: string; open?: boolean; title?: string; onOpenChange?: (open: boolean) => void }> };

  describe('ADD_TOAST', () => {
    it('adds a toast to empty state', () => {
      const newToast = { id: '1', title: 'Hello', open: true, onOpenChange: vi.fn() };
      const result = reducer(baseState, { type: 'ADD_TOAST', toast: newToast });
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].title).toBe('Hello');
    });

    it('respects TOAST_LIMIT of 1', () => {
      const state = {
        toasts: [{ id: '1', title: 'First', open: true, onOpenChange: vi.fn() }],
      };
      const newToast = { id: '2', title: 'Second', open: true, onOpenChange: vi.fn() };
      const result = reducer(state, { type: 'ADD_TOAST', toast: newToast });
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].title).toBe('Second');
    });

    it('prepends new toast', () => {
      const result = reducer(baseState, {
        type: 'ADD_TOAST',
        toast: { id: 'a', title: 'A', open: true, onOpenChange: vi.fn() },
      });
      expect(result.toasts[0].id).toBe('a');
    });
  });

  describe('UPDATE_TOAST', () => {
    it('updates matching toast by id', () => {
      const state = {
        toasts: [{ id: '1', title: 'Original', open: true, onOpenChange: vi.fn() }],
      };
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      });
      expect(result.toasts[0].title).toBe('Updated');
    });

    it('leaves non-matching toasts unchanged', () => {
      const state = {
        toasts: [{ id: '1', title: 'Keep', open: true, onOpenChange: vi.fn() }],
      };
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '999', title: 'Nope' },
      });
      expect(result.toasts[0].title).toBe('Keep');
    });
  });

  describe('DISMISS_TOAST', () => {
    it('sets open=false for specific toast', () => {
      const state = {
        toasts: [{ id: '1', title: 'Hello', open: true, onOpenChange: vi.fn() }],
      };
      const result = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' });
      expect(result.toasts[0].open).toBe(false);
    });

    it('dismisses all toasts when toastId is undefined', () => {
      const state = {
        toasts: [
          { id: '1', title: 'A', open: true, onOpenChange: vi.fn() },
        ],
      };
      const result = reducer(state, { type: 'DISMISS_TOAST' });
      expect(result.toasts.every((t) => t.open === false)).toBe(true);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('removes specific toast', () => {
      const state = {
        toasts: [{ id: '1', title: 'Hello', open: true, onOpenChange: vi.fn() }],
      };
      const result = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' });
      expect(result.toasts).toHaveLength(0);
    });

    it('removes all toasts when toastId is undefined', () => {
      const state = {
        toasts: [{ id: '1', title: 'A', open: true, onOpenChange: vi.fn() }],
      };
      const result = reducer(state, { type: 'REMOVE_TOAST' });
      expect(result.toasts).toHaveLength(0);
    });

    it('does not remove non-matching toasts', () => {
      const state = {
        toasts: [{ id: '1', title: 'Keep', open: true, onOpenChange: vi.fn() }],
      };
      const result = reducer(state, { type: 'REMOVE_TOAST', toastId: '999' });
      expect(result.toasts).toHaveLength(1);
    });
  });
});

describe('toast function', () => {
  it('returns id, dismiss, and update', () => {
    const result = toast({ title: 'Test' });
    expect(result).toHaveProperty('id');
    expect(typeof result.dismiss).toBe('function');
    expect(typeof result.update).toBe('function');
  });

  it('generates unique ids', () => {
    const t1 = toast({ title: 'A' });
    const t2 = toast({ title: 'B' });
    expect(t1.id).not.toBe(t2.id);
  });
});

describe('useToast hook', () => {
  it('returns toast function and dismiss', () => {
    const { result } = renderHook(() => useToast());
    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('toasts array is initially empty or has last toast', () => {
    const { result } = renderHook(() => useToast());
    expect(Array.isArray(result.current.toasts)).toBe(true);
  });

  it('adding a toast updates state', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'New Toast' });
    });

    expect(result.current.toasts.length).toBeGreaterThanOrEqual(1);
    expect(result.current.toasts[0]?.title).toBe('New Toast');
  });

  it('dismiss removes toast from state', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;
    act(() => {
      const t = result.current.toast({ title: 'To Dismiss' });
      toastId = t.id;
    });

    act(() => {
      result.current.dismiss(toastId!);
    });

    // After dismiss, toast should be closed
    const dismissedToast = result.current.toasts.find((t) => t.id === toastId!);
    if (dismissedToast) {
      expect(dismissedToast.open).toBe(false);
    }
  });
});

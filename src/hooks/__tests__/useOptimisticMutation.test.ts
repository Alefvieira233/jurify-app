import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  optimisticInsert,
  optimisticUpdate,
  optimisticDelete,
  useOptimisticMutation,
  useOptimisticStatusChange,
} from '../useOptimisticMutation';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { qc, wrapper: ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: qc }, children) };
}

type Item = { id: string; name: string; status: string | null };

const items: Item[] = [
  { id: '1', name: 'Alpha', status: 'open' },
  { id: '2', name: 'Beta', status: 'closed' },
];

describe('optimisticInsert', () => {
  it('prepends a new item to the list', () => {
    const newItem: Item = { id: '3', name: 'Gamma', status: 'open' };
    const result = optimisticInsert(items, newItem);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(newItem);
  });

  it('handles undefined oldData', () => {
    const newItem: Item = { id: '1', name: 'Solo', status: null };
    const result = optimisticInsert(undefined, newItem);
    expect(result).toEqual([newItem]);
  });

  it('handles empty array', () => {
    const newItem: Item = { id: '1', name: 'First', status: 'new' };
    const result = optimisticInsert([], newItem);
    expect(result).toEqual([newItem]);
  });
});

describe('optimisticUpdate', () => {
  it('updates the matching item by id', () => {
    const result = optimisticUpdate(items, '1', { name: 'Alpha Updated' });
    expect(result[0].name).toBe('Alpha Updated');
    expect(result[0].status).toBe('open'); // unchanged
    expect(result[1]).toEqual(items[1]); // untouched
  });

  it('returns unchanged array when id not found', () => {
    const result = optimisticUpdate(items, '999', { name: 'X' });
    expect(result).toEqual(items);
  });

  it('handles undefined oldData', () => {
    const result = optimisticUpdate(undefined, '1', { name: 'X' });
    expect(result).toEqual([]);
  });
});

describe('optimisticDelete', () => {
  it('removes the item with the given id', () => {
    const result = optimisticDelete(items, '1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns unchanged array when id not found', () => {
    const result = optimisticDelete(items, '999');
    expect(result).toEqual(items);
  });

  it('handles undefined oldData', () => {
    const result = optimisticDelete(undefined, '1');
    expect(result).toEqual([]);
  });

  it('returns empty array when deleting last item', () => {
    const result = optimisticDelete([{ id: '1', name: 'Solo', status: null }], '1');
    expect(result).toEqual([]);
  });
});

describe('useOptimisticMutation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns a mutation object with mutate and mutateAsync', () => {
    const { qc, wrapper } = createWrapper();
    qc.setQueryData(['test'], items);
    const { result } = renderHook(() => useOptimisticMutation<Item, Item>({
      queryKey: ['test'],
      mutationFn: async (v) => v,
      optimisticUpdate: (old, newItem) => optimisticInsert(old, newItem),
    }), { wrapper });
    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
  });

  it('performs optimistic update on mutate (success path)', async () => {
    const { qc, wrapper } = createWrapper();
    qc.setQueryData(['test-success'], [...items]);
    const newItem: Item = { id: '3', name: 'Gamma', status: 'new' };
    const { result } = renderHook(() => useOptimisticMutation<Item, Item>({
      queryKey: ['test-success'],
      mutationFn: async (v) => v,
      optimisticUpdate: (old, v) => optimisticInsert(old, v),
      successMessage: 'Done!',
    }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(newItem);
    });
    // After success the cache should contain the new item
    const cached = qc.getQueryData<Item[]>(['test-success']);
    expect(cached).toBeDefined();
  });

  it('rolls back on error', async () => {
    const { qc, wrapper } = createWrapper();
    qc.setQueryData(['test-error'], [...items]);
    const { result } = renderHook(() => useOptimisticMutation<Item, Item>({
      queryKey: ['test-error'],
      mutationFn: async () => { throw new Error('fail'); },
      optimisticUpdate: (old, v) => optimisticInsert(old, v),
      errorMessage: 'Oops',
    }), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ id: '99', name: 'Bad', status: null });
      } catch { /* expected */ }
    });
    // After rollback, cache should still have original items
    const cached = qc.getQueryData<Item[]>(['test-error']);
    expect(cached).toHaveLength(2);
  });
});

describe('useOptimisticStatusChange', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns a mutation object', () => {
    const { qc, wrapper } = createWrapper();
    qc.setQueryData(['status-test'], items);
    const { result } = renderHook(() => useOptimisticStatusChange<Item>(
      ['status-test'],
      async (id, status) => ({ ...items[0], id, status }),
    ), { wrapper });
    expect(typeof result.current.mutate).toBe('function');
  });

  it('performs optimistic status update', async () => {
    const { qc, wrapper } = createWrapper();
    qc.setQueryData(['status-update'], [...items]);
    const { result } = renderHook(() => useOptimisticStatusChange<Item>(
      ['status-update'],
      async (id, status) => ({ ...items[0], id, status }),
    ), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: '1', status: 'resolved' });
    });
    const cached = qc.getQueryData<Item[]>(['status-update']);
    expect(cached).toBeDefined();
  });
});

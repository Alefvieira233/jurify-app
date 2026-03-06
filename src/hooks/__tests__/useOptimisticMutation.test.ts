import { describe, it, expect } from 'vitest';
import {
  optimisticInsert,
  optimisticUpdate,
  optimisticDelete,
} from '../useOptimisticMutation';

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

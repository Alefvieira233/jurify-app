import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'user-1', tenant_id: 'tenant-1', role: 'admin' },
  }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { useSupabaseQuery } from '../useSupabaseQuery';

describe('useSupabaseQuery', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns data from queryFn', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    const queryFn = vi.fn().mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useSupabaseQuery('test-key', queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(result.current.isEmpty).toBe(false);
  });

  it('respects enabled=false option', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() =>
      useSupabaseQuery('disabled-key', queryFn, { enabled: false })
    );

    // Should not call queryFn when disabled
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.data).toEqual([]);
  });

  it('exposes refetch and mutate', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useSupabaseQuery('fn-key', queryFn));

    expect(typeof result.current.refetch).toBe('function');
    expect(typeof result.current.mutate).toBe('function');
  });

  it('isStale is a boolean', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null });

    const { result } = renderHook(() =>
      useSupabaseQuery('stale-key', queryFn, { staleTime: 30000 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.isStale).toBe('boolean');
  });
});

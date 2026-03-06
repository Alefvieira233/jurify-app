import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockLogs = [
  { id: 'log1', tipo: 'login', descricao: 'User logged in', created_at: '2025-01-01' },
  { id: 'log2', tipo: 'edicao', descricao: 'Edited lead', created_at: '2025-01-02' },
];

const mockRpc = vi.fn().mockResolvedValue({ data: mockLogs, error: null, count: 2 });

vi.mock('@/integrations/supabase/client', () => {
  const client = { rpc: (...args: unknown[]) => mockRpc(...args) };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'user-1', tenant_id: 'tenant-1', role: 'admin' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { useActivityLogs } from '../useActivityLogs';

describe('useActivityLogs', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useActivityLogs(), { wrapper: createWrapper() });
    expect(result.current.logs).toEqual([]);
  });

  it('exposes logActivity function', () => {
    const { result } = renderHook(() => useActivityLogs(), { wrapper: createWrapper() });
    expect(typeof result.current.logActivity).toBe('function');
  });

  it('exposes fetchLogs function', () => {
    const { result } = renderHook(() => useActivityLogs(), { wrapper: createWrapper() });
    expect(typeof result.current.fetchLogs).toBe('function');
  });

  it('exposes clearLogs function', () => {
    const { result } = renderHook(() => useActivityLogs(), { wrapper: createWrapper() });
    expect(typeof result.current.clearOldLogs).toBe('function');
  });

  it('exposes exportLogs function', () => {
    const { result } = renderHook(() => useActivityLogs(), { wrapper: createWrapper() });
    expect(typeof result.current.exportLogs).toBe('function');
  });

  it('totalCount starts at zero', () => {
    const { result } = renderHook(() => useActivityLogs(), { wrapper: createWrapper() });
    expect(result.current.totalCount).toBe(0);
  });
});

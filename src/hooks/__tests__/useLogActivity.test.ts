import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockLogActivity = vi.fn().mockResolvedValue(undefined);

vi.mock('../useActivityLogs', () => ({
  useActivityLogs: () => ({
    logActivity: mockLogActivity,
    logs: [],
    loading: false,
    totalCount: 0,
    fetchLogs: vi.fn(),
    clearOldLogs: vi.fn(),
    exportLogs: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'user-1', tenant_id: 'tenant-1', role: 'admin', nome_completo: 'Test User' },
  }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { useLogActivity } from '../useLogActivity';

describe('useLogActivity', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exposes logging convenience functions', () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    expect(typeof result.current.log).toBe('function');
    expect(typeof result.current.logLogin).toBe('function');
    expect(typeof result.current.logLogout).toBe('function');
    expect(typeof result.current.logLeadCreated).toBe('function');
    expect(typeof result.current.logLeadUpdated).toBe('function');
    expect(typeof result.current.logLeadDeleted).toBe('function');
    expect(typeof result.current.logContractCreated).toBe('function');
    expect(typeof result.current.logContractUpdated).toBe('function');
    expect(typeof result.current.logError).toBe('function');
  });

  it('logLeadCreated calls underlying logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    await result.current.logLeadCreated('Lead João');
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it('logLogin calls underlying logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    await result.current.logLogin();
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it('logError calls underlying logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    await result.current.logError('test-module', 'Something failed');
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it('log calls underlying logActivity with custom params', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    await result.current.log('criacao', 'leads', 'Custom log');
    expect(mockLogActivity).toHaveBeenCalled();
  });
});

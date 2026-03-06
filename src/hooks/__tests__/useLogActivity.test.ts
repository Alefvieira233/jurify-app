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

  it('logLogout calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logLogout();
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logLeadUpdated calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logLeadUpdated('Lead ABC');
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logLeadDeleted calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logLeadDeleted('Lead XYZ');
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logContractCreated calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logContractCreated('c1', 'Client A');
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logContractUpdated calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logContractUpdated('c1', 'Client A');
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logAppointmentCreated calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logAppointmentCreated({ data_hora: '2025-03-01T10:00:00Z' });
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logAgenteCreated calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logAgenteCreated('Agent Alpha');
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logAgenteUpdated calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logAgenteUpdated('Agent Alpha');
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logAgenteStatusChanged calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logAgenteStatusChanged('Agent Alpha', 'active');
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logApiKeyCreated calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logApiKeyCreated('My Key');
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logApiKeyToggled calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logApiKeyToggled('My Key', true);
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logAgenteExecution calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logAgenteExecution('Agent Alpha', 'success', 1500);
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });

  it('logN8NTest calls logActivity', async () => {
    const { result } = renderHook(() => useLogActivity(), { wrapper: createWrapper() });
    result.current.logN8NTest(true, 'http://n8n.local');
    await vi.waitFor(() => expect(mockLogActivity).toHaveBeenCalled());
  });
});

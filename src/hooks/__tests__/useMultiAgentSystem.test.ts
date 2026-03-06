import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function createChainableQuery() {
  const result = { data: [], error: null, count: 0 };
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') return (f?: (v: unknown) => unknown, r?: (e: unknown) => unknown) => Promise.resolve(result).then(f, r);
      if (prop === 'catch') return (r?: (e: unknown) => unknown) => Promise.resolve(result).catch(r);
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock('@/integrations/supabase/client', () => {
  const client = {
    from: () => createChainableQuery(),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/lib/multiagents/MultiAgentSystem', () => ({
  multiAgentSystem: {
    initialize: vi.fn(),
    processNewLead: vi.fn().mockResolvedValue({ success: true }),
    getSystemStats: vi.fn().mockReturnValue({ totalAgents: 7, activeAgents: 0, messagesProcessed: 0 }),
    sendMessage: vi.fn(),
  },
}));

vi.mock('@/lib/multiagents/types', () => ({
  MessageType: { TASK_ASSIGNMENT: 'task_assignment', SYSTEM_COMMAND: 'system_command' },
  Priority: { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' },
}));

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

import { useMultiAgentSystem } from '../useMultiAgentSystem';

describe('useMultiAgentSystem', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useMultiAgentSystem(), { wrapper: createWrapper() });
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.recentActivity).toEqual([]);
  });

  it('exposes processLead function', () => {
    const { result } = renderHook(() => useMultiAgentSystem(), { wrapper: createWrapper() });
    expect(typeof result.current.processLead).toBe('function');
  });

  it('exposes testSystem function', () => {
    const { result } = renderHook(() => useMultiAgentSystem(), { wrapper: createWrapper() });
    expect(typeof result.current.testSystem).toBe('function');
  });

  it('exposes triggerAnalysis function', () => {
    const { result } = renderHook(() => useMultiAgentSystem(), { wrapper: createWrapper() });
    expect(typeof result.current.triggerAnalysis).toBe('function');
  });

  it('exposes loadSystemStats and loadMetrics', () => {
    const { result } = renderHook(() => useMultiAgentSystem(), { wrapper: createWrapper() });
    expect(typeof result.current.loadSystemStats).toBe('function');
    expect(typeof result.current.loadMetrics).toBe('function');
  });
});

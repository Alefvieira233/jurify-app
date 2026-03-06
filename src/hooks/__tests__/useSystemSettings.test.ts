import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockSettings = [
  { id: '1', key: 'theme', value: 'dark', category: 'ui', description: 'Theme', is_sensitive: false, tenant_id: 'tenant-1' },
  { id: '2', key: 'language', value: 'pt-BR', category: 'ui', description: 'Language', is_sensitive: false, tenant_id: 'tenant-1' },
  { id: '3', key: 'api_key', value: 'secret', category: 'integrations', description: 'API Key', is_sensitive: true, tenant_id: 'tenant-1' },
];

function createChainableQuery(data: unknown = mockSettings, error: unknown = null) {
  const result = { data, error };
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (e: unknown) => unknown
        ) => Promise.resolve(result).then(onFulfilled, onRejected);
      }
      if (prop === 'catch') {
        return (onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(result).catch(onRejected);
      }
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock('@/integrations/supabase/client', () => {
  const client = {
    from: () => createChainableQuery(),
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
  };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'user-1', tenant_id: 'tenant-1', role: 'admin', nome_completo: 'Test User' },
  }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { useSystemSettings } from '../useSystemSettings';

describe('useSystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches settings on mount', async () => {
    const { result } = renderHook(() => useSystemSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toHaveLength(3);
  });

  it('exposes updateSetting function', async () => {
    const { result } = renderHook(() => useSystemSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.updateSetting).toBe('function');
  });

  it('getSettingsByCategory filters correctly', async () => {
    const { result } = renderHook(() => useSystemSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.settings).toHaveLength(3);
    });

    const uiSettings = result.current.getSettingsByCategory('ui');
    expect(uiSettings).toHaveLength(2);
    expect(uiSettings[0].key).toBe('theme');
    expect(uiSettings[1].key).toBe('language');
  });

  it('getSettingsByCategory returns empty for unknown category', async () => {
    const { result } = renderHook(() => useSystemSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.settings).toHaveLength(3);
    });

    const unknown = result.current.getSettingsByCategory('nonexistent');
    expect(unknown).toHaveLength(0);
  });

  it('getSettingValue returns correct value', async () => {
    const { result } = renderHook(() => useSystemSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.settings).toHaveLength(3);
    });

    expect(result.current.getSettingValue('theme')).toBe('dark');
    expect(result.current.getSettingValue('language')).toBe('pt-BR');
  });

  it('getSettingValue returns empty string for unknown key', async () => {
    const { result } = renderHook(() => useSystemSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.settings).toHaveLength(3);
    });

    expect(result.current.getSettingValue('nonexistent')).toBe('');
  });

  it('isUpdating starts as false', async () => {
    const { result } = renderHook(() => useSystemSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isUpdating).toBe(false);
  });
});

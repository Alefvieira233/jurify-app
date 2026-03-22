import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockTags = [
  { id: 't1', nome: 'Urgente', cor: '#ef4444', tenant_id: 'tenant-1', categoria: 'prioridade', ordem: 0, ativo: true, created_at: '' },
  { id: 't2', nome: 'VIP', cor: '#eab308', tenant_id: 'tenant-1', categoria: 'qualificacao', ordem: 1, ativo: true, created_at: '' },
];

function createChainableQuery() {
  const result = { data: mockTags, error: null };
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
  const client = { from: () => createChainableQuery() };
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

import { useTags, useLeadTags } from '../useTags';

describe('useTags', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('initializes with empty tags array', () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    expect(result.current.tags).toEqual([]);
  });

  it('exposes CRUD functions', () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    expect(typeof result.current.createTag).toBe('function');
    expect(typeof result.current.updateTag).toBe('function');
    expect(typeof result.current.deleteTag).toBe('function');
  });

  it('exposes loading and creating states', () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isCreating).toBe('boolean');
  });
});

describe('useLeadTags', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns empty array when leadId is null', () => {
    const { result } = renderHook(() => useLeadTags(null), { wrapper: createWrapper() });
    expect(result.current.leadTags).toEqual([]);
  });

  it('exposes add/remove functions', () => {
    const { result } = renderHook(() => useLeadTags('lead-1'), { wrapper: createWrapper() });
    expect(typeof result.current.addTag).toBe('function');
    expect(typeof result.current.removeTag).toBe('function');
  });
});

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useConexoes, useConexaoLogs, useConexaoAlertas } from '../useConexoes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'test-user', tenant_id: 'test-tenant' },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useConexoes Hooks', () => {
  it('useConexoes initializes with default state', () => {
    const { result } = renderHook(() => useConexoes(), { wrapper });
    expect(result.current.conexoes).toEqual([]);
    expect(typeof result.current.createConexao).toBe('function');
    expect(typeof result.current.updateConexao).toBe('function');
    expect(typeof result.current.deleteConexao).toBe('function');
  });

  it('useConexaoLogs initializes for a connection ID', () => {
    const { result } = renderHook(() => useConexaoLogs('conn-123'), { wrapper });
    expect(result.current.data).toBeUndefined();
  });

  it('useConexaoAlertas initializes for a connection ID', () => {
    const { result } = renderHook(() => useConexaoAlertas('conn-123'), { wrapper });
    expect(result.current.data).toBeUndefined();
  });
});

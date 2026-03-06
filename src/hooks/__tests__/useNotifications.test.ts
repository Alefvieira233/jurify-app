import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotifications } from '../useNotifications';

const mockNotifications = [
  {
    id: 'n1',
    titulo: 'Bem-vindo',
    mensagem: 'Bem-vindo ao Jurify!',
    tipo: 'info',
    lido_por: [],
    data_criacao: '2025-01-01T00:00:00Z',
    created_by: 'system',
    tenant_id: 'tenant-1',
    ativo: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: null,
  },
  {
    id: 'n2',
    titulo: 'Alerta',
    mensagem: 'Novo lead!',
    tipo: 'alerta',
    lido_por: ['user-1'],
    data_criacao: '2025-01-02T00:00:00Z',
    created_by: 'system',
    tenant_id: 'tenant-1',
    ativo: true,
    created_at: '2025-01-02T00:00:00Z',
    updated_at: null,
  },
];

function createChainableQuery(data: unknown = mockNotifications, error: unknown = null) {
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

const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });

vi.mock('@/integrations/supabase/client', () => {
  const client = {
    from: () => createChainableQuery(),
    rpc: (...args: unknown[]) => mockRpc(...args),
  };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'user-1', tenant_id: 'tenant-1', role: 'admin', nome_completo: 'Test' },
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

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches notifications on mount', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(2);
  });

  it('counts unread notifications correctly', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // n1 has empty lido_por (unread for user-1), n2 has user-1 in lido_por (read)
    expect(result.current.unreadCount).toBe(1);
  });

  it('isRead returns correct value', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    expect(result.current.isRead(result.current.notifications[0])).toBe(false);
    expect(result.current.isRead(result.current.notifications[1])).toBe(true);
  });

  it('exposes markAsRead, markAllAsRead, createNotification functions', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.markAsRead).toBe('function');
    expect(typeof result.current.markAllAsRead).toBe('function');
    expect(typeof result.current.createNotification).toBe('function');
  });

  it('markAsRead calls rpc and updates state', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(mockRpc).toHaveBeenCalledWith('marcar_notificacao_lida', {
      notificacao_id: 'n1',
      user_id: 'user-1',
    });
  });

  it('markAllAsRead calls rpc and resets unreadCount', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockRpc).toHaveBeenCalledWith('marcar_todas_lidas', {
      user_id: 'user-1',
    });
    expect(result.current.unreadCount).toBe(0);
  });

  it('createNotification calls insert and shows toast', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.createNotification('Test Title', 'Test Message', 'info');
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Notificacao criada' })
    );
  });

  it('exposes fetchNotifications function', async () => {
    const { result } = renderHook(() => useNotifications());
    expect(typeof result.current.fetchNotifications).toBe('function');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useWhatsAppWindow } from '../useWhatsAppWindow';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

const { supabase } = await import('@/integrations/supabase/client');

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe('useWhatsAppWindow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('janela aberta — permite envio de texto livre', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        is_open: true,
        last_inbound_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
        expires_at: new Date(Date.now() + 22 * 3600_000).toISOString(),
        remaining_hours: 22,
        age_hours: 2,
        reason: 'within_window',
      },
      error: null,
    } as never);

    const { result } = renderHook(() => useWhatsAppWindow('conv-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isOpen).toBe(true);
    expect(result.current.requiresTemplate).toBe(false);
    expect(result.current.remainingHours).toBe(22);
    expect(result.current.formattedRemaining).toBe('22h');
  });

  it('janela fechada — exige template', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        is_open: false,
        last_inbound_at: new Date(Date.now() - 30 * 3600_000).toISOString(),
        expires_at: new Date(Date.now() - 6 * 3600_000).toISOString(),
        remaining_hours: 0,
        age_hours: 30,
        reason: 'window_closed',
      },
      error: null,
    } as never);

    const { result } = renderHook(() => useWhatsAppWindow('conv-2'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.requiresTemplate).toBe(true);
    expect(result.current.formattedRemaining).toBe('Fechada');
  });

  it('sem inbound — fechada, motivo no_inbound_yet', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        is_open: false,
        last_inbound_at: null,
        expires_at: null,
        remaining_hours: 0,
        reason: 'no_inbound_yet',
      },
      error: null,
    } as never);

    const { result } = renderHook(() => useWhatsAppWindow('conv-3'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.status.reason).toBe('no_inbound_yet');
    expect(result.current.requiresTemplate).toBe(true);
  });

  it('formattedRemaining usa minutos quando < 1h', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        is_open: true,
        last_inbound_at: new Date(Date.now() - 23.5 * 3600_000).toISOString(),
        expires_at: new Date(Date.now() + 0.5 * 3600_000).toISOString(),
        remaining_hours: 0.5,
        age_hours: 23.5,
        reason: 'within_window',
      },
      error: null,
    } as never);

    const { result } = renderHook(() => useWhatsAppWindow('conv-4'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.formattedRemaining).toBe('30 min');
  });

  it('sem conversationId — não dispara query, retorna default', () => {
    const { result } = renderHook(() => useWhatsAppWindow(null), { wrapper });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.requiresTemplate).toBe(true);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useSubscription, type TrialStatus } from '../useSubscription';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test-1' } }),
}));

const { supabase } = await import('@/integrations/supabase/client');

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

const TRIALING_STATUS: TrialStatus = {
  has_subscription: true,
  is_trial: true,
  expired: false,
  status: 'trialing',
  plan_tier: 'trial',
  plan_name: 'Trial 45 dias',
  days_remaining: 30,
  trial_start_date: '2026-04-01T00:00:00Z',
  trial_end_date: '2026-06-15T00:00:00Z',
  restrictions: {
    create_lead: true, edit_lead: true,
    create_processo: true, edit_processo: true,
    create_contrato: true, edit_contrato: true,
    send_whatsapp: true, ai_responder: true,
    create_agendamento: true, create_documento: true,
    view_data: true, receive_whatsapp: true,
  },
};

const EXPIRED_STATUS: TrialStatus = {
  ...TRIALING_STATUS,
  expired: true,
  status: 'expired',
  days_remaining: 0,
  restrictions: {
    create_lead: false, edit_lead: false,
    create_processo: false, edit_processo: false,
    create_contrato: false, edit_contrato: false,
    send_whatsapp: false, ai_responder: false,
    create_agendamento: false, create_documento: false,
    view_data: true, receive_whatsapp: true,
  },
};

describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna isTrialing=true e permite todas ações em trial ativo', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: TRIALING_STATUS, error: null } as never);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isTrialing).toBe(true);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.daysRemaining).toBe(30);
    expect(result.current.can('create_lead')).toBe(true);
    expect(result.current.can('send_whatsapp')).toBe(true);
    expect(result.current.can('ai_responder')).toBe(true);
  });

  it('retorna isExpired=true e bloqueia mutations quando trial expira', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: EXPIRED_STATUS, error: null } as never);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isExpired).toBe(true);
    expect(result.current.isTrialing).toBeFalsy();
    expect(result.current.can('create_lead')).toBe(false);
    expect(result.current.can('create_processo')).toBe(false);
    expect(result.current.can('create_contrato')).toBe(false);
    expect(result.current.can('send_whatsapp')).toBe(false);
    expect(result.current.can('ai_responder')).toBe(false);
    expect(result.current.can('edit_lead')).toBe(false);
  });

  it('preserva view_data e receive_whatsapp mesmo após expirar (read-only graceful)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: EXPIRED_STATUS, error: null } as never);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.can('view_data')).toBe(true);
    expect(result.current.can('receive_whatsapp')).toBe(true);
  });

  it('cai em modo permissivo quando RPC retorna sem subscription', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { has_subscription: false, is_trial: false, expired: false, status: 'no_subscription', restrictions: {} },
      error: null,
    } as never);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Sem subscription = legacy/enterprise = permite tudo (DEFAULT_PERMISSIVE)
    expect(result.current.isExpired).toBe(false);
    expect(result.current.can('create_lead')).toBe(true);
    expect(result.current.can('send_whatsapp')).toBe(true);
  });
});

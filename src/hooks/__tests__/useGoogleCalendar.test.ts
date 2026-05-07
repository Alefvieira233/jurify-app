/**
 * Tests for Google Calendar OAuth - CSRF Protection (server-side binding 2026-05-07).
 *
 * Modelo novo: state crypto-random é gerado SERVER-SIDE pela edge function
 * google-calendar (RPC create_oauth_pending_state) e persistido em
 * oauth_pending_states com vínculo ao user_id atual + redirect_uri + TTL 10min.
 * Na callback, exchangeCode consome o state via consume_oauth_pending_state
 * (single-use, valida user_id == auth.uid()). Frontend NÃO mais usa
 * localStorage — binding fica em DB.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGoogleCalendar } from '../useGoogleCalendar';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
    profile: { id: 'test-user-id-123', tenant_id: 'tenant-1', nome_completo: 'Test User' },
  }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

let callCount = 0;
function createChainableQuery() {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        callCount++;
        if (callCount <= 1) {
          return (
            onFulfilled?: (v: unknown) => unknown,
            onRejected?: (e: unknown) => unknown
          ) => Promise.resolve({ data: null, error: { code: 'PGRST116' } }).then(onFulfilled, onRejected);
        }
        return (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (e: unknown) => unknown
        ) => Promise.resolve({
          data: {
            id: 'settings-1',
            tenant_id: 'tenant-1',
            user_id: 'test-user-id-123',
            calendar_enabled: false,
            auto_sync: true,
            sync_direction: 'jurify_to_google',
            notification_enabled: true,
          },
          error: null,
        }).then(onFulfilled, onRejected);
      }
      if (prop === 'catch') {
        return (onRejected?: (e: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).catch(onRejected);
      }
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock('@/integrations/supabase/client', () => {
  const client = { from: () => createChainableQuery() };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/lib/google/GoogleOAuthService', () => ({
  GoogleOAuthService: {
    isConfigured: vi.fn(() => true),
    getAuthUrl: vi.fn(async () => `https://accounts.google.com/o/oauth2/v2/auth?state=server-generated-state`),
    getStatus: vi.fn().mockResolvedValue({ connected: false, email: null, name: null, picture: null, connectedAt: null }),
    revokeTokens: vi.fn().mockResolvedValue(undefined),
    exchangeCodeForTokens: vi.fn().mockResolvedValue({ email: null, name: null }),
    createEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
    updateEvent: vi.fn().mockResolvedValue({}),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

let locationDescriptor: PropertyDescriptor | undefined;
beforeEach(() => {
  locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: { ...window.location, href: '' },
  });
});

afterEach(() => {
  if (locationDescriptor) {
    Object.defineProperty(window, 'location', locationDescriptor);
  }
});

async function waitForLoadSettings() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 100));
  });
}

describe('Google Calendar OAuth — server-side state binding (P1 fix 2026-05-07)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    callCount = 0;
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    vi.mocked(GoogleOAuthService.isConfigured).mockReturnValue(true);
    vi.mocked(GoogleOAuthService.getAuthUrl).mockImplementation(
      async () => `https://accounts.google.com/o/oauth2/v2/auth?state=server-generated-state`
    );
    vi.mocked(GoogleOAuthService.getStatus).mockResolvedValue({
      connected: false, email: null, name: null, picture: null, connectedAt: null,
    });
  });

  it('initializeGoogleAuth deve invocar getAuthUrl SEM args (state gerado pelo server)', async () => {
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    const { result } = renderHook(() => useGoogleCalendar(), { wrapper: createWrapper() });
    await waitForLoadSettings();

    act(() => {
      result.current.initializeGoogleAuth();
    });
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    expect(GoogleOAuthService.getAuthUrl).toHaveBeenCalled();
    vi.mocked(GoogleOAuthService.getAuthUrl).mock.calls.forEach(call => {
      expect(call.length).toBe(0);
    });
  });

  it('initializeGoogleAuth NÃO deve persistir state em localStorage (binding agora é server-side)', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useGoogleCalendar(), { wrapper: createWrapper() });
    await waitForLoadSettings();

    act(() => {
      result.current.initializeGoogleAuth();
    });
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    const oauthStateWrites = setItemSpy.mock.calls.filter(c => c[0] === 'google_oauth_state');
    expect(oauthStateWrites.length).toBe(0);
    setItemSpy.mockRestore();
  });

  it('exchangeCodeForTokens deve receber (code, state) — binding check no server', async () => {
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    await GoogleOAuthService.exchangeCodeForTokens('test-code', 'test-state-from-server');
    expect(GoogleOAuthService.exchangeCodeForTokens).toHaveBeenCalledWith('test-code', 'test-state-from-server');
  });

  it('getAuthUrl mock retorna URL com parâmetro state embutido', async () => {
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    const url = await GoogleOAuthService.getAuthUrl();
    expect(url).toContain('state=');
    expect(url).toContain('accounts.google.com');
  });

  it('estados gerados SERVER-SIDE: cada chamada produz nova URL (server gera state distinto)', async () => {
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    let counter = 0;
    vi.mocked(GoogleOAuthService.getAuthUrl).mockImplementation(async () => {
      counter += 1;
      return `https://accounts.google.com/o/oauth2/v2/auth?state=server-state-${counter}`;
    });
    const url1 = await GoogleOAuthService.getAuthUrl();
    const url2 = await GoogleOAuthService.getAuthUrl();
    expect(url1).not.toBe(url2);
    expect(url1).toContain('server-state-1');
    expect(url2).toContain('server-state-2');
  });
});

describe('Google Calendar — connection lifecycle smoke', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    callCount = 0;
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    vi.mocked(GoogleOAuthService.isConfigured).mockReturnValue(true);
    vi.mocked(GoogleOAuthService.getStatus).mockResolvedValue({
      connected: false, email: null, name: null, picture: null, connectedAt: null,
    });
  });

  it('not configured: initializeGoogleAuth shows toast and bails', async () => {
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    vi.mocked(GoogleOAuthService.isConfigured).mockReturnValue(false);

    const { result } = renderHook(() => useGoogleCalendar(), { wrapper: createWrapper() });
    await waitForLoadSettings();

    act(() => {
      result.current.initializeGoogleAuth();
    });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    expect(mockToast).toHaveBeenCalled();
    expect(GoogleOAuthService.getAuthUrl).not.toHaveBeenCalled();
  });
});

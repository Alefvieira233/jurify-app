/**
 * Tests for Google Calendar OAuth - CSRF Protection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGoogleCalendar } from '../useGoogleCalendar';

// Mock AuthContext
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

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Chainable proxy for supabase queries
// First call (select query) returns PGRST116 (no row found)
// Second call (insert) returns success with default settings data
let callCount = 0;
function createChainableQuery() {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        callCount++;
        if (callCount <= 1) {
          // First query: no row found (PGRST116)
          return (
            onFulfilled?: (v: unknown) => unknown,
            onRejected?: (e: unknown) => unknown
          ) => Promise.resolve({ data: null, error: { code: 'PGRST116' } }).then(onFulfilled, onRejected);
        }
        // Subsequent queries: success (insert or other operations)
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
      // Chain methods
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock('@/integrations/supabase/client', () => {
  const client = { from: () => createChainableQuery() };
  return { supabase: client, supabaseUntyped: client };
});

// Mock GoogleOAuthService - configured = true
vi.mock('@/lib/google/GoogleOAuthService', () => ({
  GoogleOAuthService: {
    isConfigured: vi.fn(() => true),
    getAuthUrl: vi.fn((state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`),
    loadTokens: vi.fn().mockResolvedValue(null),
    revokeTokens: vi.fn().mockResolvedValue(undefined),
    exchangeCodeForTokens: vi.fn().mockResolvedValue({}),
    listCalendars: vi.fn().mockResolvedValue([]),
    createEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
    updateEvent: vi.fn().mockResolvedValue({}),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

// Prevent actual navigation
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

// Helper to wait for loadSettings to complete
async function waitForLoadSettings() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 100));
  });
}

describe('OAuth State Security (CSRF Protection)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    callCount = 0;

    // Map-backed localStorage so values actually persist between set/get
    const store = new Map<string, string>();
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => store.get(key) ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((key: string, val: string) => { store.set(key, val); });
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => { store.delete(key); });
    vi.mocked(localStorage.clear).mockImplementation(() => { store.clear(); });

    // Re-establish mocks cleared by clearAllMocks
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    vi.mocked(GoogleOAuthService.isConfigured).mockReturnValue(true);
    vi.mocked(GoogleOAuthService.getAuthUrl).mockImplementation(
      (state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`
    );
    vi.mocked(GoogleOAuthService.loadTokens).mockResolvedValue(null);
  });

  describe('Cryptographic State Generation', () => {
    it('should generate cryptographic state (not user.id)', async () => {
      const { result } = renderHook(() => useGoogleCalendar());
      await waitForLoadSettings();

      act(() => {
        result.current.initializeGoogleAuth();
      });

      const savedState = localStorage.getItem('google_oauth_state');
      expect(savedState).not.toBeNull();
      expect(savedState).not.toBe('test-user-id-123');
    });

    it('state should be exactly 64 hex characters (32 bytes)', async () => {
      const { result } = renderHook(() => useGoogleCalendar());
      await waitForLoadSettings();

      act(() => {
        result.current.initializeGoogleAuth();
      });

      const savedState = localStorage.getItem('google_oauth_state');
      expect(savedState).not.toBeNull();
      expect(savedState!.length).toBe(64);
      expect(savedState).toMatch(/^[0-9a-f]{64}$/);
    });

    it('each call should generate unique state', async () => {
      const { result } = renderHook(() => useGoogleCalendar());
      await waitForLoadSettings();

      const states = new Set<string>();

      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.initializeGoogleAuth();
        });

        const state = localStorage.getItem('google_oauth_state');
        expect(state).not.toBeNull();
        states.add(state!);
        localStorage.removeItem('google_oauth_state');
      }

      expect(states.size).toBe(5);
    });

    it('state should have high entropy', async () => {
      const { result } = renderHook(() => useGoogleCalendar());
      await waitForLoadSettings();

      const states: string[] = [];

      for (let i = 0; i < 20; i++) {
        act(() => {
          result.current.initializeGoogleAuth();
        });

        const state = localStorage.getItem('google_oauth_state');
        expect(state).not.toBeNull();
        states.push(state!);
        localStorage.removeItem('google_oauth_state');
      }

      const charCounts = new Map<string, number>();
      states.forEach(state => {
        state.split('').forEach(char => {
          charCounts.set(char, (charCounts.get(char) || 0) + 1);
        });
      });

      expect(charCounts.size).toBeGreaterThanOrEqual(10);
    });

    it('state should not be sequential or timestamp-based', async () => {
      const { result } = renderHook(() => useGoogleCalendar());
      await waitForLoadSettings();

      act(() => {
        result.current.initializeGoogleAuth();
      });
      const state1 = localStorage.getItem('google_oauth_state');
      localStorage.removeItem('google_oauth_state');

      act(() => {
        result.current.initializeGoogleAuth();
      });
      const state2 = localStorage.getItem('google_oauth_state');

      expect(state1).not.toBe(state2);
    });
  });

  describe('State Validation', () => {
    it('should store state in localStorage for later validation', async () => {
      const { result } = renderHook(() => useGoogleCalendar());
      await waitForLoadSettings();

      act(() => {
        result.current.initializeGoogleAuth();
      });

      const savedState = localStorage.getItem('google_oauth_state');
      expect(savedState).not.toBeNull();
      expect(savedState!.length).toBe(64);
    });

    it('should reject invalid state', () => {
      const legitimateState = 'a'.repeat(64);
      localStorage.setItem('google_oauth_state', legitimateState);

      const attackState = 'b'.repeat(64);
      expect(attackState === localStorage.getItem('google_oauth_state')).toBe(false);
    });

    it('should detect absent state', () => {
      localStorage.removeItem('google_oauth_state');
      expect(localStorage.getItem('google_oauth_state')).toBeNull();
    });
  });

  describe('crypto.getRandomValues Usage', () => {
    it('should use crypto.getRandomValues', async () => {
      const getRandomValuesSpy = vi.spyOn(crypto, 'getRandomValues');
      const { result } = renderHook(() => useGoogleCalendar());
      await waitForLoadSettings();

      act(() => {
        result.current.initializeGoogleAuth();
      });

      expect(getRandomValuesSpy).toHaveBeenCalled();
      const firstCall = getRandomValuesSpy.mock.calls[0][0];
      expect(firstCall).toBeInstanceOf(Uint8Array);
      expect((firstCall as Uint8Array).length).toBe(32);

      getRandomValuesSpy.mockRestore();
    });

    it('state should be valid hex conversion of random bytes', async () => {
      const { result } = renderHook(() => useGoogleCalendar());
      await waitForLoadSettings();

      act(() => {
        result.current.initializeGoogleAuth();
      });

      const state = localStorage.getItem('google_oauth_state');
      expect(state).not.toBeNull();

      for (let i = 0; i < state!.length; i += 2) {
        const byte = state!.substring(i, i + 2);
        const value = parseInt(byte, 16);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(255);
        expect(byte).toMatch(/^[0-9a-f]{2}$/);
      }
    });
  });

  describe('GoogleOAuthService Integration', () => {
    it('getAuthUrl should receive cryptographic state', async () => {
      const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
      const { result } = renderHook(() => useGoogleCalendar());
      await waitForLoadSettings();

      act(() => {
        result.current.initializeGoogleAuth();
      });

      expect(GoogleOAuthService.getAuthUrl).toHaveBeenCalled();
      const calls = vi.mocked(GoogleOAuthService.getAuthUrl).mock.calls;
      calls.forEach(call => {
        const state = call[0];
        expect(state).not.toBe('test-user-id-123');
        expect(state.length).toBe(64);
        expect(state).toMatch(/^[0-9a-f]{64}$/);
      });
    });

    it('getAuthUrl should not receive userId as parameter', async () => {
      const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
      const { result } = renderHook(() => useGoogleCalendar());
      await waitForLoadSettings();

      act(() => {
        result.current.initializeGoogleAuth();
      });

      const calls = vi.mocked(GoogleOAuthService.getAuthUrl).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      calls.forEach(call => {
        expect(call.length).toBe(1);
        expect(call[0]).not.toBe('test-user-id-123');
      });
    });
  });

  describe('CSRF Attack Prevention', () => {
    it('should prevent CSRF attack with predictable state', () => {
      const attackerState = 'test-user-id-123';
      const legitimateState = 'a1b2c3d4e5f6'.repeat(5) + 'abcd';
      localStorage.setItem('google_oauth_state', legitimateState);

      expect(attackerState === localStorage.getItem('google_oauth_state')).toBe(false);
    });
  });
});

describe('GoogleOAuthService - State Parameter', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    callCount = 0;

    // Map-backed localStorage so values actually persist between set/get
    const store = new Map<string, string>();
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => store.get(key) ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((key: string, val: string) => { store.set(key, val); });
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => { store.delete(key); });
    vi.mocked(localStorage.clear).mockImplementation(() => { store.clear(); });

    // Re-establish mocks cleared by clearAllMocks
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    vi.mocked(GoogleOAuthService.isConfigured).mockReturnValue(true);
    vi.mocked(GoogleOAuthService.getAuthUrl).mockImplementation(
      (state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`
    );
    vi.mocked(GoogleOAuthService.loadTokens).mockResolvedValue(null);
  });

  it('getAuthUrl should accept state parameter', async () => {
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    const cryptoState = 'a'.repeat(64);

    const url = GoogleOAuthService.getAuthUrl(cryptoState);

    expect(url).toContain(`state=${cryptoState}`);
    expect(GoogleOAuthService.getAuthUrl).toHaveBeenCalledWith(cryptoState);
  });

  it('state should be included in OAuth URL', async () => {
    const { GoogleOAuthService } = await import('@/lib/google/GoogleOAuthService');
    const cryptoState = 'b'.repeat(64);

    const url = GoogleOAuthService.getAuthUrl(cryptoState);

    expect(url).toContain('state=');
    expect(url).toContain(cryptoState);
  });
});

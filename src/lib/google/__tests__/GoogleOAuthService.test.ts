import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleOAuthService } from '../GoogleOAuthService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('GoogleOAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.origin
    vi.stubGlobal('location', { origin: 'http://localhost:3000' });
  });

  it('isConfigured returns true if VITE_GOOGLE_CLIENT_ID is set', () => {
    // Note: VITE_GOOGLE_CLIENT_ID might be set in the test environment or not.
    // We just test the logic.
    const originalValue = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Test logic directly
    expect(GoogleOAuthService.isConfigured()).toBe(!!originalValue);
  });

  it('getAuthUrl calls the edge function', async () => {
    const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?state=xyz';
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { authUrl: mockAuthUrl },
      error: null,
    });

    // Mock isConfigured to return true
    vi.spyOn(GoogleOAuthService, 'isConfigured').mockReturnValue(true);

    const url = await GoogleOAuthService.getAuthUrl();
    expect(url).toBe(mockAuthUrl);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('google-calendar', {
      body: {
        action: 'initiateAuth',
        data: { redirectUri: 'http://localhost:3000/auth/google/callback' },
      },
    });
  });

  it('exchangeCodeForTokens calls the edge function', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true, email: 'test@example.com', name: 'Test User' },
      error: null,
    });

    const result = await GoogleOAuthService.exchangeCodeForTokens('test-code', 'test-state');
    expect(result).toEqual({
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(supabase.functions.invoke).toHaveBeenCalledWith('google-calendar', {
      body: {
        action: 'exchangeCode',
        data: {
          code: 'test-code',
          redirectUri: 'http://localhost:3000/auth/google/callback',
          state: 'test-state',
        },
      },
    });
  });

  it('getStatus returns connection status', async () => {
    const mockStatus = {
      connected: true,
      email: 'test@example.com',
      name: 'Test User',
      picture: 'http://example.com/pic.jpg',
      connectedAt: '2026-01-01T00:00:00Z',
    };
    (supabase.functions.invoke as any).mockResolvedValue({
      data: mockStatus,
      error: null,
    });

    const status = await GoogleOAuthService.getStatus();
    expect(status).toEqual(mockStatus);
  });

  it('revokeTokens calls disconnect action', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true },
      error: null,
    });

    await GoogleOAuthService.revokeTokens();
    expect(supabase.functions.invoke).toHaveBeenCalledWith('google-calendar', {
      body: { action: 'disconnect', data: {} },
    });
  });

  it('listEvents calls the edge function with parameters', async () => {
    const mockEvents = [{ id: '1', summary: 'Event 1' }];
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { events: mockEvents },
      error: null,
    });

    const events = await GoogleOAuthService.listEvents('primary', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z');
    expect(events).toEqual(mockEvents);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('google-calendar', {
      body: {
        action: 'listEvents',
        data: { calendarId: 'primary', timeMin: '2026-01-01T00:00:00Z', timeMax: '2026-01-02T00:00:00Z' },
      },
    });
  });
});

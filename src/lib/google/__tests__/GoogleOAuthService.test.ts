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

  it('createEvent calls the edge function', async () => {
    const mockEvent = { id: 'new-id', summary: 'New Event' };
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { event: mockEvent },
      error: null,
    });

    const eventData = {
      summary: 'New Event',
      start: { dateTime: '2026-01-01T10:00:00Z' },
      end: { dateTime: '2026-01-01T11:00:00Z' },
    };

    const result = await GoogleOAuthService.createEvent('primary', eventData);
    expect(result).toEqual(mockEvent);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('google-calendar', {
      body: {
        action: 'createEvent',
        data: { calendarId: 'primary', eventData },
      },
    });
  });

  it('updateEvent calls the edge function', async () => {
    const mockEvent = { id: 'id1', summary: 'Updated Event' };
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { event: mockEvent },
      error: null,
    });

    const eventData = { summary: 'Updated Event' };
    const result = await GoogleOAuthService.updateEvent('primary', 'id1', eventData);
    expect(result).toEqual(mockEvent);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('google-calendar', {
      body: {
        action: 'updateEvent',
        data: { calendarId: 'primary', eventId: 'id1', eventData },
      },
    });
  });

  it('deleteEvent calls the edge function', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true },
      error: null,
    });

    await GoogleOAuthService.deleteEvent('primary', 'id1');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('google-calendar', {
      body: {
        action: 'deleteEvent',
        data: { calendarId: 'primary', eventId: 'id1' },
      },
    });
  });

  it('handles edge function errors gracefully', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: { message: 'Api error' },
    });

    await expect(GoogleOAuthService.getStatus()).rejects.toThrow('google-calendar edge function error: Api error');
  });

  it('handles empty response data', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(GoogleOAuthService.getStatus()).rejects.toThrow('google-calendar edge function returned no data');
  });
});

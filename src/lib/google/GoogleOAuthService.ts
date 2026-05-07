/**
 * Google OAuth Service — thin wrapper over the `google-calendar` Edge Function.
 *
 * This file used to handle OAuth tokens directly from the browser (read/write to
 * google_calendar_tokens). That approach had three problems:
 *   1. Browser reading tokens requires shipping them to the client — leaking them to XSS.
 *   2. The table stores tokens encrypted with a key that lives only in Supabase Secrets
 *      (ENCRYPTION_KEY), so the browser cannot decrypt them anyway.
 *   3. Writing plaintext into columns named `_encrypted` is encryption theater.
 *
 * All Google OAuth and Calendar operations now go through the `google-calendar` Edge
 * Function, which handles token exchange, storage (encrypted), refresh, and API calls
 * server-side. The browser only ever sees event data and UI-facing metadata (email,
 * name, picture) — never OAuth tokens.
 *
 * Fixed by audit 2026-04-10 (task P1-5 / task 5).
 */

import { supabase } from '@/integrations/supabase/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI =
  import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
  `${window.location.origin}/auth/google/callback`;

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

async function invokeEdge<TResponse>(
  action: string,
  data: Record<string, unknown> = {}
): Promise<TResponse> {
  const { data: fnData, error } = await supabase.functions.invoke('google-calendar', {
    body: { action, data },
  });

  if (error) {
    throw new Error(`google-calendar edge function error: ${error.message}`);
  }
  if (!fnData) {
    throw new Error('google-calendar edge function returned no data');
  }
  return fnData as TResponse;
}

export class GoogleOAuthService {
  /** Whether the public Google client ID is configured in env. */
  static isConfigured(): boolean {
    return !!GOOGLE_CLIENT_ID;
  }

  /**
   * Build an OAuth URL by asking the edge function.
   * Server gera o state crypto-random, persiste em oauth_pending_states com
   * binding ao user_id e ao redirect_uri, e devolve a URL do Google. O state
   * vem embutido na URL retornada.
   */
  static async getAuthUrl(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error(
        'Google OAuth não configurado. Configure VITE_GOOGLE_CLIENT_ID no .env e GOOGLE_CLIENT_SECRET nos Supabase Secrets.'
      );
    }
    const { authUrl } = await invokeEdge<{ authUrl: string }>('initiateAuth', {
      redirectUri: GOOGLE_REDIRECT_URI,
    });
    return authUrl;
  }

  /**
   * Exchange auth code → tokens (tokens stored encrypted server-side).
   * O state recebido na URL de callback DEVE ser repassado aqui — server faz
   * binding check (single-use, expira em 10min, vincula ao user_id atual).
   */
  static async exchangeCodeForTokens(code: string, state: string): Promise<{
    email: string | null;
    name: string | null;
  }> {
    if (!state || typeof state !== 'string') {
      throw new Error('OAuth state ausente — bloqueado por proteção CSRF.');
    }
    const result = await invokeEdge<{ success: boolean; email?: string; name?: string }>(
      'exchangeCode',
      { code, redirectUri: GOOGLE_REDIRECT_URI, state }
    );
    return {
      email: result.email ?? null,
      name: result.name ?? null,
    };
  }

  /** Current connection status — never returns tokens. */
  static async getStatus(): Promise<{
    connected: boolean;
    email: string | null;
    name: string | null;
    picture: string | null;
    connectedAt: string | null;
  }> {
    return await invokeEdge('status');
  }

  /** Disconnect and revoke tokens server-side. */
  static async revokeTokens(): Promise<void> {
    await invokeEdge('disconnect');
  }

  // ==========================================
  // GOOGLE CALENDAR API (all server-side)
  // ==========================================

  static async listEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<Record<string, unknown>[]> {
    const { events } = await invokeEdge<{ events: Record<string, unknown>[] }>(
      'listEvents',
      { calendarId, timeMin, timeMax }
    );
    return events;
  }

  static async createEvent(
    calendarId: string,
    eventData: CalendarEvent
  ): Promise<Record<string, unknown>> {
    const { event } = await invokeEdge<{ event: Record<string, unknown> }>(
      'createEvent',
      { calendarId, eventData }
    );
    return event;
  }

  static async updateEvent(
    calendarId: string,
    eventId: string,
    eventData: Partial<CalendarEvent>
  ): Promise<Record<string, unknown>> {
    const { event } = await invokeEdge<{ event: Record<string, unknown> }>(
      'updateEvent',
      { calendarId, eventId, eventData }
    );
    return event;
  }

  static async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await invokeEdge('deleteEvent', { calendarId, eventId });
  }
}

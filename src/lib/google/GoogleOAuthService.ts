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
import { deriveCodeChallenge, generateCodeVerifier } from '@/lib/security/pkce';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI =
  import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
  `${window.location.origin}/auth/google/callback`;

/**
 * sessionStorage key for the active PKCE code_verifier. Scoped to the tab
 * that initiated OAuth so concurrent tabs cannot accidentally pick up each
 * other's flows. Cleared on success and on any failure path during the
 * exchange.
 */
const PKCE_VERIFIER_STORAGE_KEY = 'gcal_pkce_verifier';

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
   * Build an OAuth URL by asking the edge function. Generates a fresh PKCE
   * code_verifier per call and stashes it in sessionStorage so that
   * `exchangeCodeForTokens` (called after Google redirects back) can prove
   * possession to Google's token endpoint. Defends against authorization
   * code interception in addition to the existing `state` CSRF check.
   *
   * @param state Crypto-random CSRF state; caller must store it and validate on callback.
   */
  static async getAuthUrl(state: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error(
        'Google OAuth não configurado. Configure VITE_GOOGLE_CLIENT_ID no .env e GOOGLE_CLIENT_SECRET nos Supabase Secrets.'
      );
    }
    if (!state || state.length < 16) {
      throw new Error('OAuth state must be a crypto-random string ≥16 chars.');
    }

    // PKCE: generate verifier locally, send only the SHA-256 challenge.
    const verifier = generateCodeVerifier();
    const codeChallenge = await deriveCodeChallenge(verifier);

    // Persist verifier so the callback handler can present it. sessionStorage
    // limits scope to the originating tab and clears on tab close.
    try {
      sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier);
    } catch {
      // Private browsing or storage disabled — surface a clear error rather
      // than initiating a flow we won't be able to complete.
      throw new Error(
        'Não foi possível iniciar o fluxo seguro do Google (sessionStorage indisponível). ' +
        'Saia do modo anônimo ou habilite armazenamento local e tente novamente.'
      );
    }

    const { authUrl } = await invokeEdge<{ authUrl: string }>('initiateAuth', {
      redirectUri: GOOGLE_REDIRECT_URI,
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
    });
    return authUrl;
  }

  /**
   * Exchange auth code → tokens (tokens stored encrypted server-side).
   * Reads the PKCE verifier persisted by `getAuthUrl` and clears it on
   * either success or failure to ensure single-use semantics.
   */
  static async exchangeCodeForTokens(code: string): Promise<{
    email: string | null;
    name: string | null;
  }> {
    let verifier: string | null = null;
    try {
      verifier = sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
    } catch {
      verifier = null;
    }

    if (!verifier) {
      throw new Error(
        'Fluxo OAuth incompleto: verificador PKCE ausente. Inicie a conexão do Google Calendar novamente.'
      );
    }

    try {
      const result = await invokeEdge<{ success: boolean; email?: string; name?: string }>(
        'exchangeCode',
        { code, redirectUri: GOOGLE_REDIRECT_URI, codeVerifier: verifier }
      );
      return {
        email: result.email ?? null,
        name: result.name ?? null,
      };
    } finally {
      // Single-use: remove regardless of outcome.
      try { sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY); } catch { /* ignore */ }
    }
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

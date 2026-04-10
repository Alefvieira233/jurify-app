/**
 * Google OAuth Service for Edge Functions.
 *
 * Tokens are stored encrypted in google_calendar_tokens.{access_token_encrypted, refresh_token_encrypted}
 * via _shared/crypto.ts (AES-256-GCM with PBKDF2, shared with encrypt-data/decrypt-data edge functions).
 * Plaintext columns were dropped in migration 20260406000002_drop_plaintext_secrets.sql.
 */

import { encrypt, decrypt } from "../_shared/crypto.ts";

interface GoogleTokenRow {
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string;
  scope: string;
  token_type: string;
}

interface GoogleEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; responseStatus?: string }>;
}

export class GoogleOAuthService {
  // deno-lint-ignore no-explicit-any
  private supabase: any;
  private userId: string;

  // deno-lint-ignore no-explicit-any
  constructor(supabase: any, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  async getValidToken(): Promise<string> {
    const { data: tokenRow, error } = await this.supabase
      .from("google_calendar_tokens")
      .select("access_token_encrypted, refresh_token_encrypted, expires_at, scope, token_type")
      .eq("user_id", this.userId)
      .maybeSingle();

    if (error || !tokenRow) throw new Error("Google not connected");

    const row = tokenRow as GoogleTokenRow;

    // If still valid, decrypt and return
    const now = new Date();
    const expiresAt = new Date(row.expires_at);
    if (now < expiresAt && row.access_token_encrypted) {
      return await decrypt(row.access_token_encrypted);
    }

    // Expired — refresh using decrypted refresh token
    if (!row.refresh_token_encrypted) {
      throw new Error("Google access token expired and no refresh token available — user must reconnect");
    }
    const refreshToken = await decrypt(row.refresh_token_encrypted);
    const refreshed = await this.refreshToken(refreshToken);
    return refreshed.access_token;
  }

  private async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    expires_at: string;
  }> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to refresh token: ${err}`);
    }

    const tokenData = await response.json();
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Persist refreshed access token (encrypted). Google may or may not return a new refresh_token.
    const newAccessEncrypted = await encrypt(tokenData.access_token);
    const updatePayload: Record<string, string> = {
      access_token_encrypted: newAccessEncrypted,
      expires_at: expiresAt,
    };
    if (tokenData.refresh_token) {
      updatePayload.refresh_token_encrypted = await encrypt(tokenData.refresh_token);
    }

    await this.supabase
      .from("google_calendar_tokens")
      .update(updatePayload)
      .eq("user_id", this.userId);

    return {
      access_token: tokenData.access_token,
      expires_at: expiresAt,
    };
  }

  async listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<GoogleEvent[]> {
    const accessToken = await this.getValidToken();

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error listing events: ${error.error?.message || "Unknown"}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  async createEvent(calendarId: string, eventData: Partial<GoogleEvent>): Promise<GoogleEvent> {
    const accessToken = await this.getValidToken();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error creating event: ${error.error?.message || "Unknown"}`);
    }

    return await response.json();
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    eventData: Partial<GoogleEvent>,
  ): Promise<GoogleEvent> {
    const accessToken = await this.getValidToken();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error updating event: ${error.error?.message || "Unknown"}`);
    }

    return await response.json();
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const accessToken = await this.getValidToken();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error deleting event: ${error.error?.message || "Unknown"}`);
    }
  }
}

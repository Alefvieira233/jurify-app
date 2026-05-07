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

  async createEvent(
    calendarId: string,
    eventData: Partial<GoogleEvent>,
    withConferenceData = false,
  ): Promise<GoogleEvent> {
    const accessToken = await this.getValidToken();

    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    if (withConferenceData) {
      // Required by Google Calendar API to honor `conferenceData.createRequest`
      url.searchParams.set("conferenceDataVersion", "1");
    }
    if (eventData.attendees && eventData.attendees.length > 0) {
      // Notify attendees about the new event
      url.searchParams.set("sendUpdates", "all");
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

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

  /**
   * FreeBusy query — retorna janelas ocupadas do calendário no intervalo.
   * Usado pra checar disponibilidade real antes de marcar agendamento.
   */
  async queryFreeBusy(
    calendarId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<Array<{ start: string; end: string }>> {
    const accessToken = await this.getValidToken();
    const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: "America/Sao_Paulo",
        items: [{ id: calendarId }],
      }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`FreeBusy query failed: ${error.error?.message || response.status}`);
    }
    const data = await response.json();
    const busy = data?.calendars?.[calendarId]?.busy || [];
    return busy as Array<{ start: string; end: string }>;
  }

  /**
   * Sugere slots livres em janela comercial (seg-sex 8h-20h BRT) considerando free/busy real.
   * Retorna até `count` slots de `slotMinutes` minutos cada, a partir de `fromUTC`.
   * Pula automaticamente fim de semana e fora de janela comercial.
   */
  async suggestFreeSlots(
    calendarId: string,
    fromUTC: Date,
    daysToScan = 7,
    slotMinutes = 60,
    count = 3,
  ): Promise<Array<{ start: string; end: string }>> {
    const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
    const BUSINESS_START = 8;
    const BUSINESS_END = 20;
    const SLOT_MS = slotMinutes * 60 * 1000;

    const timeMin = fromUTC.toISOString();
    const timeMax = new Date(fromUTC.getTime() + daysToScan * 24 * 60 * 60 * 1000).toISOString();

    let busy: Array<{ start: string; end: string }>;
    try {
      busy = await this.queryFreeBusy(calendarId, timeMin, timeMax);
    } catch {
      busy = [];
    }

    const busyRanges = busy.map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()] as const);
    const isBusy = (slotStartMs: number, slotEndMs: number) =>
      busyRanges.some(([bs, be]) => slotStartMs < be && slotEndMs > bs);

    const slots: Array<{ start: string; end: string }> = [];
    const now = Date.now();

    for (let dayOffset = 0; dayOffset < daysToScan && slots.length < count; dayOffset++) {
      const dayBRT = new Date(fromUTC.getTime() - BRT_OFFSET_MS + dayOffset * 24 * 60 * 60 * 1000);
      const dayOfWeek = dayBRT.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      for (let hour = BUSINESS_START; hour < BUSINESS_END && slots.length < count; hour++) {
        const slotBRT = new Date(dayBRT);
        slotBRT.setHours(hour, 0, 0, 0);
        const slotStartMs = slotBRT.getTime() + BRT_OFFSET_MS;
        const slotEndMs = slotStartMs + SLOT_MS;

        if (slotStartMs <= now) continue;
        if (isBusy(slotStartMs, slotEndMs)) continue;

        slots.push({
          start: new Date(slotStartMs).toISOString(),
          end: new Date(slotEndMs).toISOString(),
        });
      }
    }

    return slots;
  }
}

/**
 * Google OAuth Service for Edge Functions
 */

interface GoogleToken {
  access_token: string
  refresh_token: string
  expires_at: string
  scope: string
  token_type: string
}

interface GoogleEvent {
  id?: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: Array<{ email: string; responseStatus?: string }>
}

export class GoogleOAuthService {
  private supabase: any
  private userId: string

  constructor(supabase: any, userId: string) {
    this.supabase = supabase
    this.userId = userId
  }

  async getValidToken(): Promise<string> {
    const { data: token } = await this.supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', this.userId)
      .single()

    if (!token) throw new Error('Google not connected')

    // Check if token expired
    const now = new Date()
    const expiresAt = new Date(token.expires_at)
    
    if (now >= expiresAt) {
      // Refresh token
      const refreshed = await this.refreshToken(token.refresh_token)
      return refreshed.access_token
    }

    return token.access_token
  }

  async exchangeCode(code: string, redirect_uri: string): Promise<Partial<GoogleToken>> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        code,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to exchange code: ${error.error_description || error.error || 'Unknown error'}`)
    }

    const tokenData = await response.json()
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    await this.supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id: this.userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        updated_at: new Date().toISOString(),
      })

    return {
      access_token: tokenData.access_token,
      expires_at: expiresAt.toISOString(),
      scope: tokenData.scope,
      token_type: tokenData.token_type,
    }
  }

  async refreshToken(refreshToken: string): Promise<Partial<GoogleToken>> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) throw new Error('Failed to refresh token')

    const tokenData = await response.json()
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
    
    await this.supabase
      .from('google_calendar_tokens')
      .update({
        access_token: tokenData.access_token,
        expires_at: expiresAt.toISOString(),
      })
      .eq('user_id', this.userId)

    return {
      access_token: tokenData.access_token,
      expires_at: expiresAt.toISOString(),
      scope: tokenData.scope,
      token_type: tokenData.token_type,
    }
  }

  async listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<GoogleEvent[]> {
    const accessToken = await this.getValidToken()

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    })

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Error listing events: ${error.error?.message || 'Unknown'}`)
    }

    const data = await response.json()
    return data.items || []
  }

  async createEvent(calendarId: string, eventData: Partial<GoogleEvent>): Promise<GoogleEvent> {
    const accessToken = await this.getValidToken()

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Error creating event: ${error.error?.message || 'Unknown'}`)
    }

    return await response.json()
  }

  async updateEvent(calendarId: string, eventId: string, eventData: Partial<GoogleEvent>): Promise<GoogleEvent> {
    const accessToken = await this.getValidToken()

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Error updating event: ${error.error?.message || 'Unknown'}`)
    }

    return await response.json()
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const accessToken = await this.getValidToken()

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Error deleting event: ${error.error?.message || 'Unknown'}`)
    }
  }
}

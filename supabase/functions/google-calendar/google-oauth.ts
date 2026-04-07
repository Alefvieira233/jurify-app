/**
 * Google OAuth Service for Edge Functions
 *
 * SECURITY: Handles OAuth exchange, token refresh, and encryption/decryption
 * of sensitive tokens using AES-256-GCM.
 */

interface GoogleToken {
  access_token: string
  refresh_token: string
  expires_at: string
  expires_in?: number
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

  /**
   * Performs OAuth 2.0 code exchange
   */
  async exchangeCode(code: string, redirectUri: string): Promise<GoogleToken> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to exchange code: ${error.error_description || error.error}`)
    }

    const data = await response.json()
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

    const token: GoogleToken = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
      expires_in: data.expires_in,
      scope: data.scope,
      token_type: data.token_type,
    }

    await this.saveTokens(token)
    return token
  }

  async getValidToken(): Promise<string> {
    const { data: token } = await this.supabase
      .from('google_calendar_tokens')
      .select('access_token_encrypted, refresh_token_encrypted, expires_at')
      .eq('user_id', this.userId)
      .single()

    if (!token) throw new Error('Google not connected')

    // Check if token expired
    const now = new Date()
    const expiresAt = new Date(token.expires_at)
    
    // Decrypt access token
    const accessToken = await this.decrypt(token.access_token_encrypted)

    if (now >= expiresAt) {
      // Refresh token
      const refreshToken = await this.decrypt(token.refresh_token_encrypted)
      const refreshed = await this.refreshToken(refreshToken)
      return refreshed.access_token
    }

    return accessToken
  }

  private async saveTokens(token: GoogleToken): Promise<void> {
    const accessTokenEncrypted = await this.encrypt(token.access_token)

    // Fetch existing token to preserve refresh_token if not provided
    const { data: existing } = await this.supabase
      .from('google_calendar_tokens')
      .select('refresh_token_encrypted')
      .eq('user_id', this.userId)
      .single()

    const updateData: any = {
      user_id: this.userId,
      access_token_encrypted: accessTokenEncrypted,
      expires_at: token.expires_at,
      token_type: token.token_type,
      scope: token.scope,
      updated_at: new Date().toISOString(),
    }

    if (token.refresh_token) {
      updateData.refresh_token_encrypted = await this.encrypt(token.refresh_token)
    } else if (existing?.refresh_token_encrypted) {
      updateData.refresh_token_encrypted = existing.refresh_token_encrypted
    }

    const { error } = await this.supabase
      .from('google_calendar_tokens')
      .upsert(updateData)

    if (error) throw new Error(`Failed to save tokens: ${error.message}`)
  }

  async refreshToken(refreshToken: string): Promise<GoogleToken> {
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

    const data = await response.json()
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
    
    const token: GoogleToken = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_at: expiresAt,
      expires_in: data.expires_in,
      scope: data.scope,
      token_type: data.token_type,
    }

    await this.saveTokens(token)

    return token
  }

  // ==========================================
  // ENCRYPTION / DECRYPTION (AES-256-GCM)
  // ==========================================

  private async getEncryptionKey(): Promise<CryptoKey> {
    const keyStr = Deno.env.get('ENCRYPTION_KEY')
    if (!keyStr) throw new Error('ENCRYPTION_KEY not configured')

    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keyStr),
      'PBKDF2',
      false,
      ['deriveKey']
    )
    return keyMaterial
  }

  private async encrypt(plaintext: string): Promise<string> {
    const encoder = new TextEncoder()
    const keyMaterial = await this.getEncryptionKey()
    
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    )

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      encoder.encode(plaintext)
    )

    const toBase64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
    return `${toBase64(salt)}:${toBase64(iv)}:${toBase64(encrypted)}`
  }

  private async decrypt(ciphertext: string): Promise<string> {
    const parts = ciphertext.split(':')
    if (parts.length !== 3) throw new Error('Invalid ciphertext format')

    const fromBase64 = (b64: string) => new Uint8Array(atob(b64).split('').map((c) => c.charCodeAt(0)))
    const salt = fromBase64(parts[0])
    const iv = fromBase64(parts[1])
    const encryptedData = fromBase64(parts[2])

    const keyMaterial = await this.getEncryptionKey()
    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      encryptedData
    )

    return new TextDecoder().decode(decrypted)
  }

  /**
   * Revokes tokens at Google and deletes them from DB
   */
  async revokeTokens(): Promise<void> {
    const { data: token } = await this.supabase
      .from('google_calendar_tokens')
      .select('access_token_encrypted')
      .eq('user_id', this.userId)
      .single()

    if (token?.access_token_encrypted) {
      try {
        const accessToken = await this.decrypt(token.access_token_encrypted)
        // Revoke at Google
        await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: 'POST',
        })
      } catch (e) {
        console.error('Failed to revoke Google token:', e)
      }
    }

    // Always delete from database
    await this.supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', this.userId)
  }

  // ==========================================
  // GOOGLE CALENDAR API
  // ==========================================

  async listCalendars(): Promise<any[]> {
    const accessToken = await this.getValidToken()

    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Error listing calendars: ${error.error?.message || 'Unknown'}`)
    }

    const data = await response.json()
    return data.items || []
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

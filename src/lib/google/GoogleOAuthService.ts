/**
 * ðŸ” GOOGLE OAUTH SERVICE
 *
 * ServiÃ§o para autenticaÃ§Ã£o OAuth2 com Google Calendar API.
 * Gerencia tokens, refresh e chamadas Ã  API.
 *
 * @version 1.0.0
 */

import { supabaseUntyped as supabase } from '@/integrations/supabase/client';

// ConfiguraÃ§Ã£o OAuth do Google
// NOTE: Only CLIENT_ID is in the browser (public). CLIENT_SECRET lives server-side
// in the `google-oauth-exchange` Edge Function.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`;

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export interface GoogleOAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // timestamp
  token_type: string;
  scope: string;
}

export interface CalendarEvent {
  summary: string; // TÃ­tulo
  description?: string;
  start: {
    dateTime: string; // ISO 8601 format
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

export class GoogleOAuthService {
  /**
   * Verifica se as credenciais OAuth estÃ£o configuradas
   */
  static isConfigured(): boolean {
    return !!GOOGLE_CLIENT_ID;
  }

  /**
   * Gera URL de autenticaÃ§Ã£o OAuth do Google
   * @param state - State criptogrÃ¡fico para validaÃ§Ã£o CSRF (nÃ£o user user.id!)
   */
  static getAuthUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth nÃ£o configurado. Configure VITE_GOOGLE_CLIENT_ID no .env e GOOGLE_CLIENT_SECRET nos Supabase Secrets.');
    }

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: GOOGLE_SCOPES,
      access_type: 'offline', // Para obter refresh_token
      prompt: 'consent', // ForÃ§a mostrar tela de consentimento
      state, // State criptogrÃ¡fico para validaÃ§Ã£o CSRF
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Troca o cÃ³digo de autorizaÃ§Ã£o por tokens de acesso
   */
  static async exchangeCodeForTokens(code: string, userId: string): Promise<GoogleOAuthToken> {
    // Token exchange happens server-side via Edge Function (CLIENT_SECRET never in browser)
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      'google-oauth-exchange',
      { body: { code, redirect_uri: GOOGLE_REDIRECT_URI } }
    );

    if (fnError || !fnData) {
      throw new Error(`Erro OAuth: ${fnError?.message || 'Token exchange failed'}`);
    }

    const data = fnData;

    const token: GoogleOAuthToken = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type,
      scope: data.scope,
    };

    // Salvar tokens no banco
    await this.saveTokens(userId, token);

    return token;
  }

  /**
   * Salva tokens no banco de dados
   */
  static async saveTokens(userId: string, token: GoogleOAuthToken): Promise<void> {
    const { error } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id: userId,
        access_token: token.access_token,
        refresh_token: token.refresh_token || null,
        expires_at: new Date(token.expires_at).toISOString(),
        token_type: token.token_type,
        scope: token.scope,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Erro ao salvar tokens: ${error.message}`);
    }
  }

  /**
   * Carrega tokens do banco de dados
   */
  static async loadTokens(userId: string): Promise<GoogleOAuthToken | null> {
    const { data, error } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || undefined,
      expires_at: new Date(data.expires_at).getTime(),
      token_type: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Verifica se o token expirou
   */
  static isTokenExpired(token: GoogleOAuthToken): boolean {
    // Considera expirado se falta menos de 5 minutos
    return token.expires_at - Date.now() < 5 * 60 * 1000;
  }

  /**
   * Atualiza access_token usando refresh_token
   */
  static async refreshAccessToken(userId: string, refreshToken: string): Promise<GoogleOAuthToken> {
    // Refresh happens server-side via Edge Function (CLIENT_SECRET never in browser)
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      'google-oauth-exchange',
      { body: { refresh_token: refreshToken } }
    );

    if (fnError || !fnData) {
      throw new Error(`Erro ao refresh: ${fnError?.message || 'Token refresh failed'}`);
    }

    const data = fnData;

    const token: GoogleOAuthToken = {
      access_token: data.access_token,
      refresh_token: refreshToken, // MantÃ©m o refresh_token original
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type,
      scope: data.scope,
    };

    await this.saveTokens(userId, token);

    return token;
  }

  /**
   * ObtÃ©m um token vÃ¡lido (refresh automÃ¡tico se necessÃ¡rio)
   */
  static async getValidToken(userId: string): Promise<string> {
    let token = await this.loadTokens(userId);

    if (!token) {
      throw new Error('UsuÃ¡rio nÃ£o autenticado com Google. Execute initializeGoogleAuth() primeiro.');
    }

    // Se expirou e temos refresh_token, atualizar
    if (this.isTokenExpired(token) && token.refresh_token) {
      token = await this.refreshAccessToken(userId, token.refresh_token);
    } else if (this.isTokenExpired(token)) {
      throw new Error('Token expirado e sem refresh_token. Reautentique.');
    }

    return token.access_token;
  }

  /**
   * Revoga os tokens e desconecta do Google
   */
  static async revokeTokens(userId: string): Promise<void> {
    const token = await this.loadTokens(userId);

    if (token) {
      // Revogar token no Google
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token.access_token}`, {
        method: 'POST',
      });
    }

    // Deletar do banco
    await supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', userId);
  }

  // ==========================================
  // GOOGLE CALENDAR API
  // ==========================================

  /**
   * Lista calendÃ¡rios do usuÃ¡rio
   */
  static async listCalendars(userId: string): Promise<Record<string, unknown>[]> {
    const accessToken = await this.getValidToken(userId);

    const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao listar calendÃ¡rios');
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Cria evento no Google Calendar
   */
  static async createEvent(userId: string, calendarId: string, event: CalendarEvent): Promise<Record<string, unknown>> {
    const accessToken = await this.getValidToken(userId);

    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao criar evento: ${error.error?.message || 'Desconhecido'}`);
    }

    const data = await response.json();

    return data;
  }

  /**
   * Atualiza evento no Google Calendar
   */
  static async updateEvent(userId: string, calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<Record<string, unknown>> {
    const accessToken = await this.getValidToken(userId);

    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao atualizar evento: ${error.error?.message || 'Desconhecido'}`);
    }

    const data = await response.json();

    return data;
  }

  /**
   * Deleta evento do Google Calendar
   */
  static async deleteEvent(userId: string, calendarId: string, eventId: string): Promise<void> {
    const accessToken = await this.getValidToken(userId);

    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 410) { // 410 = Already deleted
      const error = await response.json();
      throw new Error(`Erro ao deletar evento: ${error.error?.message || 'Desconhecido'}`);
    }
  }
}

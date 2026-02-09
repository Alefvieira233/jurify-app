/**
 * 🔐 GOOGLE OAUTH SERVICE
 *
 * Serviço para autenticação OAuth2 com Google Calendar API.
 * Gerencia tokens, refresh e chamadas à API.
 *
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';

// Configuração OAuth do Google
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`;

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export interface GoogleOAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // timestamp
  token_type: string;
  scope: string;
}

export interface CalendarEvent {
  summary: string; // Título
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
   * Verifica se as credenciais OAuth estão configuradas
   */
  static isConfigured(): boolean {
    return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
  }

  /**
   * Gera URL de autenticação OAuth do Google
   * @param state - State criptográfico para validação CSRF (não user user.id!)
   */
  static getAuthUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth não configurado. Configure VITE_GOOGLE_CLIENT_ID e VITE_GOOGLE_CLIENT_SECRET no .env');
    }

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: GOOGLE_SCOPES,
      access_type: 'offline', // Para obter refresh_token
      prompt: 'consent', // Força mostrar tela de consentimento
      state, // State criptográfico para validação CSRF
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Troca o código de autorização por tokens de acesso
   */
  static async exchangeCodeForTokens(code: string, userId: string): Promise<GoogleOAuthToken> {
    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Erro OAuth: ${error.error_description || error.error}`);
      }

      const data = await response.json();

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

    } catch (error: unknown) {
      throw error;
    }
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
    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Erro ao refresh: ${error.error_description || error.error}`);
      }

      const data = await response.json();

      const token: GoogleOAuthToken = {
        access_token: data.access_token,
        refresh_token: refreshToken, // Mantém o refresh_token original
        expires_at: Date.now() + (data.expires_in * 1000),
        token_type: data.token_type,
        scope: data.scope,
      };

      await this.saveTokens(userId, token);

      return token;

    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Obtém um token válido (refresh automático se necessário)
   */
  static async getValidToken(userId: string): Promise<string> {
    let token = await this.loadTokens(userId);

    if (!token) {
      throw new Error('Usuário não autenticado com Google. Execute initializeGoogleAuth() primeiro.');
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
    try {
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


    } catch (error: unknown) {
      throw error;
    }
  }

  // ==========================================
  // GOOGLE CALENDAR API
  // ==========================================

  /**
   * Lista calendários do usuário
   */
  static async listCalendars(userId: string): Promise<Record<string, unknown>[]> {
    try {
      const accessToken = await this.getValidToken(userId);

      const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao listar calendários');
      }

      const data = await response.json();
      return data.items || [];

    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Cria evento no Google Calendar
   */
  static async createEvent(userId: string, calendarId: string, event: CalendarEvent): Promise<Record<string, unknown>> {
    try {
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

    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Atualiza evento no Google Calendar
   */
  static async updateEvent(userId: string, calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<Record<string, unknown>> {
    try {
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

    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Deleta evento do Google Calendar
   */
  static async deleteEvent(userId: string, calendarId: string, eventId: string): Promise<void> {
    try {
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


    } catch (error: unknown) {
      throw error;
    }
  }
}

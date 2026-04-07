/**
 * Google OAuth Service
 *
 * OAuth2 authentication with Google Calendar API.
 * Manages tokens, refresh, and API calls.
 *
 * @version 1.0.0
 */

import { supabaseUntyped as supabase } from '@/integrations/supabase/client';

// Configuração OAuth do Google
// NOTE: Only CLIENT_ID is in the browser (public). CLIENT_SECRET lives server-side
// in the `google-calendar` Edge Function.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`;

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

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
    return !!GOOGLE_CLIENT_ID;
  }

  /**
   * Gera URL de autenticação OAuth do Google
   * @param state - State criptográfico para validação CSRF (não user user.id!)
   */
  static getAuthUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth não configurado. Configure VITE_GOOGLE_CLIENT_ID no .env e GOOGLE_CLIENT_SECRET nos Supabase Secrets.');
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
   * Persistência ocorre server-side na Edge Function.
   */
  static async exchangeCodeForTokens(code: string, _userId: string): Promise<GoogleOAuthToken> {
    // Token exchange happens server-side via Edge Function (CLIENT_SECRET never in browser)
    const { data, error } = await supabase.functions.invoke(
      'google-calendar',
      { body: { action: 'exchange_code', code, redirect_uri: GOOGLE_REDIRECT_URI } }
    );

    if (error || !data) {
      throw new Error(`Erro OAuth: ${error?.message || 'Token exchange failed'}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token, // Omitido se a Edge Function seguiu a recomendação de segurança
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Verifica se o usuário tem tokens válidos no banco (sem chamada de API externa)
   */
  static async hasValidToken(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('google_calendar_tokens')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    return !!data && !error;
  }

  /**
   * Revoga os tokens e desconecta do Google via Edge Function
   */
  static async revokeTokens(_userId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('google-calendar', {
      body: { action: 'revokeTokens' }
    });

    if (error) {
      throw new Error(`Erro ao revogar tokens: ${error.message}`);
    }
  }

  // ==========================================
  // GOOGLE CALENDAR API
  // ==========================================

  /**
   * Lista calendários do usuário via Edge Function
   */
  static async listCalendars(_userId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { action: 'listCalendars' }
    });

    if (error) {
      throw new Error(`Erro ao listar calendários: ${error.message}`);
    }

    return data.calendars || [];
  }

  /**
   * Lista eventos de um calendário dentro de um intervalo de datas via Edge Function
   */
  static async listEvents(
    _userId: string,
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: {
        action: 'listEvents',
        data: { calendarId, timeMin, timeMax }
      }
    });

    if (error) {
      throw new Error(`Erro ao listar eventos: ${error.message}`);
    }

    return data.events || [];
  }

  /**
   * Cria evento no Google Calendar via Edge Function
   */
  static async createEvent(_userId: string, calendarId: string, event: CalendarEvent): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: {
        action: 'createEvent',
        data: { calendarId, eventData: event }
      }
    });

    if (error) {
      throw new Error(`Erro ao criar evento: ${error.message}`);
    }

    return data.event;
  }

  /**
   * Atualiza evento no Google Calendar via Edge Function
   */
  static async updateEvent(_userId: string, calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: {
        action: 'updateEvent',
        data: { calendarId, eventId, eventData: event }
      }
    });

    if (error) {
      throw new Error(`Erro ao atualizar evento: ${error.message}`);
    }

    return data.event;
  }

  /**
   * Deleta evento do Google Calendar via Edge Function
   */
  static async deleteEvent(_userId: string, calendarId: string, eventId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('google-calendar', {
      body: {
        action: 'deleteEvent',
        data: { calendarId, eventId }
      }
    });

    if (error) {
      throw new Error(`Erro ao deletar evento: ${error.message}`);
    }
  }
}

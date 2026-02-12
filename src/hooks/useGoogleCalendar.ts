/**
 * Hook: Google Calendar integration.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { GoogleOAuthService, type CalendarEvent } from '@/lib/google/GoogleOAuthService';

export type GoogleCalendarSettings = {
  id?: string;
  tenant_id: string;
  user_id: string;
  calendar_enabled: boolean | null;
  auto_sync: boolean | null;
  sync_direction: string | null;
  notification_enabled: boolean | null;
  calendar_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const useGoogleCalendar = () => {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const { toast } = useToast();
  // Cast needed: google_calendar_settings table may not be in generated types yet
  const supabaseAny = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<GoogleCalendarSettings | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  interface GoogleCalendar {
    id: string;
    summary: string;
    primary?: boolean;
  }
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);

  const isOAuthConfigured = GoogleOAuthService.isConfigured();

  const loadSettings = useCallback(async () => {
    if (!user?.id || !tenantId) return;

    try {
      setLoading(true);

      const { data, error } = await supabaseAny
        .from('google_calendar_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        const defaultSettings = {
          tenant_id: tenantId,
          user_id: user.id,
          calendar_enabled: false,
          auto_sync: true,
          sync_direction: 'jurify_to_google' as const,
          notification_enabled: true,
        };

        const { data: newSettings, error: createError } = await supabaseAny
          .from('google_calendar_settings')
          .insert([defaultSettings])
          .select()
          .single();

        if (createError) throw createError;

        setSettings(newSettings);
      }

      const token = await GoogleOAuthService.loadTokens(user.id);
      setIsAuthenticated(!!token);
    } catch (_error: unknown) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar as configuracoes do Google Calendar.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tenantId, toast]);

  const updateSettings = useCallback(async (updates: Partial<GoogleCalendarSettings>) => {
    if (!user?.id || !settings || !tenantId) return false;

    try {
      setLoading(true);

      const { data, error } = await supabaseAny
        .from('google_calendar_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);

      toast({
        title: 'Sucesso',
        description: 'Configuracoes do Google Calendar atualizadas!',
      });

      return true;
    } catch (_error: unknown) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel atualizar as configuracoes.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tenantId, settings, toast]);

  const initializeGoogleAuth = useCallback(() => {
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Usuario nao autenticado.',
        variant: 'destructive',
      });
      return;
    }

    if (!isOAuthConfigured) {
      toast({
        title: 'Configuracao necessaria',
        description: 'Configure VITE_GOOGLE_CLIENT_ID no .env e GOOGLE_CLIENT_SECRET nos Supabase Secrets.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const cryptoState = Array.from(
        crypto.getRandomValues(new Uint8Array(32))
      ).map(b => b.toString(16).padStart(2, '0')).join('');

      const authUrl = GoogleOAuthService.getAuthUrl(cryptoState);
      localStorage.setItem('google_oauth_state', cryptoState);
      window.location.href = authUrl;
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao iniciar autenticacao',
        variant: 'destructive',
      });
    }
  }, [user?.id, isOAuthConfigured, toast]);

  const handleOAuthCallback = useCallback(async (code: string, state: string) => {
    if (!user?.id) return false;

    try {
      setLoading(true);

      const savedState = localStorage.getItem('google_oauth_state');
      if (state !== savedState) {
        throw new Error('State invalido. Possivel ataque CSRF.');
      }

      await GoogleOAuthService.exchangeCodeForTokens(code, user.id);
      localStorage.removeItem('google_oauth_state');

      const userCalendars = await GoogleOAuthService.listCalendars(user.id) as unknown as GoogleCalendar[];
      setCalendars(userCalendars);

      const primaryCalendar = userCalendars.find(cal => cal.primary);
      if (primaryCalendar) {
        await updateSettings({
          calendar_enabled: true,
          calendar_id: primaryCalendar.id,
        });
      }

      setIsAuthenticated(true);

      toast({
        title: 'Sucesso',
        description: 'Google Calendar conectado com sucesso!',
      });

      return true;
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao conectar Google Calendar',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, updateSettings, toast]);

  const disconnectGoogle = useCallback(async () => {
    if (!user?.id) return false;

    try {
      setLoading(true);

      await GoogleOAuthService.revokeTokens(user.id);
      await updateSettings({
        calendar_enabled: false,
        calendar_id: null,
      });

      setIsAuthenticated(false);
      setCalendars([]);

      toast({
        title: 'Sucesso',
        description: 'Google Calendar desconectado com sucesso!',
      });

      return true;
    } catch (_error: unknown) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel desconectar o Google Calendar.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast, updateSettings]);

  interface AgendamentoEventData {
    titulo?: string;
    descricao?: string;
    data_hora?: string;
    participantes?: string[];
    // Google Calendar API format (used by components directly)
    summary?: string;
    description?: string;
    start?: { dateTime: string; timeZone: string };
    end?: { dateTime: string; timeZone: string };
    attendees?: Array<{ email: string }>;
  }

  const createCalendarEvent = useCallback(async (eventData: AgendamentoEventData, agendamentoId: string) => {
    if (!user?.id || !settings?.calendar_id || !tenantId) {
      return null;
    }

    try {
      const calendarEvent: CalendarEvent = {
        summary: eventData.titulo || 'Agendamento Jurify',
        description: eventData.descricao || '',
        start: {
          dateTime: new Date(eventData.data_hora || new Date()).toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: new Date(new Date(eventData.data_hora || new Date()).getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        attendees: eventData.participantes?.map((email: string) => ({ email })) || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const googleEvent = await GoogleOAuthService.createEvent(
        user.id,
        settings.calendar_id,
        calendarEvent
      );

      await supabase.from('google_calendar_sync_logs').insert([{
        tenant_id: tenantId,
        user_id: user.id,
        action: 'create',
        agendamento_id: agendamentoId,
        google_event_id: googleEvent.id,
        status: 'success',
        sync_data: calendarEvent,
      }]);

      return googleEvent.id;
    } catch (error: unknown) {
      await supabase.from('google_calendar_sync_logs').insert([{
        tenant_id: tenantId,
        user_id: user.id,
        action: 'create',
        agendamento_id: agendamentoId,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      }]);

      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar evento no Google Calendar.',
        variant: 'destructive',
      });

      return null;
    }
  }, [user?.id, tenantId, settings?.calendar_id, toast]);

  const updateCalendarEvent = useCallback(async (googleEventId: string, eventData: Partial<AgendamentoEventData>, agendamentoId: string) => {
    if (!user?.id || !settings?.calendar_id || !tenantId) {
      return false;
    }

    try {
      const calendarEvent: Partial<CalendarEvent> = {
        summary: eventData.titulo,
        description: eventData.descricao,
        start: eventData.data_hora ? {
          dateTime: new Date(eventData.data_hora).toISOString(),
          timeZone: 'America/Sao_Paulo',
        } : undefined,
      };

      await GoogleOAuthService.updateEvent(
        user.id,
        settings.calendar_id,
        googleEventId,
        calendarEvent
      );

      await supabase.from('google_calendar_sync_logs').insert([{
        tenant_id: tenantId,
        user_id: user.id,
        action: 'update',
        agendamento_id: agendamentoId,
        google_event_id: googleEventId,
        status: 'success',
        sync_data: calendarEvent,
      }]);

      return true;
    } catch (error: unknown) {
      await supabase.from('google_calendar_sync_logs').insert([{
        tenant_id: tenantId,
        user_id: user.id,
        action: 'update',
        agendamento_id: agendamentoId,
        google_event_id: googleEventId,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      }]);

      return false;
    }
  }, [user?.id, tenantId, settings?.calendar_id]);

  const deleteCalendarEvent = useCallback(async (googleEventId: string, agendamentoId: string) => {
    if (!user?.id || !settings?.calendar_id || !tenantId) {
      return false;
    }

    try {
      await GoogleOAuthService.deleteEvent(
        user.id,
        settings.calendar_id,
        googleEventId
      );

      await supabase.from('google_calendar_sync_logs').insert([{
        tenant_id: tenantId,
        user_id: user.id,
        action: 'delete',
        agendamento_id: agendamentoId,
        google_event_id: googleEventId,
        status: 'success',
      }]);

      return true;
    } catch (error: unknown) {
      await supabase.from('google_calendar_sync_logs').insert([{
        tenant_id: tenantId,
        user_id: user.id,
        action: 'delete',
        agendamento_id: agendamentoId,
        google_event_id: googleEventId,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      }]);

      return false;
    }
  }, [user?.id, tenantId, settings?.calendar_id]);

  const loadCalendars = useCallback(async () => {
    if (!user?.id || !isAuthenticated) return;

    try {
      setLoading(true);
      const userCalendars = await GoogleOAuthService.listCalendars(user.id) as unknown as GoogleCalendar[];
      setCalendars(userCalendars);
    } catch (_error: unknown) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAuthenticated]);

  useEffect(() => {
    if (user?.id) {
      void loadSettings();
    }
  }, [user?.id, loadSettings]);

  return {
    loading,
    settings,
    isAuthenticated,
    isOAuthConfigured,
    calendars,
    loadSettings,
    updateSettings,
    initializeGoogleAuth,
    handleOAuthCallback,
    disconnectGoogle,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    loadCalendars,
  };
};

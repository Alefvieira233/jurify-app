/**
 * Hook: Google Calendar integration.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { GoogleOAuthService } from '@/lib/google/GoogleOAuthService';
import { queryKeys } from '@/lib/queryKeys';
import { toUserMessage } from '@/lib/errorMessages';
import { createLogger } from '@/lib/logger';
import { useGoogleCalendarEvents } from '@/hooks/useGoogleCalendarEvents';

const log = createLogger('useGoogleCalendar');

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
  const queryClient = useQueryClient();
  // google_calendar_settings is in the types but doesn't have tenant_id.
  // We scope by user_id instead (one settings row per user).
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  interface GoogleCalendar {
    id: string;
    summary: string;
    primary?: boolean;
  }
  // Calendars list is no longer fetched from the browser (server-side only).
  // Kept as state for API compatibility; effectively always a single "primary" entry.
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);

  const isOAuthConfigured = GoogleOAuthService.isConfigured();

  // Check connection status via edge function (never reads tokens client-side).
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const status = await GoogleOAuthService.getStatus();
        if (!cancelled) setIsAuthenticated(!!status.connected);
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const { data: settings = null, isLoading: loading } = useQuery({
    queryKey: queryKeys.googleCalendarSettings.detail(tenantId, user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_calendar_settings')
        .select('id, user_id, calendar_enabled, auto_sync, sync_direction, notification_enabled, calendar_id, created_at, updated_at')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        // Graceful degradation: if settings table query fails, return defaults
        console.warn('[useGoogleCalendar] Settings query failed (RLS or table issue):', error.message);
        return {
          id: '',
          user_id: user!.id,
          tenant_id: tenantId!,
          calendar_enabled: false,
          auto_sync: true,
          sync_direction: 'jurify_to_google' as const,
          notification_enabled: true,
          calendar_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as GoogleCalendarSettings;
      }

      let settingsResult = data;

      if (!settingsResult) {
        const defaultSettings = {
          user_id: user!.id,
          calendar_enabled: false,
          auto_sync: true,
          sync_direction: 'jurify_to_google',
          notification_enabled: true,
        };

        const { data: newSettings, error: createError } = await supabase
          .from('google_calendar_settings')
          .insert([defaultSettings])
          .select()
          .single();

        if (createError) {
          // If insert fails (RLS), return defaults without crashing
          console.warn('[useGoogleCalendar] Settings insert failed:', createError.message);
          return { ...defaultSettings, id: '', tenant_id: tenantId!, calendar_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as GoogleCalendarSettings;
        }
        settingsResult = newSettings;
      }

      return { ...settingsResult, tenant_id: tenantId!, user_id: user!.id } as GoogleCalendarSettings;
    },
    enabled: !!user?.id && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<GoogleCalendarSettings>) => {
      const { tenant_id: _t, user_id: _u, id: _i, created_at: _c, ...dbUpdates } = updates;
      const { data, error } = await supabase
        .from('google_calendar_settings')
        .update({ ...dbUpdates, updated_at: new Date().toISOString() })
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, tenant_id: tenantId!, user_id: user!.id } as GoogleCalendarSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.googleCalendarSettings.detail(tenantId, user?.id), data);
      toast({ title: 'Sucesso', description: 'Configuracoes do Google Calendar atualizadas!' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Nao foi possivel atualizar as configuracoes.', variant: 'destructive' });
    },
  });

  const updateSettings = useCallback(async (updates: Partial<GoogleCalendarSettings>) => {
    if (!user?.id || !settings || !tenantId) return false;
    try {
      await updateSettingsMutation.mutateAsync(updates);
      return true;
    } catch (err) {
      log.error('updateSettings failed', err);
      return false;
    }
  }, [user?.id, tenantId, settings, updateSettingsMutation]);

  const loadSettings = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendarSettings.detail(tenantId, user?.id) });
  }, [queryClient, tenantId, user?.id]);

  const initializeGoogleAuth = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado.',
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

      localStorage.setItem('google_oauth_state', cryptoState);
      const authUrl = await GoogleOAuthService.getAuthUrl(cryptoState);
      window.location.href = authUrl;
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: toUserMessage(error),
        variant: 'destructive',
      });
    }
  }, [user?.id, isOAuthConfigured, toast]);

  const handleOAuthCallback = useCallback(async (code: string, state: string) => {
    if (!user?.id) return false;

    try {
      const savedState = localStorage.getItem('google_oauth_state');
      if (!savedState || state !== savedState) {
        throw new Error('State invalido. Possivel ataque CSRF.');
      }

      await GoogleOAuthService.exchangeCodeForTokens(code);
      localStorage.removeItem('google_oauth_state');

      // Default to the user's primary calendar. The edge function uses the
      // calendar.events scope which doesn't grant calendarList.read — listing
      // calendars is not possible. Users can pick a specific calendar later
      // via settings if we add that surface.
      const primary: GoogleCalendar = { id: 'primary', summary: 'Primary', primary: true };
      setCalendars([primary]);
      await updateSettings({
        calendar_enabled: true,
        calendar_id: 'primary',
      });

      setIsAuthenticated(true);

      toast({
        title: 'Sucesso',
        description: 'Google Calendar conectado com sucesso!',
      });

      return true;
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: toUserMessage(error),
        variant: 'destructive',
      });
      return false;
    }
  }, [user?.id, updateSettings, toast]);

  const disconnectGoogle = useCallback(async () => {
    if (!user?.id) return false;

    try {
      await GoogleOAuthService.revokeTokens();
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
    }
  }, [user?.id, toast, updateSettings]);

  const { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = useGoogleCalendarEvents({
    userId: user?.id,
    tenantId,
    calendarId: settings?.calendar_id,
  });

  // listCalendars is not exposed via the edge function (calendar.events scope
  // doesn't grant calendar list access). We default to 'primary'.
  const loadCalendars = useCallback(() => {
    if (!user?.id || !isAuthenticated) return;
    setCalendars([{ id: 'primary', summary: 'Primary', primary: true }]);
  }, [user?.id, isAuthenticated]);

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

/**
 * Hook: Google Calendar event CRUD operations.
 *
 * Extracted from useGoogleCalendar so the parent hook stays under the 400-line
 * project budget. This module owns event create/update/delete plus sync-log
 * writes; the parent hook composes the returned callbacks into its public API.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { GoogleOAuthService, type CalendarEvent } from '@/lib/google/GoogleOAuthService';
import { queryKeys } from '@/lib/queryKeys';

export interface AgendamentoEventData {
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

interface UseGoogleCalendarEventsParams {
  userId: string | undefined;
  tenantId: string | null;
  calendarId: string | null | undefined;
}

export const useGoogleCalendarEvents = ({
  userId,
  tenantId,
  calendarId,
}: UseGoogleCalendarEventsParams) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCalendarEvent = useCallback(async (eventData: AgendamentoEventData, agendamentoId: string) => {
    if (!userId || !calendarId || !tenantId) {
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
        calendarId,
        calendarEvent
      );

      await supabase.from('google_calendar_sync_logs').insert([{
        user_id: userId,
        action: 'create',
        agendamento_id: agendamentoId,
        google_event_id: googleEvent.id,
        status: 'success',
        sync_data: calendarEvent as unknown as Json,
      }]);

      // Invalidate agendamentos cache so UI reflects sync status
      void queryClient.invalidateQueries({ queryKey: queryKeys.agendamentos.all });

      return googleEvent.id;
    } catch (error: unknown) {
      await supabase.from('google_calendar_sync_logs').insert([{
        user_id: userId,
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
  }, [userId, tenantId, calendarId, queryClient, toast]);

  const updateCalendarEvent = useCallback(async (googleEventId: string, eventData: Partial<AgendamentoEventData>, agendamentoId: string) => {
    if (!userId || !calendarId || !tenantId) {
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
        calendarId,
        googleEventId,
        calendarEvent
      );

      await supabase.from('google_calendar_sync_logs').insert([{
        user_id: userId,
        action: 'update',
        agendamento_id: agendamentoId,
        google_event_id: googleEventId,
        status: 'success',
        sync_data: calendarEvent as unknown as Json,
      }]);

      // Invalidate agendamentos cache so UI reflects sync status
      void queryClient.invalidateQueries({ queryKey: queryKeys.agendamentos.all });

      return true;
    } catch (error: unknown) {
      await supabase.from('google_calendar_sync_logs').insert([{
        user_id: userId,
        action: 'update',
        agendamento_id: agendamentoId,
        google_event_id: googleEventId,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      }]);

      return false;
    }
  }, [userId, tenantId, calendarId, queryClient]);

  const deleteCalendarEvent = useCallback(async (googleEventId: string, agendamentoId: string) => {
    if (!userId || !calendarId || !tenantId) {
      return false;
    }

    try {
      await GoogleOAuthService.deleteEvent(
        calendarId,
        googleEventId
      );

      await supabase.from('google_calendar_sync_logs').insert([{
        user_id: userId,
        action: 'delete',
        agendamento_id: agendamentoId,
        google_event_id: googleEventId,
        status: 'success',
      }]);

      return true;
    } catch (error: unknown) {
      await supabase.from('google_calendar_sync_logs').insert([{
        user_id: userId,
        action: 'delete',
        agendamento_id: agendamentoId,
        google_event_id: googleEventId,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      }]);

      return false;
    }
  }, [userId, tenantId, calendarId]);

  return {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
  };
};

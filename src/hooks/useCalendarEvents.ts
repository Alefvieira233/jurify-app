/**
 * useCalendarEvents — Fetches agendamentos from Supabase + Google Calendar events
 * and merges them into FullCalendar-compatible format.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { useGoogleCalendarConnection } from '@/hooks/useGoogleCalendarConnection';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarEventItem {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    source: 'jurify' | 'google';
    status?: string;
    area_juridica?: string;
    responsavel?: string;
    observacoes?: string;
    google_event_id?: string;
    agendamento_id?: string;
    location?: string;
    attendees?: string[];
  };
}

type EventType = 'consulta' | 'audiencia' | 'reuniao' | 'prazo' | 'default';

// ---------------------------------------------------------------------------
// Color map for event types
// ---------------------------------------------------------------------------

const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string }> = {
  consulta:  { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
  audiencia: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
  reuniao:   { bg: '#22c55e', border: '#16a34a', text: '#ffffff' },
  prazo:     { bg: '#eab308', border: '#ca8a04', text: '#000000' },
  default:   { bg: '#6366f1', border: '#4f46e5', text: '#ffffff' },
};

function guessEventType(area?: string | null, title?: string): EventType {
  const text = `${area ?? ''} ${title ?? ''}`.toLowerCase();
  if (text.includes('audiência') || text.includes('audiencia')) return 'audiencia';
  if (text.includes('prazo')) return 'prazo';
  if (text.includes('reunião') || text.includes('reuniao')) return 'reuniao';
  return 'consulta';
}

function getColors(type: EventType) {
  const c = EVENT_COLORS[type] || EVENT_COLORS.default;
  return { backgroundColor: c.bg, borderColor: c.border, textColor: c.text };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCalendarEvents() {
  const { user } = useAuth();
  const { agendamentos } = useAgendamentos();
  const { status: gcalStatus } = useGoogleCalendarConnection();
  const [googleEvents, setGoogleEvents] = useState<CalendarEventItem[]>([]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const fetchIdRef = useRef(0);

  // Convert Jurify agendamentos → CalendarEventItem[]
  const jurifyEvents: CalendarEventItem[] = (agendamentos ?? []).map((a) => {
    const type = guessEventType(a.area_juridica, a.responsavel ?? undefined);
    const colors = getColors(type);
    const start = new Date(a.data_hora);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h default

    return {
      id: `jurify-${a.id}`,
      title: `${a.responsavel ?? 'Agendamento'} · ${a.area_juridica ?? ''}`.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      ...colors,
      extendedProps: {
        source: 'jurify' as const,
        status: a.status ?? undefined,
        area_juridica: a.area_juridica ?? undefined,
        responsavel: a.responsavel ?? undefined,
        observacoes: a.observacoes ?? undefined,
        google_event_id: a.google_event_id ?? undefined,
        agendamento_id: a.id,
      },
    };
  });

  // Fetch Google Calendar events via Edge Function
  const fetchGoogleEvents = useCallback(async (start: string, end: string) => {
    if (!user?.id || !gcalStatus.connected) {
      setGoogleEvents([]);
      return;
    }

    const id = ++fetchIdRef.current;
    setLoadingGoogle(true);

    try {
      const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            method: 'listEvents',
            data: { calendarId: 'primary', timeMin: start, timeMax: end },
          }),
        }
      );

      if (id !== fetchIdRef.current) return;

      if (!res.ok) { setGoogleEvents([]); return; }

      const { events: items = [] } = await res.json() as { events: Record<string, unknown>[] };

      const mapped: CalendarEventItem[] = items
        .filter((item) => item.status !== 'cancelled')
        .map((item) => {
          const startObj = item.start as Record<string, string> | undefined;
          const endObj = item.end as Record<string, string> | undefined;
          const isAllDay = !!startObj?.date;
          const eventStart = startObj?.dateTime || startObj?.date || '';
          const eventEnd = endObj?.dateTime || endObj?.date || '';
          const summary = (item.summary as string) || 'Sem título';
          const type = guessEventType(summary, summary);
          const colors = getColors(type);
          const attendees = (item.attendees as Array<{ email: string }>) || [];

          return {
            id: `google-${item.id as string}`,
            title: summary,
            start: eventStart,
            end: eventEnd,
            allDay: isAllDay,
            ...colors,
            extendedProps: {
              source: 'google' as const,
              google_event_id: item.id as string,
              location: (item.location as string) || undefined,
              attendees: attendees.map((a) => a.email),
            },
          };
        });

      setGoogleEvents(mapped);
    } catch {
      if (id === fetchIdRef.current) setGoogleEvents([]);
    } finally {
      if (id === fetchIdRef.current) setLoadingGoogle(false);
    }
  }, [user?.id, gcalStatus.connected]);

  // When date range changes, refetch Google events
  useEffect(() => {
    if (dateRange) {
      void fetchGoogleEvents(dateRange.start, dateRange.end);
    }
  }, [dateRange, fetchGoogleEvents]);

  // Merge all events, deduplicating by google_event_id
  const allEvents: CalendarEventItem[] = (() => {
    const googleIds = new Set(
      jurifyEvents
        .map((e) => e.extendedProps.google_event_id)
        .filter(Boolean)
    );

    // Exclude google events that are already represented by a jurify agendamento
    const dedupedGoogle = googleEvents.filter(
      (ge) => !googleIds.has(ge.extendedProps.google_event_id)
    );

    return [...jurifyEvents, ...dedupedGoogle];
  })();

  const handleDateRangeChange = useCallback((start: Date, end: Date) => {
    setDateRange({
      start: start.toISOString(),
      end: end.toISOString(),
    });
  }, []);

  const refetchGoogle = useCallback(() => {
    if (dateRange) void fetchGoogleEvents(dateRange.start, dateRange.end);
  }, [dateRange, fetchGoogleEvents]);

  return {
    events: allEvents,
    jurifyEvents,
    googleEvents,
    loadingGoogle,
    isGoogleConnected: gcalStatus.connected,
    handleDateRangeChange,
    refetchGoogle,
  };
}

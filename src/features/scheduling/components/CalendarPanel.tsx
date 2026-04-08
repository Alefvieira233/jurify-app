/**
 * CalendarPanel -- FullCalendar integration for Agendamentos.
 *
 * Shows Jurify agendamentos + Google Calendar events in a unified calendar.
 * Supports month/week/day views, drag-and-drop, event click, and date navigation.
 *
 * Orchestrator: delegates rendering to CalendarHeader, CalendarGrid, EventDetailModal.
 */

import { useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventClickArg, DatesSetArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useCalendarEvents, type CalendarEventItem } from '@/hooks/useCalendarEvents';
import { useGoogleCalendarConnection } from '@/hooks/useGoogleCalendarConnection';
import { createLogger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { QuickAddModal } from './QuickAddModal';
import { supabase } from '@/integrations/supabase/client';
import { EventDetailModal } from './calendar/EventDetailModal';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarGrid } from './calendar/CalendarGrid';

const log = createLogger('CalendarPanel');

// ---------------------------------------------------------------------------
// ConnectGoogleBanner
// ---------------------------------------------------------------------------

const ConnectGoogleBanner = () => {
  const { connect, isConnecting } = useGoogleCalendarConnection();

  return (
    <div className="mx-1 mb-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between">
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
        <Calendar className="h-3.5 w-3.5" />
        <span>Conecte o Google Calendar para ver seus eventos aqui.</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-xs px-2"
        onClick={() => void connect()}
        disabled={isConnecting}
      >
        {isConnecting ? 'Conectando...' : 'Conectar'}
      </Button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main CalendarPanel (orchestrator)
// ---------------------------------------------------------------------------

interface CalendarPanelProps {
  onNewAgendamento?: () => void;
}

const CalendarPanel = ({ onNewAgendamento }: CalendarPanelProps) => {
  const calendarRef = useRef<FullCalendar>(null);
  const { toast } = useToast();
  const {
    events,
    loadingGoogle,
    isGoogleConnected,
    handleDateRangeChange,
    refetchGoogle,
  } = useCalendarEvents();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('');
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);

  // FullCalendar callbacks
  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    handleDateRangeChange(arg.start, arg.end);
    setCurrentTitle(arg.view.title);
  }, [handleDateRangeChange]);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const fcEvent = info.event;
    const item: CalendarEventItem = {
      id: fcEvent.id,
      title: fcEvent.title,
      start: fcEvent.start?.toISOString() ?? '',
      end: fcEvent.end?.toISOString() ?? fcEvent.start?.toISOString() ?? '',
      backgroundColor: fcEvent.backgroundColor,
      borderColor: fcEvent.borderColor,
      textColor: fcEvent.textColor,
      extendedProps: fcEvent.extendedProps as CalendarEventItem['extendedProps'],
    };
    setSelectedEvent(item);
    setDetailOpen(true);
  }, []);

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    const start = selectInfo.start;
    const end = selectInfo.end;
    if (start.getTime() === end.getTime()) {
      setQuickAddDate(start);
      setQuickAddOpen(true);
    } else {
      onNewAgendamento?.();
    }
  }, [onNewAgendamento]);

  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const fcEvent = info.event;
    const newStart = fcEvent.start;
    const newEnd = fcEvent.end;
    if (!newStart || !newEnd) return;

    const event = selectedEvent || events.find(e => e.id === fcEvent.id);
    if (!event) return;

    if (event.extendedProps.source === 'jurify') {
      try {
        const response = await fetch('/api/agendamentos/' + event.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data_hora: newStart.toISOString() }),
        });
        if (!response.ok) throw new Error('Failed to update');
        info.revert();
      } catch (error) {
        log.error('Error updating agendamento', error);
        info.revert();
      }
    } else if (event.extendedProps.source === 'google') {
      try {
        const { error: fnError } = await supabase.functions.invoke('google-calendar', {
          body: {
            method: 'updateEvent',
            data: {
              calendarId: 'primary',
              eventId: event.extendedProps.google_event_id,
              eventData: {
                start: { dateTime: newStart.toISOString() },
                end: { dateTime: newEnd.toISOString() },
              },
            },
          },
        });
        if (fnError) {
          log.error('Error updating Google event', fnError);
          toast({ title: 'Erro ao atualizar evento Google', description: toUserMessage(fnError), variant: 'destructive' });
          info.revert();
        }
      } catch (error) {
        log.error('Error updating Google event', error);
        toast({ title: 'Erro ao atualizar evento Google', variant: 'destructive' });
        info.revert();
      }
    }
  }, [events, selectedEvent, toast]);

  // Navigation helpers
  const goToday = useCallback(() => calendarRef.current?.getApi()?.today(), []);
  const goPrev = useCallback(() => calendarRef.current?.getApi()?.prev(), []);
  const goNext = useCallback(() => calendarRef.current?.getApi()?.next(), []);
  const changeView = useCallback((view: string) => calendarRef.current?.getApi()?.changeView(view), []);

  return (
    <div className="flex flex-col h-full">
      {!isGoogleConnected && <ConnectGoogleBanner />}

      <CalendarHeader
        currentTitle={currentTitle}
        loadingGoogle={loadingGoogle}
        isGoogleConnected={isGoogleConnected}
        showIntelligence={showIntelligence}
        onToggleIntelligence={() => setShowIntelligence(!showIntelligence)}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onChangeView={changeView}
        onRefetchGoogle={refetchGoogle}
      />

      <CalendarGrid
        calendarRef={calendarRef}
        events={events}
        showIntelligence={showIntelligence}
        onDatesSet={handleDatesSet}
        onEventClick={handleEventClick}
        onDateSelect={handleDateSelect}
        onEventDrop={(info) => { void handleEventDrop(info); }}
      />

      <EventDetailModal
        event={selectedEvent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        date={quickAddDate}
        onSuccess={() => refetchGoogle()}
      />
    </div>
  );
};

export default CalendarPanel;

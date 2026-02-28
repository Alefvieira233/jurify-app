/**
 * CalendarPanel — FullCalendar integration for Agendamentos.
 *
 * Shows Jurify agendamentos + Google Calendar events in a unified calendar.
 * Supports month/week/day views, drag-and-drop, event click, and date navigation.
 */

import { useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, DatesSetArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw, Link, Calendar, ChevronLeft, ChevronRight,
  LayoutGrid, List, Clock, Lightbulb,
} from 'lucide-react';
import { useCalendarEvents, type CalendarEventItem } from '@/hooks/useCalendarEvents';
import { useGoogleCalendarConnection } from '@/hooks/useGoogleCalendarConnection';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AgendaIntelligenceDashboard } from './AgendaIntelligenceDashboard';
import { createLogger } from '@/lib/logger';
import { QuickAddModal } from './QuickAddModal';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';

const log = createLogger('CalendarPanel');

// ---------------------------------------------------------------------------
// Event detail modal (inline — lightweight)
// ---------------------------------------------------------------------------

interface EventDetailProps {
  event: CalendarEventItem | null;
  open: boolean;
  onClose: () => void;
}

const EventDetailModal = ({ event, open, onClose }: EventDetailProps) => {
  if (!event) return null;

  const isGoogle = event.extendedProps.source === 'google';
  const statusLabel = event.extendedProps.status
    ? event.extendedProps.status.charAt(0).toUpperCase() + event.extendedProps.status.slice(1)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: event.backgroundColor }}
            />
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Source badge */}
          <div className="flex gap-2">
            <Badge variant={isGoogle ? 'outline' : 'default'} className="text-xs">
              {isGoogle ? 'Google Calendar' : 'Jurify'}
            </Badge>
            {statusLabel && (
              <Badge variant="secondary" className="text-xs">{statusLabel}</Badge>
            )}
          </div>

          {/* Date/Time */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {new Date(event.start).toLocaleDateString('pt-BR', {
                weekday: 'short', day: '2-digit', month: 'short',
              })}
              {' · '}
              {new Date(event.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {' — '}
              {new Date(event.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Area jurídica */}
          {event.extendedProps.area_juridica && (
            <div>
              <span className="text-muted-foreground">Área:</span>{' '}
              <span className="font-medium">{event.extendedProps.area_juridica}</span>
            </div>
          )}

          {/* Responsável */}
          {event.extendedProps.responsavel && (
            <div>
              <span className="text-muted-foreground">Responsável:</span>{' '}
              <span className="font-medium">{event.extendedProps.responsavel}</span>
            </div>
          )}

          {/* Observações */}
          {event.extendedProps.observacoes && (
            <div>
              <span className="text-muted-foreground">Obs:</span>{' '}
              <span>{event.extendedProps.observacoes}</span>
            </div>
          )}

          {/* Location (Google) */}
          {event.extendedProps.location && (
            <div>
              <span className="text-muted-foreground">Local:</span>{' '}
              <span>{event.extendedProps.location}</span>
            </div>
          )}

          {/* Attendees (Google) */}
          {event.extendedProps.attendees && event.extendedProps.attendees.length > 0 && (
            <div>
              <span className="text-muted-foreground">Participantes:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {event.extendedProps.attendees.map((email) => (
                  <Badge key={email} variant="outline" className="text-xs">{email}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Google sync status */}
          {event.extendedProps.google_event_id && !isGoogle && (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <Link className="h-3 w-3" />
              Sincronizado com Google Calendar
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
// Main CalendarPanel
// ---------------------------------------------------------------------------

interface CalendarPanelProps {
  onNewAgendamento?: () => void;
}

const CalendarPanel = ({ onNewAgendamento }: CalendarPanelProps) => {
  const calendarRef = useRef<FullCalendar>(null);
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
    // Abrir modal de novo agendamento com data pré-preenchida
    const start = selectInfo.start;
    const end = selectInfo.end;
    
    // Se for clique simples (start = end), abrir quick-add
    if (start.getTime() === end.getTime()) {
      setQuickAddDate(start);
      setQuickAddOpen(true);
    } else {
      // Se for range, abrir modal completo
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

    // Update based on source
    if (event.extendedProps.source === 'jurify') {
      // Update Jurify agendamento
      try {
        const response = await fetch('/api/agendamentos/' + event.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data_hora: newStart.toISOString(),
          }),
        });
        
        if (!response.ok) throw new Error('Failed to update');
        
        // Revert on error
        info.revert();
      } catch (error) {
        log.error('Error updating agendamento', error);
        info.revert();
      }
    } else if (event.extendedProps.source === 'google') {
      // Update Google Calendar event
      try {
        await supabase.functions.invoke('google-calendar', {
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
      } catch (error) {
        log.error('Error updating Google event', error);
        info.revert();
      }
    }
  }, [events, selectedEvent]);

  // Navigation helpers
  const goToday = () => calendarRef.current?.getApi()?.today();
  const goPrev = () => calendarRef.current?.getApi()?.prev();
  const goNext = () => calendarRef.current?.getApi()?.next();
  const changeView = (view: string) => calendarRef.current?.getApi()?.changeView(view);

  return (
    <div className="flex flex-col h-full">
      {/* Google connection banner */}
      {!isGoogleConnected && <ConnectGoogleBanner />}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 pb-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={goPrev}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={goToday}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={goNext}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-semibold ml-2 capitalize">{currentTitle}</span>
          {loadingGoogle && (
            <RefreshCw className="h-3 w-3 ml-2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={showIntelligence ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setShowIntelligence(!showIntelligence)}
            title="Inteligência da Agenda"
          >
            <Lightbulb className="h-3.5 w-3.5" />
          </Button>
          {isGoogleConnected && (
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={refetchGoogle} title="Sincronizar Google">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              onClick={() => changeView('dayGridMonth')}
              className="h-7 px-2 text-xs hover:bg-muted transition-colors"
              title="Mês"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => changeView('timeGridWeek')}
              className="h-7 px-2 text-xs hover:bg-muted transition-colors border-x border-border"
              title="Semana"
            >
              <Calendar className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => changeView('timeGridDay')}
              className="h-7 px-2 text-xs hover:bg-muted transition-colors border-r border-border"
              title="Dia"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => changeView('listWeek')}
              className="h-7 px-2 text-xs hover:bg-muted transition-colors"
              title="Lista"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-2 pb-2 text-[10px] text-muted-foreground flex-shrink-0">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Consulta</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Audiência</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Reunião</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Prazo</span>
        {isGoogleConnected && (
          <span className="flex items-center gap-1 ml-auto">
            <Link className="h-2.5 w-2.5 text-green-500" />
            Google sincronizado
          </span>
        )}
      </div>

      {/* Calendar + Intelligence Layout */}
      <div className="flex-1 min-h-0 px-1 flex gap-2">
        {/* Calendar */}
        <div className={cn('calendar-panel', showIntelligence ? 'flex-1' : 'w-full')}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            locale="pt-br"
            headerToolbar={false}
            height="100%"
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            weekends={true}
            nowIndicator={true}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            select={handleDateSelect}
            eventDrop={(info) => { void handleEventDrop(info); }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false,
              hour12: false,
            }}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
            allDaySlot={true}
            allDayText="Dia todo"
            buttonText={{
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
              list: 'Lista',
            }}
            moreLinkText={(n) => `+${n} mais`}
            noEventsText="Nenhum evento neste período"
          />
        </div>

        {/* Intelligence Sidebar */}
        {showIntelligence && (
          <div className="w-96 border-l border-border overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              <AgendaIntelligenceDashboard />
            </div>
          </div>
        )}
      </div>

      {/* Event detail modal */}
      <EventDetailModal
        event={selectedEvent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {/* Quick add modal */}
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

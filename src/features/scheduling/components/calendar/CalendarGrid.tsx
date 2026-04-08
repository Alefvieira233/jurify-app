/**
 * CalendarGrid -- FullCalendar wrapper with intelligence sidebar.
 */

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, DatesSetArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import type { CalendarEventItem } from '@/hooks/useCalendarEvents';
import { cn } from '@/lib/utils';
import { AgendaIntelligenceDashboard } from '../AgendaIntelligenceDashboard';

interface CalendarGridProps {
  calendarRef: React.RefObject<FullCalendar>;
  events: CalendarEventItem[];
  showIntelligence: boolean;
  onDatesSet: (arg: DatesSetArg) => void;
  onEventClick: (info: EventClickArg) => void;
  onDateSelect: (info: DateSelectArg) => void;
  onEventDrop: (info: EventDropArg) => void;
}

const CalendarGrid = React.memo(({
  calendarRef,
  events,
  showIntelligence,
  onDatesSet,
  onEventClick,
  onDateSelect,
  onEventDrop,
}: CalendarGridProps) => (
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
        datesSet={onDatesSet}
        eventClick={onEventClick}
        select={onDateSelect}
        eventDrop={onEventDrop}
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
          month: 'Mes',
          week: 'Semana',
          day: 'Dia',
          list: 'Lista',
        }}
        moreLinkText={(n) => `+${n} mais`}
        noEventsText="Nenhum evento neste periodo"
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
));

CalendarGrid.displayName = 'CalendarGrid';

export { CalendarGrid };
export type { CalendarGridProps };

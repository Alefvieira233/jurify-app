/**
 * CalendarHeader -- Navigation, view toggle, intelligence toggle, and legend.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  RefreshCw, Calendar, ChevronLeft, ChevronRight,
  LayoutGrid, List, Clock, Lightbulb, Link,
} from 'lucide-react';

interface CalendarHeaderProps {
  currentTitle: string;
  loadingGoogle: boolean;
  isGoogleConnected: boolean;
  showIntelligence: boolean;
  onToggleIntelligence: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (view: string) => void;
  onRefetchGoogle: () => void;
}

const CalendarHeader = React.memo(({
  currentTitle,
  loadingGoogle,
  isGoogleConnected,
  showIntelligence,
  onToggleIntelligence,
  onPrev,
  onNext,
  onToday,
  onChangeView,
  onRefetchGoogle,
}: CalendarHeaderProps) => (
  <>
    {/* Toolbar */}
    <div className="flex items-center justify-between px-2 pb-2 flex-shrink-0">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={onPrev}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={onToday}>
          Hoje
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={onNext}>
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
          onClick={onToggleIntelligence}
          title="Inteligencia da Agenda"
        >
          <Lightbulb className="h-3.5 w-3.5" />
        </Button>
        {isGoogleConnected && (
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={onRefetchGoogle} title="Sincronizar Google">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        <div className="flex border border-border rounded-md overflow-hidden">
          <button
            onClick={() => onChangeView('dayGridMonth')}
            className="h-7 px-2 text-xs hover:bg-muted transition-colors"
            title="Mes"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeView('timeGridWeek')}
            className="h-7 px-2 text-xs hover:bg-muted transition-colors border-x border-border"
            title="Semana"
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeView('timeGridDay')}
            className="h-7 px-2 text-xs hover:bg-muted transition-colors border-r border-border"
            title="Dia"
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeView('listWeek')}
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
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Audiencia</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Reuniao</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Prazo</span>
      {isGoogleConnected && (
        <span className="flex items-center gap-1 ml-auto">
          <Link className="h-2.5 w-2.5 text-green-500" />
          Google sincronizado
        </span>
      )}
    </div>
  </>
));

CalendarHeader.displayName = 'CalendarHeader';

export { CalendarHeader };
export type { CalendarHeaderProps };

/**
 * EventDetailModal -- Shows details of a clicked calendar event.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Link } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CalendarEventItem } from '@/hooks/useCalendarEvents';

interface EventDetailProps {
  event: CalendarEventItem | null;
  open: boolean;
  onClose: () => void;
}

const EventDetailModal = React.memo(({ event, open, onClose }: EventDetailProps) => {
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
              {' \u00b7 '}
              {new Date(event.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {' \u2014 '}
              {new Date(event.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Area juridica */}
          {event.extendedProps.area_juridica && (
            <div>
              <span className="text-muted-foreground">Area:</span>{' '}
              <span className="font-medium">{event.extendedProps.area_juridica}</span>
            </div>
          )}

          {/* Responsavel */}
          {event.extendedProps.responsavel && (
            <div>
              <span className="text-muted-foreground">Responsavel:</span>{' '}
              <span className="font-medium">{event.extendedProps.responsavel}</span>
            </div>
          )}

          {/* Observacoes */}
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
});

EventDetailModal.displayName = 'EventDetailModal';

export { EventDetailModal };
export type { EventDetailProps };

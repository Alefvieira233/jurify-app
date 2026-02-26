/**
 * useAgendaIntelligence — Motor de Inteligência de Agenda Jurídica
 *
 * - Detecta padrões de agendamento
 * - Sugere horários ótimos
 * - Alerta sobre conflitos e prazos
 * - Prevê picos de carga
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { addHours, addDays, addMinutes, isWithinInterval, isAfter, isBefore, format, differenceInMinutes, setHours, setMinutes } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeSlot {
  start: Date;
  end: Date;
  score: number; // 0-100
  reasons: string[];
  conflicts?: string[];
}

export interface AgendaInsight {
  type: 'optimal_slot' | 'conflict' | 'deadline_near' | 'peak_load' | 'gap_detected';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  date?: Date;
  suggestions?: string[];
}

export interface DailySummary {
  date: Date;
  totalEvents: number;
  busyHours: number;
  freeHours: number;
  peakHours: { start: string; end: string; count: number }[];
  insights: AgendaInsight[];
}

export interface WeeklyPattern {
  weekday: number; // 0 = Domingo
  avgEvents: number;
  peakHour: number;
  preferredDuration: number;
  noShowRate: number;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

const BUSINESS_HOURS = { start: 8, end: 18 };
const SLOT_DURATION = 30; // minutes
const MIN_BUFFER = 15; // minutes between events

function isBusinessHours(date: Date): boolean {
  const hour = date.getHours();
  return hour >= BUSINESS_HOURS.start && hour < BUSINESS_HOURS.end;
}

function calculateSlotScore(
  slot: TimeSlot,
  allEvents: { start: Date; end: Date }[],
  patterns: WeeklyPattern[]
): number {
  let score = 100;
  const reasons: string[] = [];
  const conflicts: string[] = [];

  // 1. Check conflicts
  for (const event of allEvents) {
    if (
      (isAfter(slot.start, event.start) && isBefore(slot.start, event.end)) ||
      (isAfter(slot.end, event.start) && isBefore(slot.end, event.end)) ||
      (isBefore(slot.start, event.start) && isAfter(slot.end, event.end))
    ) {
      score -= 50;
      conflicts.push(`Conflito com evento existente`);
    }
  }

  // 2. Buffer time
  for (const event of allEvents) {
    const diffBefore = differenceInMinutes(slot.start, event.end);
    const diffAfter = differenceInMinutes(event.start, slot.end);
    if (diffBefore > 0 && diffBefore < MIN_BUFFER) {
      score -= 20;
      reasons.push('Pouco tempo após evento anterior');
    }
    if (diffAfter > 0 && diffAfter < MIN_BUFFER) {
      score -= 20;
      reasons.push('Pouco tempo antes do próximo evento');
    }
  }

  // 3. Preferred hours based on patterns
  const hour = slot.start.getHours();
  const dayPattern = patterns.find(p => p.weekday === slot.start.getDay());
  if (dayPattern) {
    if (Math.abs(hour - dayPattern.peakHour) <= 1) {
      score += 10;
      reasons.push('Horário preferencial do escritório');
    }
  }

  // 4. Avoid lunch time
  if (hour >= 12 && hour <= 13) {
    score -= 15;
    reasons.push('Horário de almoço');
  }

  // 5. Business hours bonus
  if (isBusinessHours(slot.start)) {
    score += 5;
    reasons.push('Horário comercial');
  }

  return Math.max(0, score);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAgendaIntelligence() {
  useAuth();
  const { agendamentos } = useAgendamentos();
  const { events: calendarEvents } = useCalendarEvents();

  // Merge all events
  const allEvents = useMemo(() => {
    const merged = [
      ...agendamentos.map(a => ({ start: new Date(a.data_hora), end: addHours(new Date(a.data_hora), 1) })),
      ...calendarEvents.map(e => ({ start: new Date(e.start), end: new Date(e.end) })),
    ];
    return merged.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [agendamentos, calendarEvents]);

  // Analyze weekly patterns
  const weeklyPatterns = useMemo((): WeeklyPattern[] => {
    const patterns: WeeklyPattern[] = Array.from({ length: 7 }, (_, i) => ({
      weekday: i,
      avgEvents: 0,
      peakHour: 10,
      preferredDuration: 60,
      noShowRate: 0.15,
    }));

    // Group by weekday
    const byWeekday = new Map<number, typeof allEvents>();
    for (const event of allEvents) {
      const day = event.start.getDay();
      if (!byWeekday.has(day)) byWeekday.set(day, []);
      byWeekday.get(day)!.push(event);
    }

    // Calculate patterns
    for (const [weekday, dayEvents] of byWeekday.entries()) {
      const pattern = patterns[weekday];
      if (!pattern) continue;
      pattern.avgEvents = dayEvents.length / Math.max(1, 4); // avg per week (assuming 4 weeks sample)

      // Peak hour
      const hourCounts = new Map<number, number>();
      for (const event of dayEvents) {
        const hour = event.start.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
      const maxHour = Array.from(hourCounts.entries()).reduce((a, b) => (a[1] > b[1] ? a : b), [10, 0]);
      pattern.peakHour = maxHour[0];

      // Preferred duration
      const durations = dayEvents.map(e => differenceInMinutes(e.end, e.start));
      pattern.preferredDuration = durations.reduce((a, b) => a + b, 0) / durations.length || 60;
    }

    return patterns;
  }, [allEvents]);

  // Find optimal slots for next 7 days
  const optimalSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const now = new Date();

    for (let day = 0; day < 7; day++) {
      const currentDate = addDays(now, day);
      const dayStart = setHours(setMinutes(currentDate, 0), BUSINESS_HOURS.start);
      const dayEnd = setHours(setMinutes(currentDate, 0), BUSINESS_HOURS.end);

      let current = dayStart;
      while (current < dayEnd) {
        const slotEnd = addMinutes(current, SLOT_DURATION);
        const slot: TimeSlot = {
          start: current,
          end: slotEnd,
          score: 0,
          reasons: [],
        };

        slot.score = calculateSlotScore(slot, allEvents, weeklyPatterns);
        if (slot.score >= 70) {
          slots.push(slot);
        }

        current = slotEnd;
      }
    }

    return slots.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [allEvents, weeklyPatterns]);

  // Generate insights
  const insights = useMemo((): AgendaInsight[] => {
    const result: AgendaInsight[] = [];
    const now = new Date();
    const nextWeek = addDays(now, 7);

    // 1. Upcoming deadlines without events
    for (const agendamento of agendamentos) {
      if (agendamento.status === 'agendado') {
        const eventDate = new Date(agendamento.data_hora);
        if (isWithinInterval(eventDate, { start: now, end: nextWeek })) {
          const hasGoogleEvent = calendarEvents.some(
            e => e.extendedProps.agendamento_id === agendamento.id
          );
          if (!hasGoogleEvent) {
            result.push({
              type: 'deadline_near',
              title: 'Agendamento não sincronizado',
              description: `"${agendamento.responsavel}" não está no Google Calendar`,
              severity: 'medium',
              date: eventDate,
              suggestions: ['Sincronizar com Google Calendar', 'Verificar configurações'],
            });
          }
        }
      }
    }

    // 2. Peak load detection
    const eventsByHour = new Map<string, number>();
    for (const event of allEvents) {
      if (isWithinInterval(event.start, { start: now, end: nextWeek })) {
        const key = format(event.start, 'yyyy-MM-dd HH');
        eventsByHour.set(key, (eventsByHour.get(key) || 0) + 1);
      }
    }

    for (const [hourKey, count] of eventsByHour.entries()) {
      if (count >= 3) {
        result.push({
          type: 'peak_load',
          title: 'Pico de agendamentos',
          description: `${count} eventos simultâneos em ${hourKey}`,
          severity: 'high',
          date: new Date(`${hourKey}:00`),
          suggestions: ['Considerar reagendar alguns eventos', 'Verificar disponibilidade da equipe'],
        });
      }
    }

    // 3. Gaps detection
    for (let day = 0; day < 7; day++) {
      const currentDate = addDays(now, day);
      const dayEvents = allEvents.filter(e => 
        e.start.toDateString() === currentDate.toDateString()
      ).sort((a, b) => a.start.getTime() - b.start.getTime());

      if (dayEvents.length >= 2) {
        for (let i = 1; i < dayEvents.length; i++) {
          const prevEvent = dayEvents[i - 1];
          const currentEvent = dayEvents[i];
          if (!prevEvent || !currentEvent) continue;
          const gap = differenceInMinutes(currentEvent.start, prevEvent.end);
          if (gap >= 90) {
            result.push({
              type: 'gap_detected',
              title: 'Janela de tempo disponível',
              description: `${Math.floor(gap / 60)}h ${gap % 60}min livre entre eventos`,
              severity: 'low',
              date: prevEvent.end,
              suggestions: ['Agendar reunião interna', 'Bloquear para preparação'],
            });
          }
        }
      }
    }

    return result.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [agendamentos, calendarEvents, allEvents]);

  // Daily summary for next 7 days
  const dailySummaries = useMemo((): DailySummary[] => {
    const summaries: DailySummary[] = [];
    const now = new Date();

    for (let day = 0; day < 7; day++) {
      const currentDate = addDays(now, day);
      const dayEvents = allEvents.filter(e => 
        e.start.toDateString() === currentDate.toDateString()
      );

      const busyMinutes = dayEvents.reduce((sum, e) => 
        sum + differenceInMinutes(e.end, e.start), 0
      );
      const busyHours = busyMinutes / 60;
      const freeHours = Math.max(0, 10 - busyHours); // 10h business day

      // Peak hours
      const hourCounts = new Map<number, number>();
      for (const event of dayEvents) {
        const hour = event.start.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
      const peakHours = Array.from(hourCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([hour, count]) => ({
          start: `${hour.toString().padStart(2, '0')}:00`,
          end: `${(hour + 1).toString().padStart(2, '0')}:00`,
          count,
        }));

      const dayInsights = insights.filter(i => 
        i.date?.toDateString() === currentDate.toDateString()
      );

      summaries.push({
        date: currentDate,
        totalEvents: dayEvents.length,
        busyHours,
        freeHours,
        peakHours,
        insights: dayInsights,
      });
    }

    return summaries;
  }, [allEvents, insights]);

  // Actions
  const suggestBestTime = useCallback((duration: number = 60): TimeSlot | null => {
    const matchingSlots = optimalSlots.filter(
      slot => differenceInMinutes(slot.end, slot.start) >= duration
    );
    return matchingSlots[0] || null;
  }, [optimalSlots]);

  const checkConflict = useCallback((start: Date, end: Date): string[] => {
    const conflicts: string[] = [];
    for (const event of allEvents) {
      if (
        (isAfter(start, event.start) && isBefore(start, event.end)) ||
        (isAfter(end, event.start) && isBefore(end, event.end)) ||
        (isBefore(start, event.start) && isAfter(end, event.end))
      ) {
        conflicts.push(`Conflito com evento existente`);
      }
    }
    return conflicts;
  }, [allEvents]);

  return {
    weeklyPatterns,
    optimalSlots,
    insights,
    dailySummaries,
    suggestBestTime,
    checkConflict,
  };
}

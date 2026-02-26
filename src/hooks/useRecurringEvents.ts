/**
 * useRecurringEvents — Gestão de Eventos Recorrentes
 * 
 * - Criar eventos recorrentes (RRULE)
 * - Gerar instâncias futuras
 * - Editar série ou instância única
 * - Cancelar recorrência
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { rrulestr, RRule } from 'rrule';
import { addMonths } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecurringEvent {
  id: string;
  tenant_id: string;
  user_id: string;
  lead_id?: string;
  title: string;
  description?: string;
  area_juridica?: string;
  responsavel?: string;
  rrule: string;
  duration_minutes: number;
  timezone: string;
  start_date: string;
  end_date?: string;
  google_event_id?: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringEventInstance {
  id: string;
  recurring_event_id: string;
  agendamento_id?: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
  status: 'scheduled' | 'cancelled' | 'modified';
  created_at: string;
}

export interface CreateRecurringEventInput {
  title: string;
  description?: string;
  area_juridica?: string;
  responsavel?: string;
  rrule: string;
  duration_minutes: number;
  timezone?: string;
  start_date: string;
  end_date?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

const FREQ_MAP: Record<string, number> = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
  YEARLY: RRule.YEARLY,
};

function generateRRule(frequency: string, interval: number, startDate: Date, endDate?: Date): string {
  const rruleOptions = {
    freq: FREQ_MAP[frequency.toUpperCase()] ?? RRule.DAILY,
    interval,
    dtstart: startDate,
    ...(endDate && { until: endDate }),
  };

  return new RRule(rruleOptions).toString();
}

function parseRRule(rruleString: string): RRule {
  const parsed = rrulestr(rruleString);
  // rrulestr may return RRule or RRuleSet; we only use RRule features
  return parsed as unknown as RRule;
}

function generateInstances(
  recurringEvent: RecurringEvent,
  startDate: Date,
  endDate: Date
): RecurringEventInstance[] {
  const rule = parseRRule(recurringEvent.rrule);
  const instances: RecurringEventInstance[] = [];

  const dates = rule.between(startDate, endDate, true);

  for (const date of dates) {
    const startTime = date;
    const endTime = new Date(date.getTime() + recurringEvent.duration_minutes * 60000);

    instances.push({
      id: crypto.randomUUID(),
      recurring_event_id: recurringEvent.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'scheduled',
      created_at: new Date().toISOString(),
    });
  }

  return instances;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRecurringEvents() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  // Query recurring events
  const { data: recurringEvents = [], isLoading } = useQuery({
    queryKey: ['recurring-events', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('recurring_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RecurringEvent[];
    },
    enabled: !!tenantId,
  });

  // Query instances for a specific date range
  const getInstancesInRange = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('recurring_event_instances')
        .select(`
          *,
          recurring_event:recurring_events(*)
        `)
        .eq('recurring_event.tenant_id', tenantId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as (RecurringEventInstance & { recurring_event: RecurringEvent })[];
    },
    [tenantId]
  );

  // Create recurring event
  const createRecurringEvent = useMutation({
    mutationFn: async (input: CreateRecurringEventInput) => {
      if (!tenantId) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('recurring_events')
        .insert({
          tenant_id: tenantId,
          user_id: profile?.id,
          ...input,
          timezone: input.timezone || 'America/Sao_Paulo',
        })
        .select()
        .single();

      if (error) throw error;
      return data as RecurringEvent;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recurring-events'] });
    },
  });

  // Update recurring event
  const updateRecurringEvent = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RecurringEvent> }) => {
      if (!tenantId) throw new Error('Tenant not found');
      const { data, error } = await supabase
        .from('recurring_events')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringEvent;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recurring-events'] });
    },
  });

  // Delete recurring event (soft delete)
  const deleteRecurringEvent = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant not found');
      const { error } = await supabase
        .from('recurring_events')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recurring-events'] });
    },
  });

  // Generate future instances
  const generateFutureInstances = useCallback(
    async (recurringEventId: string, monthsAhead = 3) => {
      const event = recurringEvents.find(e => e.id === recurringEventId);
      if (!event) throw new Error('Event not found');

      const startDate = new Date();
      const endDate = addMonths(startDate, monthsAhead);
      const instances = generateInstances(event, startDate, endDate);

      // Insert instances
      const { error } = await supabase
        .from('recurring_event_instances')
        .insert(instances);

      if (error) throw error;

      return instances;
    },
    [recurringEvents]
  );

  // Cancel specific instance
  const cancelInstance = useMutation({
    mutationFn: async (instanceId: string) => {
      const { error } = await supabase
        .from('recurring_event_instances')
        .update({ status: 'cancelled' })
        .eq('id', instanceId);

      if (error) throw error;
    },
  });

  // Presets for common RRULEs
  const getRRulePresets = () => [
    {
      label: 'Diariamente',
      value: generateRRule('DAILY', 1, new Date()),
      description: 'Todos os dias',
    },
    {
      label: 'Semanalmente',
      value: generateRRule('WEEKLY', 1, new Date()),
      description: 'Toda semana',
    },
    {
      label: 'Quinzenalmente',
      value: generateRRule('WEEKLY', 2, new Date()),
      description: 'A cada 2 semanas',
    },
    {
      label: 'Mensalmente',
      value: generateRRule('MONTHLY', 1, new Date()),
      description: 'Todo mês',
    },
    {
      label: 'Bimestralmente',
      value: generateRRule('MONTHLY', 2, new Date()),
      description: 'A cada 2 meses',
    },
    {
      label: 'Anualmente',
      value: generateRRule('YEARLY', 1, new Date()),
      description: 'Todo ano',
    },
  ];

  // Format RRULE for display
  const formatRRule = useCallback((rruleString: string) => {
    try {
      const rule = parseRRule(rruleString);
      
      if (rule.options.freq === RRule.DAILY) {
        return rule.options.interval === 1 ? 'Diariamente' : `A cada ${rule.options.interval} dias`;
      }
      
      if (rule.options.freq === RRule.WEEKLY) {
        const interval = rule.options.interval || 1;
        if (interval === 1) return 'Semanalmente';
        return `A cada ${interval} semanas`;
      }
      
      if (rule.options.freq === RRule.MONTHLY) {
        const interval = rule.options.interval || 1;
        if (interval === 1) return 'Mensalmente';
        return `A cada ${interval} meses`;
      }
      
      if (rule.options.freq === RRule.YEARLY) {
        const interval = rule.options.interval || 1;
        if (interval === 1) return 'Anualmente';
        return `A cada ${interval} anos`;
      }
      
      return rruleString;
    } catch {
      return rruleString;
    }
  }, []);

  return {
    recurringEvents,
    isLoading,
    getInstancesInRange,
    createRecurringEvent,
    updateRecurringEvent,
    deleteRecurringEvent,
    generateFutureInstances,
    cancelInstance,
    getRRulePresets,
    formatRRule,
  };
}

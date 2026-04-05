/**
 * @module useAgendaReminders
 * @description Helper functions and hook for agenda reminder creation and scheduling.
 * Extracted from useAgendaAutomation for single-responsibility.
 *
 * @internal Used by useAgendaAutomation facade — do not import directly in components.
 */
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import type { Agendamento } from '@/hooks/useAgendamentos';

/**
 * Creates two email reminders for an agendamento: one 24h before and one 2h before.
 */
export async function createReminders(agendamento: Agendamento, userId: string) {
  const reminders = [
    {
      tenant_id: agendamento.tenant_id,
      user_id: userId,
      lead_id: agendamento.lead_id,
      agendamento_id: agendamento.id,
      type: 'email',
      scheduled_for: new Date(new Date(agendamento.data_hora).getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24h antes
      message: 'Lembrete: Agendamento amanhã',
      status: 'scheduled',
    },
    {
      tenant_id: agendamento.tenant_id,
      user_id: userId,
      lead_id: agendamento.lead_id,
      agendamento_id: agendamento.id,
      type: 'email',
      scheduled_for: new Date(new Date(agendamento.data_hora).getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2h antes
      message: 'Lembrete: Agendamento em 2 horas',
      status: 'scheduled',
    },
  ];

  const { error } = await supabase.from('reminders').insert(reminders);
  if (error) throw error;
}

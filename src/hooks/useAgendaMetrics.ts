/**
 * useAgendaMetrics — Agenda intelligence metrics
 *
 * Computes: today's count, next-7-days count, attendance rate, peak hours.
 * Stale: 2 min | Refetch: 5 min
 */

import { useQuery } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  startOfDay,
  endOfDay,
  addDays,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

export interface AgendaMetrics {
  hoje: number;
  semana: number;
  taxaComparecimento: number;  // 0–100
  horariosPico: string[];       // e.g. ['09:00', '14:00', '16:00']
}

const DEFAULT: AgendaMetrics = {
  hoje: 0,
  semana: 0,
  taxaComparecimento: 0,
  horariosPico: [],
};

async function fetchAgendaMetrics(tenantId: string): Promise<AgendaMetrics> {
  const now = new Date();

  // 1. Agendamentos de hoje
  const { data: hojeData } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('data_hora', startOfDay(now).toISOString())
    .lte('data_hora', endOfDay(now).toISOString());

  // 2. Agendamentos nos próximos 7 dias
  const { data: semanaData } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('data_hora', now.toISOString())
    .lte('data_hora', addDays(now, 7).toISOString());

  // 3. Todos do mês — para taxa de comparecimento + horários pico
  const { data: mesData } = await supabase
    .from('agendamentos')
    .select('id, status, data_hora')
    .eq('tenant_id', tenantId)
    .gte('data_hora', startOfMonth(now).toISOString())
    .lte('data_hora', endOfMonth(now).toISOString());

  const mesList = (mesData ?? []) as Array<{
    id: string;
    status: string | null;
    data_hora: string | null;
  }>;

  const totalMes = mesList.length;
  const compareceu = mesList.filter(a => a.status === 'compareceu').length;
  const taxaComparecimento =
    totalMes > 0 ? Math.round((compareceu / totalMes) * 100) : 0;

  // Agrupar por hora e pegar top 3
  const hourMap = new Map<number, number>();
  for (const a of mesList) {
    if (!a.data_hora) continue;
    const h = new Date(a.data_hora).getHours();
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1);
  }
  const horariosPico = Array.from(hourMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => `${String(h).padStart(2, '0')}:00`);

  return {
    hoje: (hojeData ?? []).length,
    semana: (semanaData ?? []).length,
    taxaComparecimento,
    horariosPico,
  };
}

export function useAgendaMetrics() {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data = DEFAULT, isLoading } = useQuery({
    queryKey: ['agenda-metrics', tenantId],
    queryFn: () => fetchAgendaMetrics(tenantId!),
    enabled: !!user && !!tenantId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return { data, isLoading };
}

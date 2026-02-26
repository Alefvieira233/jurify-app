import { useQuery } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ResponseTimeData {
  time: string;
  avgTime: number;
  p95Time: number;
}

function groupByDay(
  logs: Array<{ tempo_execucao: number | null; created_at: string | null }>
): ResponseTimeData[] {
  const byDay: Record<string, number[]> = {};

  for (const log of logs) {
    if (!log.tempo_execucao || !log.created_at) continue;
    const day = log.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(log.tempo_execucao);
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, times]) => {
      const sorted = [...times].sort((a, b) => a - b);
      const avg = times.reduce((s, t) => s + t, 0) / times.length;
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index] ?? sorted[sorted.length - 1] ?? 0;

      const [, month, dayNum] = day.split('-');
      return {
        time: `${dayNum}/${month}`,
        avgTime: Math.round(avg * 100) / 100,
        p95Time: Math.round(p95 * 100) / 100,
      };
    });
}

export function useResponseTime(days = 7) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery<ResponseTimeData[]>({
    queryKey: ['response-time', tenantId, days],
    queryFn: async () => {
      if (!tenantId) return [];

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('logs_execucao_agentes')
        .select('tempo_execucao, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return groupByDay(data ?? []);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!tenantId,
    placeholderData: [],
  });
}

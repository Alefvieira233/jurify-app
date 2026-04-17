/**
 * MISSION CONTROL — Admin Platform Metrics
 *
 * Métricas agregadas importantes para visão de plataforma (admin):
 *  - Tokens consumidos nos últimos 7 dias (SUM ai_usage.tokens_total)
 *  - Slash commands customizados por tenant (count onde tenant_id IS NOT NULL)
 *  - Processos sincronizados nas últimas 24h (count processos WHERE last_sync_at > now() - 24h)
 *
 * Dados são leves e cacheados via React Query (staleTime 60s).
 *
 * @version 1.0.0
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('MissionControlAdminMetrics');

export interface AdminMetrics {
  tokensLast7Days: number;
  customSlashCommands: number;
  processosSyncedLast24h: number;
}

const STALE_TIME_MS = 60_000;
const GC_TIME_MS = 5 * 60_000;

async function fetchAdminMetrics(): Promise<AdminMetrics> {
  // usage_date is a DATE column in ai_usage — filter on the last 7 calendar days.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoDate = sevenDaysAgo.toISOString().slice(0, 10); // YYYY-MM-DD
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [tokensResult, slashResult, processosResult] = await Promise.all([
    supabase
      .from('ai_usage')
      .select('tokens_total')
      .gte('usage_date', sevenDaysAgoDate),
    supabase
      .from('slash_commands')
      .select('id', { count: 'exact', head: true })
      .not('tenant_id', 'is', null),
    supabase
      .from('processos')
      .select('id', { count: 'exact', head: true })
      .gte('last_sync_at', twentyFourHoursAgo),
  ]);

  if (tokensResult.error) {
    log.error('Failed to fetch ai_usage tokens', tokensResult.error);
  }
  if (slashResult.error) {
    log.error('Failed to fetch custom slash_commands count', slashResult.error);
  }
  if (processosResult.error) {
    log.error('Failed to fetch processos sync count', processosResult.error);
  }

  const tokensLast7Days = (tokensResult.data ?? []).reduce(
    (sum, row: { tokens_total: number | null }) => sum + (row.tokens_total ?? 0),
    0
  );

  return {
    tokensLast7Days,
    customSlashCommands: slashResult.count ?? 0,
    processosSyncedLast24h: processosResult.count ?? 0,
  };
}

export function useAdminMetrics() {
  return useQuery<AdminMetrics>({
    queryKey: ['mission-control', 'admin-metrics'],
    queryFn: fetchAdminMetrics,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

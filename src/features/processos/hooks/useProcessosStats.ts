import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/integrations/supabase/client';

/**
 * Encapsulates the aggregate stats queries used by ProcessosManager:
 * - statsAtivos: count of 'ativo' status
 * - statsExito: percentage of wins over terminated processes
 */
export const useProcessosStats = (tenantId: string | null) => {
  const { data: statsAtivos } = useQuery({
    queryKey: queryKeys.processos.statsAtivos(tenantId),
    queryFn: async () => {
      const { count, error: err } = await supabase
        .from('processos')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId!)
        .eq('status', 'ativo');
      if (err) throw err;
      return count ?? 0;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: statsExito } = useQuery({
    queryKey: queryKeys.processos.statsExito(tenantId),
    queryFn: async () => {
      const statuses = ['encerrado_vitoria', 'encerrado_derrota', 'encerrado_acordo'];
      const counts = await Promise.all(
        statuses.map(async (s) => {
          const { count, error: err } = await supabase
            .from('processos')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId!)
            .eq('status', s);
          if (err) throw err;
          return count ?? 0;
        }),
      );
      const vitorias = counts[0] ?? 0;
      const derrotas = counts[1] ?? 0;
      const acordos = counts[2] ?? 0;
      const total = vitorias + derrotas + acordos;
      return total > 0 ? Math.round((vitorias / total) * 100) : 0;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    statsAtivos: statsAtivos ?? 0,
    statsExito: statsExito ?? 0,
  };
};

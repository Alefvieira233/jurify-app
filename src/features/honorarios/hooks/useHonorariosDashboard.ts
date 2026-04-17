/**
 * Hook for the Honorários dashboard aggregations.
 *
 * Reads from the `get_honorarios_dashboard` RPC (migration 20260417000011).
 * The RPC validates caller tenant internally; we pass the tenant_id for
 * defense-in-depth and to form a stable query key.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';

export interface HonorariosDashboardData {
  total_recebiveis: number;
  total_vencidos: number;
  count_vencidos: number;
  total_a_vencer: number;
  count_a_vencer: number;
  total_recebidos_mes: number;
  serie_mensal: Array<{ mes: string; label: string; total: number }>;
}

const EMPTY: HonorariosDashboardData = {
  total_recebiveis: 0,
  total_vencidos: 0,
  count_vencidos: 0,
  total_a_vencer: 0,
  count_a_vencer: 0,
  total_recebidos_mes: 0,
  serie_mensal: [],
};

export function useHonorariosDashboard() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;

  return useQuery<HonorariosDashboardData>({
    queryKey: [...queryKeys.honorarios.all, 'dashboard', tenantId],
    queryFn: async () => {
      if (!tenantId) return EMPTY;
      // Supabase type-gen may not yet include this RPC; cast narrowly.
      const { data, error } = await supabase.rpc(
        'get_honorarios_dashboard' as never,
        { p_tenant_id: tenantId } as never,
      );
      if (error) throw error;
      if (!data) return EMPTY;
      return data as unknown as HonorariosDashboardData;
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

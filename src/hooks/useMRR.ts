import { useQuery } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  pro: 997,
  enterprise: 2990,
};

interface MRRData {
  currentMRR: number;
  previousMRR: number;
  avgTicket: number;
  activeSubscriptions: number;
  growth: number;
}

async function fetchMRR(tenantId: string | undefined): Promise<MRRData> {
  if (!tenantId) return { currentMRR: 0, previousMRR: 0, avgTicket: 0, activeSubscriptions: 0, growth: 0 };

  const now = new Date();
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  // Current MRR: all active subscriptions for this tenant
  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('plan_id, created_at')
    .eq('status', 'active')
    .eq('tenant_id', tenantId);

  // Previous MRR: subscriptions that were active AND created before end of prev month
  // (approximation — a cancelled_at column would be more accurate)
  const { data: prevSubs } = await supabase
    .from('subscriptions')
    .select('plan_id, created_at')
    .eq('status', 'active')
    .eq('tenant_id', tenantId)
    .lte('created_at', endOfPrevMonth);

  const calcMRR = (subs: Array<{ plan_id: string | null }> | null) =>
    (subs ?? []).reduce((sum, s) => sum + (PLAN_PRICES[s.plan_id ?? 'free'] ?? 0), 0);

  const currentMRR = calcMRR(activeSubs);
  const previousMRR = calcMRR(prevSubs);
  const activeCount = activeSubs?.length ?? 0;
  const avgTicket = activeCount > 0 ? currentMRR / activeCount : 0;
  const growth = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0;

  return { currentMRR, previousMRR, avgTicket, activeSubscriptions: activeCount, growth };
}

export function useMRR() {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery<MRRData>({
    queryKey: ['mrr', tenantId],
    queryFn: () => fetchMRR(tenantId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user,
    placeholderData: { currentMRR: 0, previousMRR: 0, avgTicket: 0, activeSubscriptions: 0, growth: 0 },
  });
}

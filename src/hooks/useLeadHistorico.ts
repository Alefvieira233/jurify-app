/** Fetches chronological history of changes and events for a specific lead. */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { LeadHistorico } from '@/types/crm-operacional';


export function useLeadHistorico(leadId: string | null) {
  return useQuery({
    queryKey: queryKeys.leadHistorico.list(leadId ?? undefined),
    queryFn: async (): Promise<LeadHistorico[]> => {
      const { data, error } = await supabase
        .from('lead_historico')
        .select('*')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as LeadHistorico[];
    },
    enabled: !!leadId,
  });
}

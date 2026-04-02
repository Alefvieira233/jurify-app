/** Fetches chronological history of changes and events for a specific lead. */

import { useQuery } from '@tanstack/react-query';
import { supabaseUntyped } from '@/integrations/supabase/client';
import type { LeadHistorico } from '@/types/crm-operacional';


export function useLeadHistorico(leadId: string | null) {
  return useQuery({
    queryKey: ['lead_historico', leadId],
    queryFn: async (): Promise<LeadHistorico[]> => {
      const { data, error } = await supabaseUntyped
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

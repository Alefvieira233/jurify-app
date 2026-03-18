import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LeadHistorico } from '@/types/crm-operacional';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useLeadHistorico(leadId: string | null) {
  return useQuery({
    queryKey: ['lead_historico', leadId],
    queryFn: async (): Promise<LeadHistorico[]> => {
      const { data, error } = await db
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

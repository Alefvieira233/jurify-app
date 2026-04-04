import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import type { Tag } from '@/types/crm-operacional';


interface LeadTagRow {
  lead_id: string;
  tag: Tag;
}

/**
 * Batch-load tags for all leads in the tenant.
 * Returns a Map<leadId, Tag[]> for O(1) lookup per lead.
 */
export function useLeadTagsBatch() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const query = useQuery({
    queryKey: queryKeys.leadTagsBatch.list(tenantId),
    queryFn: async (): Promise<Map<string, Tag[]>> => {
      const { data, error } = await supabase
        .from('lead_tags')
        .select('lead_id, tag:tag_id(id, nome, cor, categoria, ordem, ativo)')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const map = new Map<string, Tag[]>();
      for (const row of (data ?? []) as unknown as LeadTagRow[]) {
        if (!row.tag || !row.tag.ativo) continue;
        const existing = map.get(row.lead_id);
        if (existing) {
          existing.push(row.tag);
        } else {
          map.set(row.lead_id, [row.tag]);
        }
      }
      return map;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    leadTagsMap: query.data ?? new Map<string, Tag[]>(),
    isLoading: query.isLoading,
  };
}

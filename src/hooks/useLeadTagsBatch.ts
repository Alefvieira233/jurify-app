import { useQuery } from '@tanstack/react-query';
import { supabaseUntyped } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tag } from '@/types/crm-operacional';


interface LeadTagRow {
  lead_id: string;
  tag: Tag | Tag[];
}

/**
 * Batch-load tags for all leads in the tenant.
 * Returns a Map<leadId, Tag[]> for O(1) lookup per lead.
 */
export function useLeadTagsBatch() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const query = useQuery({
    queryKey: ['lead_tags_batch', tenantId],
    queryFn: async (): Promise<Map<string, Tag[]>> => {
      const { data, error } = await supabaseUntyped
        .from('lead_tags')
        .select('lead_id, tag:tag_id(id, nome, cor, categoria, ordem, ativo)')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const map = new Map<string, Tag[]>();
      const rows = (data ?? []) as unknown as LeadTagRow[];

      for (const row of rows) {
        const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag;
        if (!tag || !tag.ativo) continue;

        const existing = map.get(row.lead_id);
        if (existing) {
          existing.push(tag as Tag);
        } else {
          map.set(row.lead_id, [tag as Tag]);
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

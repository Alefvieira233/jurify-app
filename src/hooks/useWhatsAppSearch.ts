import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  conversation_id: string;
  sender: string;
  content: string;
  message_type: string | null;
  ts: string;
  contact_name: string | null;
  phone_number: string | null;
  rank: number;
}

export interface SearchFilters {
  query: string;
  conversationId?: string;
  dateFrom?: string;
  dateTo?: string;
  sender?: string;
  limit?: number;
}

export function useWhatsAppSearch(filters: SearchFilters | null) {
  return useQuery<SearchResult[]>({
    queryKey: ['whatsapp', 'search', filters],
    queryFn: async () => {
      if (!filters || !filters.query.trim()) return [];
      const { data, error } = await supabase.rpc('search_whatsapp_messages', {
        p_query: filters.query.trim(),
        p_conversation_id: filters.conversationId ?? null,
        p_date_from: filters.dateFrom ?? null,
        p_date_to: filters.dateTo ?? null,
        p_sender: filters.sender ?? null,
        p_limit: filters.limit ?? 50,
      });
      if (error) throw error;
      return (data ?? []) as SearchResult[];
    },
    enabled: !!filters && filters.query.trim().length >= 2,
    staleTime: 30 * 1000,
  });
}

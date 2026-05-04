import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WindowStatus {
  is_open: boolean;
  last_inbound_at: string | null;
  expires_at: string | null;
  remaining_hours: number;
  age_hours?: number;
  reason: 'within_window' | 'window_closed' | 'no_inbound_yet' | 'no_conversation' | 'conversation_not_found';
}

const DEFAULT_CLOSED: WindowStatus = {
  is_open: false,
  last_inbound_at: null,
  expires_at: null,
  remaining_hours: 0,
  reason: 'no_conversation',
};

export function useWhatsAppWindow(conversationId: string | null | undefined) {
  const { data, isLoading, error, refetch } = useQuery<WindowStatus>({
    queryKey: ['whatsapp', 'window-status', conversationId],
    queryFn: async () => {
      if (!conversationId) return DEFAULT_CLOSED;
      const { data, error } = await supabase.rpc('get_whatsapp_window_status', {
        p_conversation_id: conversationId,
      });
      if (error) throw error;
      const parsed = (data ?? {}) as Partial<WindowStatus>;
      if ((parsed as { error?: string }).error) {
        return { ...DEFAULT_CLOSED, reason: 'conversation_not_found' };
      }
      return {
        is_open: parsed.is_open ?? false,
        last_inbound_at: parsed.last_inbound_at ?? null,
        expires_at: parsed.expires_at ?? null,
        remaining_hours: parsed.remaining_hours ?? 0,
        age_hours: parsed.age_hours,
        reason: parsed.reason ?? 'no_conversation',
      };
    },
    enabled: !!conversationId,
    staleTime: 60 * 1000, // 1 min — janela muda só após inbound
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });

  const isOpen = data?.is_open ?? false;
  const remainingHours = data?.remaining_hours ?? 0;
  const formattedRemaining = formatRemaining(remainingHours);

  return {
    status: data ?? DEFAULT_CLOSED,
    isOpen,
    isLoading,
    error,
    refetch,
    remainingHours,
    formattedRemaining,
    requiresTemplate: !isOpen,
  };
}

function formatRemaining(hours: number): string {
  if (hours <= 0) return 'Fechada';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 2) return '~1h';
  return `${Math.floor(hours)}h`;
}

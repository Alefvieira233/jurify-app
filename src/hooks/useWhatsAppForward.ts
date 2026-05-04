import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useWhatsAppForward() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: { messageId: string; toConversationIds: string[]; includeAttribution?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-forward', { body: payload });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao encaminhar');
      return data as { sent: number; failed: number; total: number };
    },
    onSuccess: (data) => toast({
      title: 'Encaminhada',
      description: `${data.sent}/${data.total} entregue${data.sent !== 1 ? 's' : ''}${data.failed > 0 ? ` · ${data.failed} falhou` : ''}`,
    }),
    onError: (err: unknown) => toast({
      title: 'Erro ao encaminhar',
      description: err instanceof Error ? err.message : 'Erro',
      variant: 'destructive',
    }),
  });
}

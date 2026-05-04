import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useReactToMessage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { to: string; messageId: string; emoji: string; conversationId?: string }) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-react', { body: payload });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao reagir');
      return data;
    },
    onError: (err: unknown) => toast({
      title: 'Erro ao reagir',
      description: err instanceof Error ? err.message : 'Erro desconhecido',
      variant: 'destructive',
    }),
  });
}

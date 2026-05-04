import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SuggestionTone = 'objetiva' | 'empatica' | 'esclarecedora';

export interface ReplySuggestion {
  tone: SuggestionTone;
  text: string;
}

export interface SmartReplyResult {
  suggestions: ReplySuggestion[];
  tokens_used: number | null;
  generated_at: string;
}

export function useSmartReply() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<SmartReplyResult> => {
      const { data, error } = await supabase.functions.invoke('suggest-whatsapp-reply', {
        body: { conversationId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao gerar sugestões');
      return data as SmartReplyResult;
    },
    onError: (err: unknown) => toast({
      title: 'Erro ao sugerir resposta',
      description: err instanceof Error ? err.message : 'Erro desconhecido',
      variant: 'destructive',
    }),
  });
}

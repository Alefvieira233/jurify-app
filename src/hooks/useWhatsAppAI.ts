import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ConversationSummary {
  summary: string;
  cached: boolean;
  message_count: number;
  generated_at: string;
  generated_by: string;
  tokens_used?: number;
}

export interface ExtractedData {
  nome?: string;
  cpf?: string;
  cnpj?: string;
  rg?: string;
  telefone_alternativo?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  profissao?: string;
  estado_civil?: string;
  processo_numero?: string;
  area_juridica?: string;
  valor_causa?: number;
  urgencia?: 'baixa' | 'media' | 'alta' | 'critica';
  observacoes?: string;
}

export interface ExtractResult {
  extracted: ExtractedData;
  fields_count: number;
  messages_analyzed: number;
  tokens_used?: number;
  generated_at: string;
}

export function useSummarizeConversation() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ conversationId, forceRefresh = false }: { conversationId: string; forceRefresh?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('summarize-whatsapp-conversation', {
        body: { conversationId, forceRefresh },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao gerar resumo');
      return data as ConversationSummary;
    },
    onError: (err: unknown) => toast({
      title: 'Erro ao gerar resumo',
      description: err instanceof Error ? err.message : 'Erro desconhecido',
      variant: 'destructive',
    }),
  });
}

export function useExtractData() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase.functions.invoke('extract-whatsapp-data', {
        body: { conversationId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao extrair dados');
      return data as ExtractResult;
    },
    onError: (err: unknown) => toast({
      title: 'Erro ao extrair dados',
      description: err instanceof Error ? err.message : 'Erro desconhecido',
      variant: 'destructive',
    }),
  });
}

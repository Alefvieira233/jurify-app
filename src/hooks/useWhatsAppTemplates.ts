import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  /** TemplateCategory plus future Meta values surfaced as raw strings. */
  category: TemplateCategory | (string & {});
  status: TemplateStatus | (string & {});
  components: Array<{ type: string; text?: string; format?: string; buttons?: unknown[] }>;
  parameter_count: number;
  example_values: unknown;
  last_synced_at: string;
}

export function useWhatsAppTemplates(onlyApproved = true) {
  const { data, isLoading, error, refetch } = useQuery<WhatsAppTemplate[]>({
    queryKey: ['whatsapp', 'templates', onlyApproved],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_whatsapp_templates', {
        p_only_approved: onlyApproved,
      });
      if (error) throw error;
      return (data ?? []) as WhatsAppTemplate[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return { templates: data ?? [], isLoading, error, refetch };
}

export function useSyncTemplates() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-whatsapp-templates', { body: {} });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao sincronizar');
      return data as { total: number; inserted: number; updated: number };
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'templates'] });
      toast({
        title: 'Templates sincronizados',
        description: `${data.total} templates · ${data.inserted} novos · ${data.updated} atualizados`,
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao sincronizar', description: msg, variant: 'destructive' });
    },
  });
}

export function useSendTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      to: string;
      templateName: string;
      language?: string;
      parameters?: string[];
      conversationId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-template', { body: payload });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao enviar template');
      return data as { messageId: string; template: string };
    },
    onSuccess: () => {
      toast({ title: 'Template enviado', description: 'Mensagem entregue ao cliente.' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar template', description: msg, variant: 'destructive' });
    },
  });
}

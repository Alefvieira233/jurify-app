/** CRUD for support tickets with status tracking and priority management. */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TicketSuporte {
  id: string;
  tenant_id: string;
  criador_id: string;
  tipo: 'duvida' | 'bug' | 'sugestao' | 'outro';
  conteudo: string;
  status: 'aberto' | 'em_andamento' | 'fechado';
  avaliacao: number | null;
  created_at: string;
  updated_at: string;
}

export function useTicketsSuporte() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets-suporte', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets_suporte')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TicketSuporte[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async (values: { tipo: string; conteudo: string }) => {
      const { error } = await supabase.from('tickets_suporte').insert({
        ...values,
        tenant_id: tenantId,
        criador_id: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets-suporte'] });
      toast({ title: 'Ticket criado com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar ticket', variant: 'destructive' });
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; status?: string; avaliacao?: number }) => {
      const { error } = await supabase
        .from('tickets_suporte')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets-suporte'] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar ticket', variant: 'destructive' });
    },
  });

  return { tickets: tickets ?? [], isLoading, createTicket, updateTicket };
}

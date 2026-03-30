import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { LeadNota } from '@/types/crm-operacional';


export function useLeadNotas(leadId: string | null) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const notasQuery = useQuery({
    queryKey: ['lead_notas', leadId],
    queryFn: async (): Promise<LeadNota[]> => {
      const { data, error } = await supabaseUntyped
        .from('lead_notas')
        .select('*')
        .eq('lead_id', leadId!)
        .order('fixada', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadNota[];
    },
    enabled: !!leadId,
  });

  const createNota = useMutation({
    mutationFn: async ({ conteudo, fixada }: { conteudo: string; fixada?: boolean }) => {
      if (!leadId || !tenantId || !user) throw new Error('Contexto de autenticação não disponível');
      const { data, error } = await supabaseUntyped
        .from('lead_notas')
        .insert({
          lead_id: leadId,
          tenant_id: tenantId,
          autor_id: user.id,
          autor_nome: profile?.nome_completo || 'Usuário',
          conteudo,
          fixada: fixada ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lead_notas', leadId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar nota', description: err.message, variant: 'destructive' });
    },
  });

  const updateNota = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadNota> & { id: string }) => {
      const { data, error } = await supabaseUntyped
        .from('lead_notas')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lead_notas', leadId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar nota', description: err.message, variant: 'destructive' });
    },
  });

  const deleteNota = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseUntyped.from('lead_notas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lead_notas', leadId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao remover nota', description: err.message, variant: 'destructive' });
    },
  });

  return {
    notas: notasQuery.data ?? [],
    isLoading: notasQuery.isLoading,
    createNota: createNota.mutateAsync,
    updateNota: updateNota.mutateAsync,
    deleteNota: deleteNota.mutateAsync,
  };
}

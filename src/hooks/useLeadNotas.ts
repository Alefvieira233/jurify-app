/**
 * CRUD for lead notes with optimistic updates and tenant-scoped queries.
 *
 * NOT migrated to useEntityCRUD because:
 * - Scoped by leadId (not tenant_id) as primary filter
 * - Custom ordering: fixada DESC, created_at DESC (dual-column sort)
 * - Create mutation injects autor_id, autor_nome from auth context
 * - Returns mutateAsync functions directly (consumers await them inline)
 * - Uses invalidateQueries instead of optimistic cache updates
 *
 * @see useEntityCRUD — preferred pattern for new entity hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { queryKeys } from '@/lib/queryKeys';
import type { LeadNota } from '@/types/crm-operacional';


export function useLeadNotas(leadId: string | null) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const notasQuery = useQuery({
    queryKey: queryKeys.leadNotas.list(leadId ?? undefined),
    queryFn: async (): Promise<LeadNota[]> => {
      const { data, error } = await supabase
        .from('lead_notas')
        .select('id, lead_id, tenant_id, autor_id, autor_nome, conteudo, fixada, created_at, updated_at')
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
      const { data, error } = await supabase
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.leadNotas.list(leadId ?? undefined) });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar nota', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const updateNota = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadNota> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não encontrado');
      const { data, error } = await supabase
        .from('lead_notas')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leadNotas.list(leadId ?? undefined) });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao atualizar nota', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const deleteNota = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não encontrado');
      const { error } = await supabase.from('lead_notas').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leadNotas.list(leadId ?? undefined) });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao remover nota', description: toUserMessage(err), variant: 'destructive' });
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

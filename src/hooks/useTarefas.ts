/**
 * CRUD operations for tasks (tarefas) with assignment, status tracking, and filtering.
 *
 * NOT migrated to useEntityCRUD because:
 * - Consumers call mutation objects directly (e.g. createTarefa.mutate(), updateTarefa.isPending)
 *   instead of the wrapped async functions useEntityCRUD exposes
 * - Create mutation injects criador_id from profile (not just tenant_id)
 * - Uses invalidateQueries instead of optimistic cache updates
 *
 * @see useEntityCRUD — preferred pattern for new entity hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';

export interface Tarefa {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  pontos: number | null;
  responsavel_id: string | null;
  criador_id: string;
  lead_id: string | null;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  created_at: string;
  updated_at: string;
}

export function useTarefas() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: tarefas, isLoading } = useQuery({
    queryKey: queryKeys.tarefas.list(tenantId),
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Tarefa[];
    },
  });

  const createTarefa = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from('tarefas').insert({
        ...values,
        tenant_id: tenantId,
        criador_id: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tarefas.all });
      toast({ title: 'Tarefa criada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' });
    },
  });

  const updateTarefa = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase
        .from('tarefas')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tarefas.all });
    },
  });

  const deleteTarefa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tarefas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tarefas.all });
      toast({ title: 'Tarefa removida' });
    },
  });

  return { tarefas: tarefas ?? [], isLoading, createTarefa, updateTarefa, deleteTarefa };
}

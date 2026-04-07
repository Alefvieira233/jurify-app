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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';
import { usePlanLimits } from '@/hooks/usePlanLimits';

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

export interface UseTarefasOptions {
  /** Page number (0-based). Defaults to 0. */
  page?: number;
  /** Items per page. Defaults to 50. */
  pageSize?: number;
  /** Server-side status filter (exact match). */
  status?: string;
  /** Server-side search on titulo (ilike). */
  search?: string;
}

type TarefasQueryData = { items: Tarefa[]; total: number };

export function useTarefas(options?: UseTarefasOptions) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;

  const page = options?.page ?? 0;
  const pageSize = options?.pageSize ?? 50;
  const status = options?.status;
  const search = options?.search;

  const { canUse: canUsePlan, limits: planLimits } = usePlanLimits();

  const qKey = queryKeys.tarefas.list(tenantId, page, status, search);

  const { data: queryData, isLoading, isError, error, refetch } = useQuery<TarefasQueryData>({
    queryKey: qKey,
    enabled: !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from('tarefas')
        .select('id, tenant_id, titulo, descricao, prazo, pontos, responsavel_id, criador_id, lead_id, status, prioridade, created_at, updated_at', { count: 'exact' })
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (search) query = query.ilike('titulo', `%${search}%`);

      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { items: (data ?? []) as Tarefa[], total: count ?? 0 };
    },
  });

  const tarefas = queryData?.items ?? [];
  const total = queryData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasMore = (page + 1) * pageSize < total;

  const createTarefa = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!tenantId || !profile?.id) throw new Error('Autenticação necessária');
      if (!canUsePlan('leads')) {
        toast({
          title: 'Limite do plano atingido',
          description: `Seu plano permite ${planLimits.leads} registros. Faça upgrade para criar mais tarefas.`,
          variant: 'destructive',
        });
        return;
      }
      const { error } = await supabase.from('tarefas').insert({
        ...values,
        tenant_id: tenantId,
        criador_id: profile.id,
        titulo: (values.titulo as string) ?? '',
      } as Record<string, unknown> & { tenant_id: string; criador_id: string; titulo: string });
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
      if (!tenantId) throw new Error('Tenant não encontrado');
      const { error } = await supabase.from('tarefas').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tarefas.all });
      toast({ title: 'Tarefa removida' });
    },
  });

  return {
    tarefas,
    isLoading,
    isError,
    error,
    refetch,
    createTarefa,
    updateTarefa,
    deleteTarefa,
    // Pagination metadata
    total,
    page,
    pageSize,
    totalPages,
    hasMore,
  };
}

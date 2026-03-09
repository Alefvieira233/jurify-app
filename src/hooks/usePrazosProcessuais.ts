/**
 * Hook para gerenciamento de Prazos Processuais.
 * Padrão: useProcessos.ts
 */
import { useCallback, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { addSentryBreadcrumb } from '@/lib/sentry';

const log = createLogger('Prazos');

// ─── Types ──────────────────────────────────────────────────────────────────

export type PrazoProcessual = {
  id: string;
  tenant_id: string | null;
  processo_id: string | null;
  lead_id: string | null;
  tipo: string;
  descricao: string;
  data_prazo: string;
  alertas_dias: number[] | null;
  responsavel_id: string | null;
  status: string;
  data_cumprimento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type PrazoInput = Partial<Omit<PrazoProcessual, 'id' | 'created_at' | 'updated_at'>>;

const ITEMS_PER_PAGE = 25;

export const prazosQueryKey = (tenantId: string | undefined, page?: number) =>
  ['prazos_processuais', tenantId, page ?? 1] as const;

function normalizePrazo(row: Record<string, unknown>): PrazoProcessual {
  return { ...(row as PrazoProcessual) };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const usePrazosProcessuais = (options?: {
  processoId?: string;
  enablePagination?: boolean;
  pageSize?: number;
  filterStatus?: string;
  filterTipo?: string;
  search?: string;
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const enablePagination = options?.enablePagination ?? false;
  const pageSize = options?.pageSize ?? ITEMS_PER_PAGE;
  const tenantId = profile?.tenant_id;
  const [currentPage, setCurrentPage] = useState(1);
  const qKey = prazosQueryKey(tenantId, enablePagination ? currentPage : undefined);

  const { data: queryData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: [...qKey, options?.processoId, options?.filterStatus, options?.filterTipo, options?.search],
    queryFn: async () => {
      let query = supabase
        .from('prazos_processuais')
        .select('*', { count: 'exact' })
        .order('data_prazo', { ascending: true });

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (options?.processoId) query = query.eq('processo_id', options.processoId);
      if (options?.filterStatus) query = query.eq('status', options.filterStatus);
      if (options?.filterTipo) query = query.eq('tipo', options.filterTipo);
      if (options?.search) query = query.ilike('descricao', `%${options.search}%`);

      if (enablePagination) {
        const from = (currentPage - 1) * pageSize;
        query = query.range(from, from + pageSize - 1);
      }

      const { data, error, count } = await query;
      if (error) { log.error('Erro ao buscar prazos', error); throw error; }

      return {
        items: (data || []).map(normalizePrazo),
        totalCount: count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const prazos = useMemo(() => queryData?.items ?? [], [queryData?.items]);
  const totalCount = queryData?.totalCount ?? 0;
  const totalPages = enablePagination ? Math.ceil(totalCount / pageSize) : 1;
  const error = queryError ? queryError.message : null;

  // Prazos urgentes (vencendo em até 7 dias) — memoized
  const prazosUrgentes = useMemo(() => prazos.filter(p => {
    if (p.status !== 'pendente') return false;
    const dias = Math.ceil((new Date(p.data_prazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return dias <= 7 && dias >= 0;
  }), [prazos]);

  const createMutation = useMutation({
    mutationFn: async (data: PrazoInput) => {
      const { data: created, error } = await supabase
        .from('prazos_processuais')
        .insert([{ ...data, tenant_id: tenantId ?? null }])
        .select()
        .single();
      if (error) throw error;
      return normalizePrazo(created as Record<string, unknown>);
    },
    onSuccess: (newItem) => {
      addSentryBreadcrumb(`Prazo criado: ${newItem.id}`, 'prazos', 'info');
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        items: [newItem, ...(prev?.items ?? [])],
        totalCount: (prev?.totalCount ?? 0) + 1,
      }));
      toast({ title: 'Prazo criado', description: 'Prazo processual cadastrado com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao criar prazo', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao criar prazo.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: string; updateData: Partial<PrazoInput> }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { data: updated, error } = await supabase
        .from('prazos_processuais')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalizePrazo(updated as Record<string, unknown>);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        items: (prev?.items ?? []).map(i => i.id === updated.id ? { ...i, ...updated } : i),
        totalCount: prev?.totalCount ?? 0,
      }));
      toast({ title: 'Prazo atualizado', description: 'Alterações salvas com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao atualizar prazo', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao atualizar.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { error } = await supabase
        .from('prazos_processuais')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        items: (prev?.items ?? []).filter(i => i.id !== deletedId),
        totalCount: Math.max(0, (prev?.totalCount ?? 1) - 1),
      }));
      toast({ title: 'Prazo removido', description: 'Prazo excluído com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao deletar prazo', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao remover.',
        variant: 'destructive',
      });
    },
  });

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }, [totalPages]);

  const createPrazo = useCallback(async (data: PrazoInput): Promise<boolean> => {
    if (!user) {
      toast({ title: 'Não autenticado', description: 'Faça login para continuar.', variant: 'destructive' });
      return false;
    }
    try { await createMutation.mutateAsync(data); return true; } catch { return false; }
  }, [user, createMutation, toast]);

  const updatePrazo = useCallback(async (id: string, updateData: Partial<PrazoInput>): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await updateMutation.mutateAsync({ id, updateData }); return true; } catch { return false; }
  }, [user, tenantId, updateMutation]);

  const deletePrazo = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await deleteMutation.mutateAsync(id); return true; } catch { return false; }
  }, [user, tenantId, deleteMutation]);

  const fetchPrazos = useCallback(() => { void refetch(); }, [refetch]);

  return {
    prazos,
    prazosUrgentes,
    loading,
    error,
    isEmpty: !loading && !error && prazos.length === 0,
    fetchPrazos,
    createPrazo,
    updatePrazo,
    deletePrazo,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage: () => { if (currentPage < totalPages) setCurrentPage(p => p + 1); },
    prevPage: () => { if (currentPage > 1) setCurrentPage(p => p - 1); },
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

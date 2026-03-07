/**
 * Hook para gerenciamento de Processos Jurídicos.
 * Padrão: useContratos.ts
 */
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { addSentryBreadcrumb } from '@/lib/sentry';

const log = createLogger('Processos');

// ─── Types ──────────────────────────────────────────────────────────────────

export type Processo = {
  id: string;
  tenant_id: string | null;
  lead_id: string | null;
  numero_processo: string | null;
  tribunal: string | null;
  vara: string | null;
  comarca: string | null;
  tipo_acao: string;
  area_juridica: string | null;
  fase_processual: string;
  posicao: string;
  responsavel_id: string | null;
  valor_causa: number | null;
  valor_honorario_acordado: number | null;
  tipo_honorario: string | null;
  data_distribuicao: string | null;
  data_encerramento: string | null;
  status: string;
  observacoes: string | null;
  partes_contrarias: string[] | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
};

export type ProcessoInput = Partial<Omit<Processo, 'id' | 'created_at' | 'updated_at'>>;

const ITEMS_PER_PAGE = 25;

// ─── Query key factory ───────────────────────────────────────────────────────

export const processosQueryKey = (tenantId: string | undefined, page?: number) =>
  ['processos', tenantId, page ?? 1] as const;

// ─── Pure helpers ────────────────────────────────────────────────────────────

function normalizeProcesso(row: Record<string, unknown>): Processo {
  return { ...(row as Processo) };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useProcessos = (options?: { enablePagination?: boolean; pageSize?: number }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const enablePagination = options?.enablePagination ?? false;
  const pageSize = options?.pageSize ?? ITEMS_PER_PAGE;
  const tenantId = profile?.tenant_id;
  const [currentPage, setCurrentPage] = useState(1);
  const qKey = processosQueryKey(tenantId, enablePagination ? currentPage : undefined);

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data: queryData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: qKey,
    queryFn: async () => {
      const effectiveTenantId = tenantId ??
        (user?.user_metadata as Record<string, unknown>)?.tenant_id as string | undefined;

      let query = supabase
        .from('processos')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId);
      } else {
        log.warn('Sem tenant_id. RLS deve atuar.');
      }

      if (enablePagination) {
        const from = (currentPage - 1) * pageSize;
        query = query.range(from, from + pageSize - 1);
      }

      const { data, error, count } = await query;
      if (error) { log.error('Erro ao buscar processos', error); throw error; }

      return {
        items: (data || []).map(normalizeProcesso),
        totalCount: count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const processos = queryData?.items ?? [];
  const totalCount = queryData?.totalCount ?? 0;
  const totalPages = enablePagination ? Math.ceil(totalCount / pageSize) : 1;
  const error = queryError ? queryError.message : null;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: ProcessoInput) => {
      const { data: created, error } = await supabase
        .from('processos')
        .insert([{ ...data, tenant_id: tenantId ?? null }])
        .select()
        .single();
      if (error) throw error;
      return normalizeProcesso(created as Record<string, unknown>);
    },
    onSuccess: (newItem) => {
      addSentryBreadcrumb(`Processo criado: ${newItem.id}`, 'processos', 'info');
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        items: [newItem, ...(prev?.items ?? [])],
        totalCount: (prev?.totalCount ?? 0) + 1,
      }));
      toast({ title: 'Processo criado', description: 'Processo jurídico cadastrado com sucesso!' });
    },
    onError: (err: unknown) => {
      addSentryBreadcrumb('Erro ao criar processo', 'processos', 'error');
      log.error('Erro ao criar processo', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao criar processo.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: string; updateData: Partial<ProcessoInput> }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { data: updated, error } = await supabase
        .from('processos')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalizeProcesso(updated as Record<string, unknown>);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        items: (prev?.items ?? []).map(i => i.id === updated.id ? { ...i, ...updated } : i),
        totalCount: prev?.totalCount ?? 0,
      }));
      toast({ title: 'Processo atualizado', description: 'Alterações salvas com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao atualizar processo', err);
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
        .from('processos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      addSentryBreadcrumb(`Processo deletado: ${deletedId}`, 'processos', 'info');
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        items: (prev?.items ?? []).filter(i => i.id !== deletedId),
        totalCount: Math.max(0, (prev?.totalCount ?? 1) - 1),
      }));
      toast({ title: 'Processo removido', description: 'Processo excluído com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao deletar processo', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao remover.',
        variant: 'destructive',
      });
    },
  });

  // ── Pagination ────────────────────────────────────────────────────────────

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  }, [currentPage]);

  // ── Public API ────────────────────────────────────────────────────────────

  const createProcesso = useCallback(async (data: ProcessoInput): Promise<boolean> => {
    if (!user) {
      toast({ title: 'Não autenticado', description: 'Faça login para continuar.', variant: 'destructive' });
      return false;
    }
    try {
      await createMutation.mutateAsync(data);
      return true;
    } catch { return false; }
  }, [user, createMutation, toast]);

  const updateProcesso = useCallback(async (id: string, updateData: Partial<ProcessoInput>): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try {
      await updateMutation.mutateAsync({ id, updateData });
      return true;
    } catch { return false; }
  }, [user, tenantId, updateMutation]);

  const deleteProcesso = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch { return false; }
  }, [user, tenantId, deleteMutation]);

  const fetchProcessos = useCallback(() => { void refetch(); }, [refetch]);

  return {
    processos,
    loading,
    error,
    isEmpty: !loading && !error && processos.length === 0,
    fetchProcessos,
    createProcesso,
    updateProcesso,
    deleteProcesso,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

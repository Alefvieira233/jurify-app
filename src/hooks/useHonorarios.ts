/**
 * Hook para gerenciamento de Honorários Advocatícios.
 * Padrão: useProcessos.ts
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { addSentryBreadcrumb } from '@/lib/sentry';

const log = createLogger('Honorarios');

// ─── Types ──────────────────────────────────────────────────────────────────

export type Honorario = {
  id: string;
  tenant_id: string | null;
  processo_id: string | null;
  lead_id: string | null;
  tipo: string;
  valor_fixo: number | null;
  valor_hora: number | null;
  taxa_contingencia: number | null;
  horas_estimadas: number | null;
  valor_total_acordado: number | null;
  valor_adiantamento: number | null;
  valor_recebido: number | null;
  data_vencimento: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type HonorarioInput = Partial<Omit<Honorario, 'id' | 'created_at' | 'updated_at'>>;

export const honorariosQueryKey = (tenantId: string | undefined) =>
  ['honorarios', tenantId] as const;

function normalizeHonorario(row: Record<string, unknown>): Honorario {
  return { ...(row as Honorario) };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export type HonorarioWithOverdue = Honorario & { overdue: boolean };

export const useHonorarios = (options?: { processoId?: string; page?: number }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;
  const qKey = honorariosQueryKey(tenantId);
  const page = options?.page ?? 1;

  const { data: queryData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: [...qKey, options?.processoId, page],
    queryFn: async () => {
      let query = supabase
        .from('honorarios')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (options?.processoId) query = query.eq('processo_id', options.processoId);

      const { data, error, count } = await query;
      if (error) { log.error('Erro ao buscar honorários', error); throw error; }

      const today = new Date().toISOString().slice(0, 10);
      const items: HonorarioWithOverdue[] = (data || []).map(row => {
        const h = normalizeHonorario(row as Record<string, unknown>);
        return {
          ...h,
          overdue: h.data_vencimento != null && h.data_vencimento < today && h.status === 'vigente',
        };
      });

      return {
        items,
        totalCount: count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const honorarios = queryData?.items ?? [];
  const totalCount = queryData?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const totalRecebido = honorarios.reduce((acc, h) => acc + (h.valor_recebido ?? 0), 0);
  const totalAcordado = honorarios.reduce((acc, h) => acc + (h.valor_total_acordado ?? 0), 0);
  const error = queryError ? queryError.message : null;

  const createMutation = useMutation({
    mutationFn: async (data: HonorarioInput) => {
      const { data: created, error } = await supabase
        .from('honorarios')
        .insert([{ ...data, tenant_id: tenantId ?? null }])
        .select()
        .single();
      if (error) throw error;
      return normalizeHonorario(created as Record<string, unknown>);
    },
    onSuccess: (newItem) => {
      addSentryBreadcrumb(`Honorário criado: ${newItem.id}`, 'honorarios', 'info');
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        items: [newItem, ...(prev?.items ?? [])],
        totalCount: (prev?.totalCount ?? 0) + 1,
      }));
      toast({ title: 'Honorário criado', description: 'Honorário cadastrado com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao criar honorário', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao criar honorário.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: string; updateData: Partial<HonorarioInput> }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { data: updated, error } = await supabase
        .from('honorarios')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalizeHonorario(updated as Record<string, unknown>);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        items: (prev?.items ?? []).map(i => i.id === updated.id ? { ...i, ...updated } : i),
        totalCount: prev?.totalCount ?? 0,
      }));
      toast({ title: 'Honorário atualizado', description: 'Alterações salvas com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao atualizar honorário', err);
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
        .from('honorarios')
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
      toast({ title: 'Honorário removido', description: 'Honorário excluído com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao deletar honorário', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao remover.',
        variant: 'destructive',
      });
    },
  });

  const createHonorario = useCallback(async (data: HonorarioInput): Promise<boolean> => {
    if (!user) {
      toast({ title: 'Não autenticado', description: 'Faça login para continuar.', variant: 'destructive' });
      return false;
    }
    try { await createMutation.mutateAsync(data); return true; } catch { return false; }
  }, [user, createMutation, toast]);

  const updateHonorario = useCallback(async (id: string, updateData: Partial<HonorarioInput>): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await updateMutation.mutateAsync({ id, updateData }); return true; } catch { return false; }
  }, [user, tenantId, updateMutation]);

  const deleteHonorario = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await deleteMutation.mutateAsync(id); return true; } catch { return false; }
  }, [user, tenantId, deleteMutation]);

  const fetchHonorarios = useCallback(() => { void refetch(); }, [refetch]);

  return {
    honorarios,
    totalRecebido,
    totalAcordado,
    totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    page,
    loading,
    error,
    isEmpty: !loading && !error && honorarios.length === 0,
    fetchHonorarios,
    createHonorario,
    updateHonorario,
    deleteHonorario,
  };
};

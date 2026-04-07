/** CRUD operations for appointments (agendamentos) with optimistic updates and tenant isolation. */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { queryKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/logger';

const log = createLogger('useAgendamentos');

type AgendamentoRow = {
  id: string;
  lead_id: string | null;
  tenant_id: string | null;
  area_juridica: string | null;
  data_hora: string;
  responsavel: string | null;
  observacoes: string | null;
  google_event_id: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
};
export type Agendamento = AgendamentoRow & {
  responsavel?: string | null;
  area_juridica?: string | null;
  observacoes?: string | null;
  google_event_id?: string | null;
};

export type AgendamentoInput = {
  lead_id?: string | null;
  area_juridica: string;
  data_hora: string;
  responsavel: string;
  observacoes?: string | null;
  google_event_id?: string | null;
  status?: string | null;
  tenant_id?: string | null;
};

// ─── Pure helpers ────────────────────────────────────────────────────────────

function normalizeAgendamento(row: AgendamentoRow): Agendamento {
  return {
    ...row,
    responsavel: row.responsavel ?? null,
    area_juridica: row.area_juridica ?? null,
    observacoes: row.observacoes ?? null,
    google_event_id: row.google_event_id ?? null,
  };
}

function sortByDataHora(list: Agendamento[]): Agendamento[] {
  return [...list].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
}

// ─── Query key factory ───────────────────────────────────────────────────────

/** @deprecated Use `queryKeys.agendamentos.list(tenantId)` from `@/lib/queryKeys` instead. */
export const agendamentosQueryKey = (tenantId: string | undefined) =>
  queryKeys.agendamentos.list(tenantId);

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseAgendamentosOptions {
  /** Page number (0-based). Defaults to 0. */
  page?: number;
  /** Items per page. Defaults to 50. */
  pageSize?: number;
  /** Server-side status filter (exact match). */
  status?: string;
  /** Filter agendamentos on or after this date (ISO string). */
  dateFrom?: string;
  /** Filter agendamentos on or before this date (ISO string). */
  dateTo?: string;
}

export const useAgendamentos = (options?: UseAgendamentosOptions) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const page = options?.page ?? 0;
  const pageSize = options?.pageSize ?? 50;
  const status = options?.status;
  const dateFrom = options?.dateFrom;
  const dateTo = options?.dateTo;

  const qKey = queryKeys.agendamentos.list(tenantId, page, status, dateFrom, dateTo);

  // ── Query ──────────────────────────────────────────────────────────────────
  type QueryData = { items: Agendamento[]; total: number };

  const {
    data: queryData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<QueryData>({
    queryKey: qKey,
    queryFn: async () => {
      let query = supabase
        .from('agendamentos')
        .select('id, lead_id, tenant_id, area_juridica, data_hora, responsavel, observacoes, google_event_id, status, created_at, updated_at', { count: 'exact' })
        .order('data_hora', { ascending: true });

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (status) query = query.eq('status', status);
      if (dateFrom) query = query.gte('data_hora', dateFrom);
      if (dateTo) query = query.lte('data_hora', dateTo);

      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        items: (data || []).map(row => normalizeAgendamento(row as AgendamentoRow)),
        total: count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const agendamentos = queryData?.items ?? [];
  const total = queryData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasMore = (page + 1) * pageSize < total;
  const error = queryError ? (queryError).message : null;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: AgendamentoInput) => {
      const effectiveTenantId = data.tenant_id ?? tenantId;
      if (!effectiveTenantId) throw new Error('Tenant não identificado');
      const payload = {
        ...data,
        tenant_id: effectiveTenantId,
        titulo: data.area_juridica ? `${data.area_juridica} - ${data.responsavel}` : `Agendamento - ${data.responsavel}`,
      };
      const { data: row, error } = await supabase.from('agendamentos').insert([payload]).select().single();
      if (error) throw error;
      return normalizeAgendamento(row as AgendamentoRow);
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<QueryData>(qKey, prev => ({
        items: sortByDataHora([...(prev?.items ?? []), newItem]),
        total: (prev?.total ?? 0) + 1,
      }));
      toast({ title: 'Sucesso', description: 'Agendamento criado com sucesso!' });
      if (tenantId && user?.id) {
        const dataFormatada = new Date(newItem.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        void supabase.from('notificacoes').insert({
          tenant_id: tenantId,
          tipo: 'info',
          titulo: 'Novo agendamento criado',
          mensagem: `${newItem.area_juridica ?? 'Consulta'} — ${dataFormatada}`,
          created_by: user.id,
        });
      }
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: string; updateData: Partial<AgendamentoInput> }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { lead_id, area_juridica, data_hora, responsavel, observacoes, google_event_id, status: updateStatus } = updateData;
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (lead_id !== undefined) updatePayload.lead_id = lead_id;
      if (area_juridica !== undefined) updatePayload.area_juridica = area_juridica;
      if (data_hora !== undefined) updatePayload.data_hora = data_hora;
      if (responsavel !== undefined) updatePayload.responsavel = responsavel;
      if (observacoes !== undefined) updatePayload.observacoes = observacoes;
      if (google_event_id !== undefined) updatePayload.google_event_id = google_event_id;
      if (updateStatus !== undefined) updatePayload.status = updateStatus;
      const { data: row, error } = await supabase
        .from('agendamentos')
        .update(updatePayload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalizeAgendamento(row as AgendamentoRow);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<QueryData>(qKey, prev => ({
        items: sortByDataHora((prev?.items ?? []).map(a => a.id === updated.id ? { ...a, ...updated } : a)),
        total: prev?.total ?? 0,
      }));
      toast({ title: 'Sucesso', description: 'Agendamento atualizado com sucesso!' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { error } = await supabase.from('agendamentos').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<QueryData>(qKey, prev => ({
        items: (prev?.items ?? []).filter(a => a.id !== deletedId),
        total: Math.max(0, (prev?.total ?? 1) - 1),
      }));
      toast({ title: 'Sucesso', description: 'Agendamento deletado com sucesso!' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  const createAgendamento = useCallback(async (data: AgendamentoInput): Promise<boolean> => {
    if (!user) { toast({ title: 'Erro de autenticação', description: 'Usuário não autenticado', variant: 'destructive' }); return false; }
    try { await createMutation.mutateAsync(data); return true; } catch (err) { log.error('createAgendamento failed', err); return false; }
  }, [user, createMutation, toast]);

  const updateAgendamento = useCallback(async (id: string, updateData: Partial<AgendamentoInput>): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await updateMutation.mutateAsync({ id, updateData }); return true; } catch (err) { log.error('updateAgendamento failed', err); return false; }
  }, [user, tenantId, updateMutation]);

  const deleteAgendamento = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await deleteMutation.mutateAsync(id); return true; } catch (err) { log.error('deleteAgendamento failed', err); return false; }
  }, [user, tenantId, deleteMutation]);

  const fetchAgendamentos = useCallback(() => { void refetch(); }, [refetch]);

  return {
    agendamentos,
    loading,
    error,
    isEmpty: !loading && !error && agendamentos.length === 0,
    fetchAgendamentos,
    createAgendamento,
    updateAgendamento,
    deleteAgendamento,
    // Pagination metadata
    total,
    page,
    pageSize,
    totalPages,
    hasMore,
  };
};







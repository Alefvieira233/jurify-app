import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

export const agendamentosQueryKey = (tenantId: string | undefined) =>
  ['agendamentos', tenantId] as const;

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useAgendamentos = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;
  const qKey = agendamentosQueryKey(tenantId);

  // ── Query ──────────────────────────────────────────────────────────────────
  const {
    data: agendamentos = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<Agendamento[]>({
    queryKey: qKey,
    queryFn: async () => {
      let query = supabase
        .from('agendamentos')
        .select('*')
        .order('data_hora', { ascending: true });

      if (tenantId) query = query.eq('tenant_id', tenantId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(row => normalizeAgendamento(row as AgendamentoRow));
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const error = queryError ? (queryError).message : null;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: AgendamentoInput) => {
      const payload = { ...data, tenant_id: data.tenant_id ?? tenantId ?? null };
      const { data: row, error } = await supabase.from('agendamentos').insert([payload]).select().single();
      if (error) throw error;
      return normalizeAgendamento(row as AgendamentoRow);
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<Agendamento[]>(qKey, prev => sortByDataHora([...(prev ?? []), newItem]));
      toast({ title: 'Sucesso', description: 'Agendamento criado com sucesso!' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Não foi possível criar o agendamento.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: string; updateData: Partial<AgendamentoInput> }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { data: row, error } = await supabase
        .from('agendamentos')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalizeAgendamento(row as AgendamentoRow);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Agendamento[]>(qKey, prev =>
        sortByDataHora((prev ?? []).map(a => a.id === updated.id ? { ...a, ...updated } : a))
      );
      toast({ title: 'Sucesso', description: 'Agendamento atualizado com sucesso!' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Não foi possível atualizar o agendamento.', variant: 'destructive' });
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
      queryClient.setQueryData<Agendamento[]>(qKey, prev => (prev ?? []).filter(a => a.id !== deletedId));
      toast({ title: 'Sucesso', description: 'Agendamento deletado com sucesso!' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Não foi possível deletar o agendamento.', variant: 'destructive' });
    },
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  const createAgendamento = useCallback(async (data: AgendamentoInput): Promise<boolean> => {
    if (!user) { toast({ title: 'Erro de autenticação', description: 'Usuário não autenticado', variant: 'destructive' }); return false; }
    try { await createMutation.mutateAsync(data); return true; } catch { return false; }
  }, [user, createMutation, toast]);

  const updateAgendamento = useCallback(async (id: string, updateData: Partial<AgendamentoInput>): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await updateMutation.mutateAsync({ id, updateData }); return true; } catch { return false; }
  }, [user, tenantId, updateMutation]);

  const deleteAgendamento = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try { await deleteMutation.mutateAsync(id); return true; } catch { return false; }
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
  };
};







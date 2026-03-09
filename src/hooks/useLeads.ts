/**
 * @module useLeads
 * @description Hook principal para gerenciamento de leads jurídicos.
 * Suporta paginação, busca, filtros por status/área jurídica,
 * e operações CRUD com validação e sanitização integradas.
 *
 * Migrado para TanStack React Query — deduplicação, cache, background refetch
 * e optimistic updates automáticos via queryClient.setQueryData.
 *
 * @example
 * ```tsx
 * const { leads, loading, fetchLeads, createLead, updateLead } = useLeads({ enablePagination: true });
 * ```
 */
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { addSentryBreadcrumb } from '@/lib/sentry';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const log = createLogger('Leads');

type LeadMetadata = Record<string, unknown>;

export type LeadTemperature = 'cold' | 'warm' | 'hot';

export type Lead = {
  id: string;
  nome: string | null;
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  mensagem_inicial?: string | null;
  area_juridica: string | null;
  status: string | null;
  origem: string | null;
  valor_causa?: number | null;
  responsavel_id: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
  descricao: string | null;
  tenant_id: string | null;
  metadata: LeadMetadata | null;
  created_at: string;
  updated_at: string | null;
  // CRM Professional fields
  lead_score: number;
  pipeline_stage_id: string | null;
  temperature: LeadTemperature;
  expected_value: number | null;
  probability: number;
  lost_reason: string | null;
  won_at: string | null;
  lost_at: string | null;
  last_activity_at: string | null;
  next_followup_at: string | null;
  followup_count: number;
  company_name: string | null;
  cpf_cnpj: string | null;
};

export type CreateLeadData = {
  nome_completo: string;
  telefone?: string | null;
  email?: string | null;
  area_juridica?: string | null;
  origem?: string | null;
  valor_causa?: number | null;
  responsavel?: string | null;
  observacoes?: string | null;
  status?: string | null;
  tenant_id?: string | null;
  responsavel_id?: string | null;
  descricao?: string | null;
  metadata?: LeadMetadata | null;
  // CRM Professional fields
  temperature?: LeadTemperature;
  expected_value?: number | null;
  probability?: number;
  company_name?: string | null;
  cpf_cnpj?: string | null;
  pipeline_stage_id?: string | null;
  lost_reason?: string | null;
};

export type LeadInput = CreateLeadData;

const ITEMS_PER_PAGE = 25;

// ─── Pure helpers (outside hook to avoid re-creation on every render) ────────

function normalizeLead(lead: Record<string, unknown>): Lead {
  return {
    ...(lead as Lead),
    nome_completo: (lead.nome_completo ?? lead.nome ?? null) as string | null,
    responsavel: ((lead.metadata as LeadMetadata)?.responsavel_nome ?? null) as string | null,
    observacoes: (lead.descricao ?? null) as string | null,
    lead_score: (lead.lead_score as number) ?? 0,
    pipeline_stage_id: (lead.pipeline_stage_id as string) ?? null,
    temperature: (lead.temperature as LeadTemperature) ?? 'warm',
    expected_value: (lead.expected_value as number) ?? null,
    probability: (lead.probability as number) ?? 50,
    lost_reason: (lead.lost_reason as string) ?? null,
    won_at: (lead.won_at as string) ?? null,
    lost_at: (lead.lost_at as string) ?? null,
    last_activity_at: (lead.last_activity_at as string) ?? null,
    next_followup_at: (lead.next_followup_at as string) ?? null,
    followup_count: (lead.followup_count as number) ?? 0,
    company_name: (lead.company_name as string) ?? null,
    cpf_cnpj: (lead.cpf_cnpj as string) ?? null,
  };
}

function mapLeadInputToDb(data: Partial<LeadInput>, userId?: string): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data };

  const hasNome = Object.prototype.hasOwnProperty.call(payload, 'nome') ||
    Object.prototype.hasOwnProperty.call(payload, 'nome_completo');
  if (hasNome) {
    payload.nome = (payload.nome ?? payload.nome_completo ?? '') as string;
  }
  delete payload.nome_completo;

  const responsavel = payload.responsavel as string | undefined;
  if (responsavel) {
    payload.metadata = {
      ...((payload.metadata as LeadMetadata) || {}),
      responsavel_nome: responsavel,
    };
    if (userId && !payload.responsavel_id) payload.responsavel_id = userId;
  }
  delete payload.responsavel;

  if (payload.observacoes && !payload.descricao) payload.descricao = payload.observacoes;
  delete payload.observacoes;

  return payload;
}

// ─── Query key factory ───────────────────────────────────────────────────────

export const leadsQueryKey = (tenantId: string | undefined, page?: number) =>
  ['leads', tenantId, page ?? 1] as const;

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useLeads = (options?: { enablePagination?: boolean; pageSize?: number }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const enablePagination = options?.enablePagination ?? false;
  const pageSize = options?.pageSize ?? ITEMS_PER_PAGE;
  const tenantId = profile?.tenant_id;

  // Paginação local — só usado quando enablePagination=true
  const [currentPage, setCurrentPage] = useState(1);

  // ── Query ──────────────────────────────────────────────────────────────────
  const qKey = leadsQueryKey(tenantId, enablePagination ? currentPage : undefined);

  const {
    data: queryData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: qKey,
    queryFn: async () => {
      log.debug(`Buscando leads (página ${currentPage})`);

      const rawTenantId = tenantId ?? (user?.user_metadata as Record<string, unknown>)?.tenant_id;
      const effectiveTenantId = typeof rawTenantId === 'string' ? rawTenantId : undefined;

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId);
      } else {
        log.warn('Sem tenant_id disponível para filtro. RLS deve atuar.');
      }

      if (enablePagination) {
        const from = (currentPage - 1) * pageSize;
        query = query.range(from, from + pageSize - 1);
      }

      const { data, error: fetchError, count } = await query;
      if (fetchError) throw fetchError;

      log.debug(`${data?.length ?? 0} leads encontrados`);
      return { leads: (data || []).map(normalizeLead), totalCount: count ?? 0 };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,    // 2 min — leads mudam com frequência média
    refetchOnWindowFocus: true,
  });

  const leads = queryData?.leads ?? [];
  const totalCount = queryData?.totalCount ?? 0;
  const totalPages = enablePagination ? Math.ceil(totalCount / pageSize) : 1;
  const error = queryError ? (queryError).message : null;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: LeadInput) => {
      const payload = {
        ...mapLeadInputToDb(data, user?.id),
        tenant_id: tenantId ?? null,
      };
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return normalizeLead(newLead);
    },
    onSuccess: (newLead) => {
      addSentryBreadcrumb(`Lead criado: ${newLead.id}`, 'leads', 'info');
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        leads: [newLead, ...(prev?.leads ?? [])],
        totalCount: (prev?.totalCount ?? 0) + 1,
      }));
      toast({ title: 'Sucesso', description: 'Lead criado com sucesso!' });
      if (tenantId && user?.id) {
        void supabase.from('notificacoes').insert({
          tenant_id: tenantId,
          tipo: 'info',
          titulo: 'Novo lead cadastrado',
          mensagem: `${newLead.nome} foi adicionado ao pipeline.`,
          created_by: user.id,
        });
      }
    },
    onError: (err: unknown) => {
      addSentryBreadcrumb('Erro ao criar lead', 'leads', 'error');
      log.error('Erro ao criar lead', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível criar o lead.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: string; updateData: Partial<LeadInput> }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const payload = mapLeadInputToDb(updateData, user?.id);
      const { data: updatedLead, error } = await supabase
        .from('leads')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalizeLead(updatedLead);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        leads: (prev?.leads ?? []).map(l => l.id === updated.id ? { ...l, ...updated } : l),
        totalCount: prev?.totalCount ?? 0,
      }));
      toast({ title: 'Sucesso', description: 'Lead atualizado com sucesso!' });
    },
    onError: (err: unknown) => {
      log.error('Erro ao atualizar lead', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível atualizar o lead.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      addSentryBreadcrumb(`Lead deletado: ${deletedId}`, 'leads', 'info');
      queryClient.setQueryData(qKey, (prev: typeof queryData) => ({
        leads: (prev?.leads ?? []).filter(l => l.id !== deletedId),
        totalCount: Math.max(0, (prev?.totalCount ?? 1) - 1),
      }));
      toast({ title: 'Sucesso', description: 'Lead removido com sucesso!' });
    },
    onError: (err: unknown) => {
      addSentryBreadcrumb('Erro ao deletar lead', 'leads', 'error');
      log.error('Erro ao deletar lead', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível remover o lead.',
        variant: 'destructive',
      });
    },
  });

  // ── Pagination helpers ─────────────────────────────────────────────────────

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  }, [currentPage]);

  // ── Public API (identical to previous implementation) ─────────────────────

  const { canUse: canUsePlan, usage: planUsage, limits: planLimits, refresh: refreshPlanUsage } = usePlanLimits();

  const createLead = useCallback(async (data: LeadInput): Promise<boolean> => {
    if (!user) {
      toast({ title: 'Erro de autenticação', description: 'Usuário não autenticado', variant: 'destructive' });
      return false;
    }
    if (!canUsePlan('leads')) {
      toast({
        title: 'Limite de leads atingido',
        description: `Seu plano permite ${planLimits.leads} leads. Faça upgrade para continuar.`,
        variant: 'destructive',
      });
      return false;
    }
    try {
      await createMutation.mutateAsync(data);
      void refreshPlanUsage();
      return true;
    } catch {
      return false;
    }
  }, [user, createMutation, toast, canUsePlan, planLimits.leads, refreshPlanUsage]);

  const updateLead = useCallback(async (id: string, updateData: Partial<LeadInput>): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try {
      await updateMutation.mutateAsync({ id, updateData });
      return true;
    } catch {
      return false;
    }
  }, [user, tenantId, updateMutation]);

  const deleteLead = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !tenantId) return false;
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [user, tenantId, deleteMutation]);

  const fetchLeads = useCallback(() => { void refetch(); }, [refetch]);

  return {
    leads,
    loading,
    error,
    isEmpty: !loading && !error && leads.length === 0,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    planUsage,
    planLimits,
    canUsePlan,
    currentPage,
    totalPages,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

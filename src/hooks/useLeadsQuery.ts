/**
 * @module useLeadsQuery
 * @description Hook for lead list query logic with pagination, visibility scoping,
 * and column projection. Extracted from useLeads for single-responsibility.
 *
 * @internal Used by useLeads facade — do not import directly in components.
 */
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { createLogger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';
import { LeadRowSchema } from '@/schemas/domain';
import type { Lead, LeadTemperature } from './useLeadsTypes';

const log = createLogger('LeadsQuery');

const ITEMS_PER_PAGE = 25;

/**
 * Column projection for list queries. Fetches only the columns needed by
 * list/table/pipeline views instead of all 47 columns.
 * Detail views (LeadDrawer, edit forms) use mutations that call .select() on
 * single rows, so they still get full data.
 */
const LIST_COLUMNS = [
  'id',
  'nome',
  'email',
  'telefone',
  'status',
  'lead_score',
  'responsavel_id',
  'departamento_id',
  'created_at',
  'updated_at',
  'tenant_id',
  'origem',
  'temperature',
  'area_juridica',
  'valor_causa',
  'pipeline_stage_id',
  'expected_value',
  'probability',
  'prioridade',
  'conexao_id',
  'company_name',
  'cpf_cnpj',
  'followup_count',
  'next_followup_at',
  'last_activity_at',
  'inactive_since',
  'arquivado_em',
  'motivo_arquivamento',
  'data_reativacao_prevista',
  'descricao',
].join(', ');

// ─── Pure helpers (outside hook to avoid re-creation on every render) ────────

export function normalizeLead(lead: Record<string, unknown>): Lead {
  return {
    ...(lead as Lead),
    nome_completo: (lead.nome_completo ?? lead.nome ?? null) as string | null,
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
    // CRM Operacional
    departamento_id: (lead.departamento_id as string) ?? null,
    conexao_id: (lead.conexao_id as string) ?? null,
    prioridade: (lead.prioridade as Lead['prioridade']) ?? 'media',
    assigned_at: (lead.assigned_at as string) ?? null,
    inactive_since: (lead.inactive_since as string) ?? null,
    ultima_interacao: (lead.ultima_interacao as string) ?? null,
    proxima_acao: (lead.proxima_acao as string) ?? null,
    proxima_acao_data: (lead.proxima_acao_data as string) ?? null,
    arquivado_em: (lead.arquivado_em as string) ?? null,
    motivo_arquivamento: (lead.motivo_arquivamento as string) ?? null,
    data_reativacao_prevista: (lead.data_reativacao_prevista as string) ?? null,
  };
}

export function mapLeadInputToDb(data: Partial<Record<string, unknown>>): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data };

  const hasNome = Object.prototype.hasOwnProperty.call(payload, 'nome') ||
    Object.prototype.hasOwnProperty.call(payload, 'nome_completo');
  if (hasNome) {
    payload.nome = (payload.nome ?? payload.nome_completo ?? '') as string;
  }
  delete payload.nome_completo;

  if (payload.observacoes && !payload.descricao) payload.descricao = payload.observacoes;
  delete payload.observacoes;

  return payload;
}

export interface LeadQueryData {
  leads: Lead[];
  totalCount: number;
}

/**
 * Hook that encapsulates the leads list query, pagination, and visibility scoping.
 */
export function useLeadsQuery(options?: { enablePagination?: boolean; pageSize?: number }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { getLeadVisibilityScope, getUserDepartamentos } = useRBAC();

  const enablePagination = options?.enablePagination ?? false;
  const pageSize = options?.pageSize ?? ITEMS_PER_PAGE;
  const tenantId = profile?.tenant_id;
  const visibilityScope = getLeadVisibilityScope();

  const [currentPage, setCurrentPage] = useState(1);

  const qKey = queryKeys.leads.list(tenantId, enablePagination ? currentPage : undefined, visibilityScope);

  const {
    data: queryData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: qKey,
    queryFn: async (): Promise<LeadQueryData> => {
      log.debug(`Buscando leads (página ${currentPage})`);

      const rawTenantId = tenantId ?? (user?.user_metadata as Record<string, unknown>)?.tenant_id;
      const effectiveTenantId = typeof rawTenantId === 'string' ? rawTenantId : undefined;

      let query = supabase
        .from('leads')
        .select(LIST_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId);
      } else {
        log.warn('Sem tenant_id disponível para filtro. RLS deve atuar.');
      }

      // Exclude archived leads — they should only appear in dedicated archive view
      query = query.is('arquivado_em', null);

      // Defense-in-depth: filter by visibility scope (RLS is authoritative, this is UX guard)
      if (visibilityScope === 'own' && profile?.id) {
        query = query.eq('responsavel_id', profile.id);
      } else if (visibilityScope === 'department') {
        const deptoIds = getUserDepartamentos();
        if (deptoIds.length > 0) {
          query = query.in('departamento_id', deptoIds);
        } else if (profile?.id) {
          // No department memberships → fall back to own leads only
          query = query.eq('responsavel_id', profile.id);
        }
      }
      // visibilityScope === 'all' → no additional filter (admin/manager)

      if (enablePagination) {
        const from = (currentPage - 1) * pageSize;
        query = query.range(from, from + pageSize - 1);
      }

      const { data, error: fetchError, count } = await query;
      if (fetchError) throw fetchError;

      log.debug(`${data?.length ?? 0} leads encontrados`);

      // Zod-validate each row at the Supabase boundary. Malformed rows are
      // dropped and logged — a single corrupt row must not break the list.
      // See src/schemas/domain/README.md for the pattern.
      const rawRows = (data ?? []) as unknown[];
      const leads = rawRows.flatMap((row): Lead[] => {
        const parsed = LeadRowSchema.safeParse(row);
        if (!parsed.success) {
          log.warn('Dropping malformed lead row', {
            rowId: (row as { id?: string } | null)?.id,
            issues: parsed.error.issues,
          });
          return [];
        }
        return [parsed.data];
      });

      return { leads, totalCount: count ?? 0 };
    },
    enabled: !!user && !!profile?.id && !!tenantId,
    staleTime: 2 * 60 * 1000,    // 2 min — leads mudam com frequência média
    refetchOnWindowFocus: false,
  });

  const leads = queryData?.leads ?? [];
  const totalCount = queryData?.totalCount ?? 0;
  const totalPages = enablePagination ? Math.ceil(totalCount / pageSize) : 1;
  const error = queryError ? (queryError).message : null;

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

  const fetchLeads = useCallback(() => { void refetch(); }, [refetch]);

  return {
    leads,
    loading,
    error,
    isEmpty: !loading && !error && leads.length === 0,
    fetchLeads,
    currentPage,
    totalPages,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    // Internals exposed for CRUD hook
    qKey,
    queryData,
    tenantId,
    queryClient,
  };
}

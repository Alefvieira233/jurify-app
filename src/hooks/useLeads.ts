/**
 * @module useLeads
 * @description Hook principal para gerenciamento de leads jurídicos.
 * Suporta paginação, busca, filtros por status/área jurídica,
 * e operações CRUD com validação e sanitização integradas.
 *
 * Migrado para TanStack React Query — deduplicação, cache, background refetch
 * e optimistic updates automáticos via queryClient.setQueryData.
 *
 * This is a facade that composes useLeadsQuery and useLeadsCRUD.
 *
 * @example
 * ```tsx
 * const { leads, loading, fetchLeads, createLead, updateLead } = useLeads({ enablePagination: true });
 * ```
 */
import { useLeadsQuery } from './useLeadsQuery';
import { useLeadsCRUD } from './useLeadsCRUD';

// ─── Re-exported types & utilities ──────────────────────────────────────────

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
  // CRM Operacional fields
  departamento_id: string | null;
  conexao_id: string | null;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  assigned_at: string | null;
  inactive_since: string | null;
  ultima_interacao: string | null;
  proxima_acao: string | null;
  proxima_acao_data: string | null;
  arquivado_em: string | null;
  motivo_arquivamento: string | null;
  data_reativacao_prevista: string | null;
};

export type CreateLeadData = {
  nome_completo: string;
  telefone?: string | null;
  email?: string | null;
  area_juridica?: string | null;
  origem?: string | null;
  valor_causa?: number | null;
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
  departamento_id?: string | null;
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente';
};

export type LeadInput = CreateLeadData;

// NOTE: leadsQueryKey deprecated wrapper removed. Use queryKeys.leads.list() from @/lib/queryKeys.

// ─── Facade Hook ────────────────────────────────────────────────────────────

export const useLeads = (options?: { enablePagination?: boolean; pageSize?: number }) => {
  const query = useLeadsQuery(options);

  const crud = useLeadsCRUD({
    qKey: query.qKey,
    queryData: query.queryData,
    tenantId: query.tenantId,
    queryClient: query.queryClient,
  });

  return {
    // Query
    leads: query.leads,
    loading: query.loading,
    error: query.error,
    isEmpty: query.isEmpty,
    fetchLeads: query.fetchLeads,
    // Pagination
    currentPage: query.currentPage,
    totalPages: query.totalPages,
    pageSize: query.pageSize,
    goToPage: query.goToPage,
    nextPage: query.nextPage,
    prevPage: query.prevPage,
    hasNextPage: query.hasNextPage,
    hasPrevPage: query.hasPrevPage,
    // CRUD
    createLead: crud.createLead,
    updateLead: crud.updateLead,
    deleteLead: crud.deleteLead,
    archiveLead: crud.archiveLead,
    unarchiveLead: crud.unarchiveLead,
    // Plan limits
    planUsage: crud.planUsage,
    planLimits: crud.planLimits,
    canUsePlan: crud.canUsePlan,
  };
};

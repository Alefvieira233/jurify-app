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

// Re-export types from the neutral module so existing consumers of
// `import { Lead, LeadInput } from '@/hooks/useLeads'` keep working.
export type {
  Lead,
  LeadInput,
  LeadTemperature,
  CreateLeadData,
  LeadMetadata,
} from './useLeadsTypes';

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

/**
 * Hook para gerenciamento de Prazos Processuais.
 *
 * Refactored to use {@link useEntityCRUD} for all CRUD boilerplate.
 * Custom logic: prazosUrgentes derived filter (deadlines within 7 days).
 */
import { useMemo } from 'react';
import { useEntityCRUD, type EntityCRUDOptions } from '@/hooks/useEntityCRUD';
import { queryKeys } from '@/lib/queryKeys';

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

// ─── Hook ────────────────────────────────────────────────────────────────────

export const usePrazosProcessuais = (options?: {
  processoId?: string;
  enablePagination?: boolean;
  pageSize?: number;
  filterStatus?: string;
  filterTipo?: string;
  search?: string;
}) => {
  const processoId = options?.processoId;
  const filterStatus = options?.filterStatus;
  const filterTipo = options?.filterTipo;
  const searchTerm = options?.search;

  // Build equality filters
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (processoId) f.processo_id = processoId;
    if (filterStatus) f.status = filterStatus;
    if (filterTipo) f.tipo = filterTipo;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [processoId, filterStatus, filterTipo]);

  // Single-column ilike search on descricao
  const search = useMemo(() => {
    if (!searchTerm) return undefined;
    return { column: 'descricao', term: searchTerm };
  }, [searchTerm]);

  const crudOptions: EntityCRUDOptions = {
    enablePagination: options?.enablePagination,
    filters,
    search,
    extraQueryKey: [processoId ?? '', filterStatus ?? '', filterTipo ?? '', searchTerm ?? ''],
  };

  const crud = useEntityCRUD<PrazoProcessual, PrazoInput>(
    {
      table: 'prazos_processuais',
      queryKeyPrefix: 'prazos_processuais',
      displayName: 'Prazo',
      listColumns: 'id, tenant_id, processo_id, lead_id, tipo, descricao, data_prazo, alertas_dias, responsavel_id, status, data_cumprimento, observacoes, created_at, updated_at',
      defaultSort: { column: 'data_prazo', ascending: true },
      pageSize: options?.pageSize,
      queryKeyFactory: (tenantId, page) => queryKeys.prazosProcessuais.list(tenantId, page),
    },
    crudOptions,
  );

  const prazos = crud.data;

  // Prazos urgentes (vencendo em ate 7 dias) — memoized
  const prazosUrgentes = useMemo(
    () =>
      prazos.filter(p => {
        if (p.status !== 'pendente') return false;
        const dias = Math.ceil(
          (new Date(p.data_prazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        return dias <= 7 && dias >= 0;
      }),
    [prazos],
  );

  return {
    prazos,
    prazosUrgentes,
    loading: crud.isLoading,
    error: crud.error,
    isEmpty: crud.isEmpty,
    fetchPrazos: crud.refetch,
    createPrazo: crud.createEntity,
    updatePrazo: crud.updateEntity,
    deletePrazo: crud.deleteEntity,
    currentPage: crud.currentPage,
    totalPages: crud.totalPages,
    totalCount: crud.totalCount,
    goToPage: crud.goToPage,
    nextPage: crud.nextPage,
    prevPage: crud.prevPage,
    hasNextPage: crud.hasNextPage,
    hasPrevPage: crud.hasPrevPage,
  };
};

/**
 * Hook para gerenciamento de Processos Jurídicos.
 *
 * Refactored to use {@link useEntityCRUD} for all CRUD boilerplate.
 * Custom logic: multi-column OR search across numero_processo, tribunal, comarca.
 */
import { useMemo, useCallback } from 'react';
import { useEntityCRUD, type EntityCRUDOptions } from '@/hooks/useEntityCRUD';
import { queryKeys } from '@/lib/queryKeys';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useToast } from '@/hooks/use-toast';

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

// ─── Query key factory ───────────────────────────────────────────────────────

/** @deprecated Use `queryKeys.processos.list(...)` from `@/lib/queryKeys` instead. */
export const processosQueryKey = (
  tenantId: string | undefined,
  page?: number,
  filterStatus?: string,
  filterTipo?: string,
  search?: string,
) =>
  queryKeys.processos.list(tenantId, page, filterStatus, filterTipo, search);

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useProcessos = (options?: {
  enablePagination?: boolean;
  pageSize?: number;
  filterStatus?: string;
  filterTipo?: string;
  search?: string;
}) => {
  const filterStatus = options?.filterStatus;
  const filterTipo = options?.filterTipo;
  const search = options?.search;

  // Build equality filters for useEntityCRUD
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (filterStatus) f.status = filterStatus;
    if (filterTipo) f.tipo_acao = filterTipo;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [filterStatus, filterTipo]);

  // Multi-column OR search requires a queryModifier since useEntityCRUD
  // only supports single-column ilike search natively.
  const queryModifier = useMemo(() => {
    if (!search) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (query: any) =>
      query.or(
        `numero_processo.ilike.%${search}%,tribunal.ilike.%${search}%,comarca.ilike.%${search}%`,
      );
  }, [search]);

  const crudOptions: EntityCRUDOptions = {
    enablePagination: options?.enablePagination,
    filters,
    queryModifier,
    extraQueryKey: [filterStatus ?? '', filterTipo ?? '', search ?? ''],
  };

  const crud = useEntityCRUD<Processo, ProcessoInput>(
    {
      table: 'processos',
      queryKeyPrefix: 'processos',
      displayName: 'Processo',
      listColumns: 'id,tenant_id,lead_id,numero_processo,tribunal,vara,comarca,tipo_acao,area_juridica,fase_processual,posicao,responsavel_id,valor_causa,valor_honorario_acordado,tipo_honorario,data_distribuicao,data_encerramento,status,observacoes,partes_contrarias,tags,created_at,updated_at',
      pageSize: options?.pageSize,
      queryKeyFactory: (tenantId, page) => queryKeys.processos.list(tenantId, page),
    },
    crudOptions,
  );

  const { canUse: canUsePlan, limits: planLimits } = usePlanLimits();
  const { toast } = useToast();

  const createProcesso = useCallback(async (input: ProcessoInput): Promise<boolean> => {
    if (!canUsePlan('leads')) {
      toast({
        title: 'Limite do plano atingido',
        description: `Seu plano permite ${planLimits.leads} registros. Faça upgrade para criar mais processos.`,
        variant: 'destructive',
      });
      return false;
    }
    return crud.createEntity(input);
  }, [canUsePlan, planLimits.leads, toast, crud]);

  return {
    processos: crud.data,
    loading: crud.isLoading,
    error: crud.error,
    isEmpty: crud.isEmpty,
    fetchProcessos: crud.refetch,
    createProcesso,
    updateProcesso: crud.updateEntity,
    deleteProcesso: crud.deleteEntity,
    currentPage: crud.currentPage,
    totalPages: crud.totalPages,
    totalCount: crud.totalCount,
    pageSize: crud.pageSize,
    goToPage: crud.goToPage,
    nextPage: crud.nextPage,
    prevPage: crud.prevPage,
    hasNextPage: crud.hasNextPage,
    hasPrevPage: crud.hasPrevPage,
  };
};

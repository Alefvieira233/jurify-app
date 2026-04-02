/**
 * Hook para gerenciamento de Honorarios Advocaticios.
 *
 * Refactored to use {@link useEntityCRUD} for all CRUD boilerplate.
 * Custom logic: overdue flag computation, totalRecebido/totalAcordado aggregates.
 */
import { useMemo } from 'react';
import { useEntityCRUD, type EntityCRUDOptions } from '@/hooks/useEntityCRUD';

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

export type HonorarioWithOverdue = Honorario & { overdue: boolean };

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useHonorarios = (options?: { processoId?: string; page?: number }) => {
  const processoId = options?.processoId;
  const page = options?.page ?? 1;

  // Build equality filters
  const filters = useMemo(() => {
    if (!processoId) return undefined;
    return { processo_id: processoId };
  }, [processoId]);

  const crudOptions: EntityCRUDOptions = {
    enablePagination: true,
    page,
    filters,
    extraQueryKey: [processoId ?? ''],
  };

  const crud = useEntityCRUD<Honorario, HonorarioInput>(
    {
      table: 'honorarios',
      queryKeyPrefix: 'honorarios',
      displayName: 'Honorario',
      listColumns: '*',
    },
    crudOptions,
  );

  // Compute overdue flag and aggregates on top of base CRUD data
  const honorarios: HonorarioWithOverdue[] = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return crud.data.map(h => ({
      ...h,
      overdue: h.data_vencimento != null && h.data_vencimento < today && h.status === 'vigente',
    }));
  }, [crud.data]);

  const totalRecebido = useMemo(
    () => honorarios.reduce((acc, h) => acc + (h.valor_recebido ?? 0), 0),
    [honorarios],
  );

  const totalAcordado = useMemo(
    () => honorarios.reduce((acc, h) => acc + (h.valor_total_acordado ?? 0), 0),
    [honorarios],
  );

  return {
    honorarios,
    totalRecebido,
    totalAcordado,
    totalCount: crud.totalCount,
    totalPages: crud.totalPages,
    hasNextPage: crud.hasNextPage,
    hasPrevPage: crud.hasPrevPage,
    page,
    loading: crud.isLoading,
    error: crud.error,
    isEmpty: crud.isEmpty,
    fetchHonorarios: crud.refetch,
    createHonorario: crud.createEntity,
    updateHonorario: crud.updateEntity,
    deleteHonorario: crud.deleteEntity,
  };
};

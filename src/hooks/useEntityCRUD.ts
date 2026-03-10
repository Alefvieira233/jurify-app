/**
 * Generic CRUD hook factory.
 *
 * Extracts the common pattern found in useProcessos, useHonorarios,
 * usePrazosProcessuais, etc. into a reusable factory so new entity
 * hooks can be created with minimal boilerplate.
 *
 * Usage:
 *   const useWidgets = (opts?) => useEntityCRUD<Widget, WidgetInput>({
 *     table: 'widgets',
 *     queryKeyPrefix: 'widgets',
 *     displayName: 'Widget',
 *     listColumns: '*',
 *   }, opts);
 */
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { addSentryBreadcrumb } from '@/lib/sentry';

// ─── Configuration ──────────────────────────────────────────────────────────

export interface EntityCRUDConfig<T> {
  /** Supabase table name */
  table: string;
  /** Prefix used for React Query cache keys */
  queryKeyPrefix: string;
  /** Human-readable name used in toast messages (e.g. "Processo", "Honorário") */
  displayName: string;
  /** Column selection string passed to .select() (usually '*') */
  listColumns: string;
  /** Default sort column and direction */
  defaultSort?: { column: keyof T & string; ascending?: boolean };
  /** Optional row normalizer — defaults to identity cast */
  normalize?: (row: unknown) => T;
  /** Items per page when pagination is enabled (default 25) */
  pageSize?: number;
}

export interface EntityCRUDOptions {
  /** Enable range-based pagination */
  enablePagination?: boolean;
  /** Current page (1-based). Only used when enablePagination is true. */
  page?: number;
  /** Equality filters applied as .eq(column, value) */
  filters?: Record<string, string>;
  /** Single-column ilike search */
  search?: { column: string; term: string };
}

export interface EntityCRUDResult<T, TInput> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refetch: () => void;
  createEntity: (input: TInput) => Promise<boolean>;
  updateEntity: (id: string, updateData: Partial<TInput>) => Promise<boolean>;
  deleteEntity: (id: string) => Promise<boolean>;
  /** Mutation loading states */
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

// ─── Default normalizer ─────────────────────────────────────────────────────

function defaultNormalize<T>(row: unknown): T {
  return { ...(row as T) };
}

// ─── Hook factory ───────────────────────────────────────────────────────────

export function useEntityCRUD<
  T extends { id: string },
  TInput = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>,
>(
  config: EntityCRUDConfig<T>,
  options?: EntityCRUDOptions,
): EntityCRUDResult<T, TInput> {
  const {
    table,
    queryKeyPrefix,
    displayName,
    listColumns,
    defaultSort,
    pageSize: configPageSize,
  } = config;

  const normalize = config.normalize ?? defaultNormalize<T>;

  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const log = createLogger(queryKeyPrefix);

  const enablePagination = options?.enablePagination ?? false;
  const pageSize = configPageSize ?? 25;
  const filters = options?.filters;
  const search = options?.search;
  const tenantId = profile?.tenant_id;

  // When the caller manages page externally, honour it; otherwise manage internally.
  const externalPage = options?.page;
  const [internalPage, setInternalPage] = useState(1);
  const currentPage = externalPage ?? internalPage;

  const sortColumn = defaultSort?.column ?? 'created_at';
  const sortAscending = defaultSort?.ascending ?? false;

  // ── Query key ──────────────────────────────────────────────────────────────

  const qKey = [
    queryKeyPrefix,
    tenantId,
    enablePagination ? currentPage : 1,
    filters ? JSON.stringify(filters) : '',
    search ? `${search.column}:${search.term}` : '',
  ] as const;

  // ── Query ──────────────────────────────────────────────────────────────────

  type QueryData = { items: T[]; totalCount: number };

  const {
    data: queryData,
    isLoading: loading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: qKey,
    queryFn: async (): Promise<QueryData> => {
      const effectiveTenantId =
        tenantId ??
        ((user?.user_metadata as Record<string, unknown>)?.tenant_id as string | undefined);

      let query = supabase
        .from(table)
        .select(listColumns, { count: 'exact' })
        .order(sortColumn, { ascending: sortAscending });

      // Tenant isolation
      if (effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId);
      } else {
        log.warn('Sem tenant_id. RLS deve atuar.');
      }

      // Equality filters
      if (filters) {
        for (const [col, val] of Object.entries(filters)) {
          if (val) {
            query = query.eq(col, val);
          }
        }
      }

      // ilike search
      if (search?.term) {
        query = query.ilike(search.column, `%${search.term}%`);
      }

      // Pagination
      if (enablePagination) {
        const from = (currentPage - 1) * pageSize;
        query = query.range(from, from + pageSize - 1);
      }

      const { data, error, count } = await query;
      if (error) {
        log.error(`Erro ao buscar ${displayName.toLowerCase()}`, error);
        throw error;
      }

      return {
        items: (data || []).map((row: unknown) => normalize(row)),
        totalCount: count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const data = queryData?.items ?? [];
  const totalCount = queryData?.totalCount ?? 0;
  const totalPages = enablePagination ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
  const error = queryError ? queryError.message : null;

  // ── Create mutation ────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (input: TInput) => {
      const { data: created, error } = await supabase
        .from(table)
        .insert([{ ...(input as Record<string, unknown>), tenant_id: tenantId ?? null }])
        .select()
        .single();
      if (error) throw error;
      return normalize(created);
    },
    onSuccess: (newItem: T) => {
      addSentryBreadcrumb(`${displayName} criado: ${newItem.id}`, queryKeyPrefix, 'info');
      queryClient.setQueryData(qKey, (prev: QueryData | undefined) => ({
        items: [newItem, ...(prev?.items ?? [])],
        totalCount: (prev?.totalCount ?? 0) + 1,
      }));
      toast({
        title: `${displayName} criado`,
        description: `${displayName} cadastrado com sucesso!`,
      });
    },
    onError: (err: unknown) => {
      addSentryBreadcrumb(`Erro ao criar ${displayName.toLowerCase()}`, queryKeyPrefix, 'error');
      log.error(`Erro ao criar ${displayName.toLowerCase()}`, err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : `Falha ao criar ${displayName.toLowerCase()}.`,
        variant: 'destructive',
      });
    },
  });

  // ── Update mutation ────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: string; updateData: Partial<TInput> }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { data: updated, error } = await supabase
        .from(table)
        .update({
          ...(updateData as Record<string, unknown>),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return normalize(updated);
    },
    onSuccess: (updated: T) => {
      queryClient.setQueryData(qKey, (prev: QueryData | undefined) => ({
        items: (prev?.items ?? []).map(i => (i.id === updated.id ? { ...i, ...updated } : i)),
        totalCount: prev?.totalCount ?? 0,
      }));
      toast({
        title: `${displayName} atualizado`,
        description: 'Alterações salvas com sucesso!',
      });
    },
    onError: (err: unknown) => {
      log.error(`Erro ao atualizar ${displayName.toLowerCase()}`, err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao atualizar.',
        variant: 'destructive',
      });
    },
  });

  // ── Delete mutation ────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId: string) => {
      addSentryBreadcrumb(`${displayName} deletado: ${deletedId}`, queryKeyPrefix, 'info');
      queryClient.setQueryData(qKey, (prev: QueryData | undefined) => ({
        items: (prev?.items ?? []).filter(i => i.id !== deletedId),
        totalCount: Math.max(0, (prev?.totalCount ?? 1) - 1),
      }));
      toast({
        title: `${displayName} removido`,
        description: `${displayName} excluído com sucesso!`,
      });
    },
    onError: (err: unknown) => {
      log.error(`Erro ao deletar ${displayName.toLowerCase()}`, err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao remover.',
        variant: 'destructive',
      });
    },
  });

  // ── Pagination helpers ─────────────────────────────────────────────────────

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) setInternalPage(page);
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) setInternalPage(p => p + 1);
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) setInternalPage(p => p - 1);
  }, [currentPage]);

  // ── Public action wrappers ─────────────────────────────────────────────────

  const createEntity = useCallback(
    async (input: TInput): Promise<boolean> => {
      if (!user) {
        toast({
          title: 'Não autenticado',
          description: 'Faça login para continuar.',
          variant: 'destructive',
        });
        return false;
      }
      try {
        await createMutation.mutateAsync(input);
        return true;
      } catch {
        return false;
      }
    },
    [user, createMutation, toast],
  );

  const updateEntity = useCallback(
    async (id: string, updateData: Partial<TInput>): Promise<boolean> => {
      if (!user || !tenantId) return false;
      try {
        await updateMutation.mutateAsync({ id, updateData });
        return true;
      } catch {
        return false;
      }
    },
    [user, tenantId, updateMutation],
  );

  const deleteEntity = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user || !tenantId) return false;
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    [user, tenantId, deleteMutation],
  );

  const refetch = useCallback(() => {
    void queryRefetch();
  }, [queryRefetch]);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    data,
    isLoading: loading,
    error,
    isEmpty: !loading && !error && data.length === 0,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    goToPage,
    nextPage,
    prevPage,
    refetch,
    createEntity,
    updateEntity,
    deleteEntity,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

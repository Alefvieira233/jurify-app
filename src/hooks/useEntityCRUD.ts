/**
 * Generic CRUD hook factory for Supabase-backed entities.
 *
 * Preferred pattern for new entity hooks — extracts query/create/update/delete,
 * pagination, tenant isolation, toasts, and Sentry breadcrumbs. Types live in
 * `./useEntityCRUD.types.ts` and are re-exported here so existing
 * `@/hooks/useEntityCRUD` imports keep working.
 *
 * @example
 * ```ts
 * import { useEntityCRUD } from '@/hooks/useEntityCRUD';
 * export const useWidgets = (opts?: EntityCRUDOptions) =>
 *   useEntityCRUD<Widget, WidgetInput>({
 *     table: 'widgets', queryKeyPrefix: 'widgets', displayName: 'Widget',
 *     listColumns: 'id, name, tenant_id, created_at',
 *   }, opts);
 * ```
 */
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { addSentryBreadcrumb } from '@/lib/sentry';
import { toUserMessage } from '@/lib/errorMessages';
import type {
  EntityCRUDConfig,
  EntityCRUDOptions,
  EntityCRUDResult,
} from './useEntityCRUD.types';

// Re-export types for backward compatibility — consumers import from '@/hooks/useEntityCRUD'.
export type {
  EntityCRUDConfig,
  EntityCRUDOptions,
  EntityCRUDResult,
  EntityQueryBuilder,
} from './useEntityCRUD.types';

// useEntityCRUD is a generic factory that works with dynamic table names.
// The typed Supabase client expects literal table names, so we use a loosely-typed
// wrapper for the dynamic `.from(table)` calls in this file only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dynamicSupabase = supabase as any;

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
  const queryModifier = options?.queryModifier;
  const extraQueryKey = options?.extraQueryKey;
  const tenantId = profile?.tenant_id;

  // When the caller manages page externally, honour it; otherwise manage internally.
  const externalPage = options?.page;
  const [internalPage, setInternalPage] = useState(1);
  const currentPage = externalPage ?? internalPage;

  const sortColumn = defaultSort?.column ?? 'created_at';
  const sortAscending = defaultSort?.ascending ?? false;

  // ── Query key ──────────────────────────────────────────────────────────────

  const baseKey = config.queryKeyFactory
    ? [...config.queryKeyFactory(tenantId ?? undefined, enablePagination ? currentPage : 1)]
    : [queryKeyPrefix, tenantId, enablePagination ? currentPage : 1];

  const qKey = [
    ...baseKey,
    filters ? JSON.stringify(filters) : '',
    search ? `${search.column}:${search.term}` : '',
    ...(extraQueryKey ?? []),
  ];

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

      let query = dynamicSupabase
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

      // Custom query modifier
      if (queryModifier) {
        query = queryModifier(query);
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
    refetchOnWindowFocus: false,
  });

  const data = queryData?.items ?? [];
  const totalCount = queryData?.totalCount ?? 0;
  const totalPages = enablePagination ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
  const error = queryError ? queryError.message : null;

  // ── Create mutation ────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (input: TInput) => {
      const { data: created, error } = await dynamicSupabase
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
        description: toUserMessage(err),
        variant: 'destructive',
      });
    },
  });

  // ── Update mutation ────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: string; updateData: Partial<TInput> }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { data: updated, error } = await dynamicSupabase
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
        description: toUserMessage(err),
        variant: 'destructive',
      });
    },
  });

  // ── Delete mutation ────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { error } = await dynamicSupabase
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
        description: toUserMessage(err),
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
      } catch (err) {
        log.error('createEntity failed', err);
        return false;
      }
    },
    [user, createMutation, toast, log],
  );

  const updateEntity = useCallback(
    async (id: string, updateData: Partial<TInput>): Promise<boolean> => {
      if (!user || !tenantId) return false;
      try {
        await updateMutation.mutateAsync({ id, updateData });
        return true;
      } catch (err) {
        log.error('updateEntity failed', err);
        return false;
      }
    },
    [user, tenantId, updateMutation, log],
  );

  const deleteEntity = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user || !tenantId) return false;
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch (err) {
        log.error('deleteEntity failed', err);
        return false;
      }
    },
    [user, tenantId, deleteMutation, log],
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

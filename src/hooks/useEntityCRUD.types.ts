/**
 * Shared type definitions for `useEntityCRUD`.
 *
 * Extracted from `useEntityCRUD.ts` to keep the hook implementation under the
 * 400-line budget while preserving a single, stable import surface. Consumers
 * should continue to import these types from `@/hooks/useEntityCRUD` — that
 * module re-exports everything defined here for backward compatibility.
 */
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Loose builder type used by `queryModifier`. The factory works with dynamic
 * table names, so the schema/row generic params are intentionally `any`.
 * Callers can refine the type at the call site if needed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityQueryBuilder = PostgrestFilterBuilder<any, any, any[]>;

// ─── Configuration ──────────────────────────────────────────────────────────

export interface EntityCRUDConfig<T> {
  /** Supabase table name */
  table: string;
  /** Prefix used for React Query cache keys */
  queryKeyPrefix: string;
  /** Human-readable name used in toast messages (e.g. "Processo", "Honorário") */
  displayName: string;
  /** Column selection string passed to .select(). Prefer explicit columns over '*' to avoid overfetching. */
  listColumns: string;
  /** Default sort column and direction */
  defaultSort?: { column: keyof T & string; ascending?: boolean };
  /** Optional row normalizer — defaults to identity cast */
  normalize?: (row: unknown) => T;
  /** Items per page when pagination is enabled (default 25) */
  pageSize?: number;
  /**
   * Query key factory function from `@/lib/queryKeys`.
   * When provided, replaces the inline `[queryKeyPrefix, tenantId, ...]` array
   * with a centralized factory key. The returned array is used as the base key;
   * extraQueryKey values are still appended.
   *
   * @example
   * ```ts
   * queryKeyFactory: (tenantId, page) => queryKeys.honorarios.list(tenantId)
   * ```
   */
  queryKeyFactory?: (tenantId: string | undefined, page: number) => readonly unknown[];
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
  /**
   * Modify the Supabase query builder before execution.
   * Use for OR-based search, multi-column filters, or any query logic
   * that doesn't fit the simple `filters`/`search` options.
   */
  queryModifier?: (query: EntityQueryBuilder) => EntityQueryBuilder;
  /**
   * Extra values appended to the React Query cache key.
   * Ensures the cache is properly scoped when using queryModifier.
   */
  extraQueryKey?: readonly unknown[];
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

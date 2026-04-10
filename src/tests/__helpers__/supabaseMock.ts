/**
 * Programmable Supabase query mock.
 *
 * Replaces the chainable Proxy pattern used throughout the hook tests (41 files
 * as of the 2026-04-10 audit) which returned canned data for ANY method call,
 * meaning filter/order/eq chains were never actually exercised — every hook
 * test was effectively tautological.
 *
 * This mock:
 *   1. Returns a chainable builder that tracks the ops applied (select, eq, lt,
 *      gte, order, range, limit, in, is, or...).
 *   2. When `then` / `maybeSingle` / `single` is invoked, filters the seeded
 *      table rows according to the accumulated ops and returns the matching
 *      result in the shape Supabase would.
 *   3. Supports `.insert`, `.update`, `.upsert`, `.delete` with in-place
 *      mutation of the seed (so tests can assert that writes actually landed).
 *   4. Lets tests inject per-table errors to simulate RLS denials, PGRST116
 *      (no rows), or network failures.
 *
 * Not a full PostgREST reimplementation — the goal is to make common hook
 * queries exercise real filter logic so passing the test actually means
 * something.
 */

import { vi } from 'vitest';

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export interface MockSupabaseConfig {
  /** Initial seed data, keyed by table name. */
  tables?: Record<string, Row[]>;
  /**
   * Per-table error responses. When set, any query on this table returns the
   * error instead of data. Useful for RLS denial simulation.
   */
  errors?: Record<string, { message: string; code?: string }>;
}

export interface MockSupabase {
  // deno-lint-ignore no-explicit-any
  from: (table: string) => any;
  /** Current seed snapshot — tests can assert that writes landed. */
  readonly snapshot: Readonly<Record<string, Row[]>>;
  /** Reset the mock to its initial config. */
  reset(): void;
  /** Inject an error for a specific table mid-test. */
  setError(table: string, error: { message: string; code?: string } | null): void;
  /** Manually seed or replace data for a table. */
  seed(table: string, rows: Row[]): void;
  /** Spy on raw calls for assertion purposes. */
  readonly fromSpy: ReturnType<typeof vi.fn>;
}

type FilterOp =
  | { kind: 'eq'; col: string; value: unknown }
  | { kind: 'neq'; col: string; value: unknown }
  | { kind: 'gt'; col: string; value: unknown }
  | { kind: 'gte'; col: string; value: unknown }
  | { kind: 'lt'; col: string; value: unknown }
  | { kind: 'lte'; col: string; value: unknown }
  | { kind: 'in'; col: string; values: unknown[] }
  | { kind: 'is'; col: string; value: null | boolean }
  | { kind: 'like'; col: string; pattern: string }
  | { kind: 'ilike'; col: string; pattern: string };

interface QueryState {
  table: string;
  op: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  filters: FilterOp[];
  selectCols?: string;
  orderBy?: { col: string; asc: boolean };
  rangeStart?: number;
  rangeEnd?: number;
  limitN?: number;
  insertRows?: Row[];
  updatePatch?: Row;
  returning: boolean;
}

function applyFilters(rows: Row[], filters: FilterOp[]): Row[] {
  return rows.filter((row) => {
    for (const f of filters) {
      const v = row[f.col];
      switch (f.kind) {
        case 'eq':
          if (v !== f.value) return false;
          break;
        case 'neq':
          if (v === f.value) return false;
          break;
        case 'gt':
          if (!(v > (f.value as number))) return false;
          break;
        case 'gte':
          if (!(v >= (f.value as number))) return false;
          break;
        case 'lt':
          if (!(v < (f.value as number))) return false;
          break;
        case 'lte':
          if (!(v <= (f.value as number))) return false;
          break;
        case 'in':
          if (!f.values.includes(v)) return false;
          break;
        case 'is':
          // Treat `undefined` as equivalent to `null` — a missing column value in
          // the mock seed behaves like a SQL NULL for the `.is('col', null)` filter.
          if (f.value === null) {
            if (v !== null && v !== undefined) return false;
          } else if (v !== f.value) {
            return false;
          }
          break;
        case 'like':
        case 'ilike': {
          const pattern = f.pattern.replace(/%/g, '.*').replace(/_/g, '.');
          const re = new RegExp(`^${pattern}$`, f.kind === 'ilike' ? 'i' : '');
          if (typeof v !== 'string' || !re.test(v)) return false;
          break;
        }
      }
    }
    return true;
  });
}

function uuid(): string {
  // Deterministic enough for tests: 8 random hex groups
  const chars = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * 16)];
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

export function createMockSupabase(config: MockSupabaseConfig = {}): MockSupabase {
  const initial = JSON.parse(JSON.stringify(config.tables ?? {})) as Record<string, Row[]>;
  const errors: Record<string, { message: string; code?: string }> = { ...(config.errors ?? {}) };
  let tables: Record<string, Row[]> = JSON.parse(JSON.stringify(initial));

  const fromSpy = vi.fn();

  function executeQuery(state: QueryState): { data: unknown; error: unknown; count: number | null } {
    const err = errors[state.table];
    if (err) return { data: null, error: err, count: null };

    if (!tables[state.table]) tables[state.table] = [];
    const rows = tables[state.table];

    // --- INSERT
    if (state.op === 'insert' && state.insertRows) {
      const now = new Date().toISOString();
      const inserted = state.insertRows.map((r) => ({
        id: r.id ?? uuid(),
        created_at: r.created_at ?? now,
        updated_at: r.updated_at ?? now,
        ...r,
      }));
      rows.push(...inserted);
      return {
        data: state.returning ? inserted : null,
        error: null,
        count: inserted.length,
      };
    }

    // --- UPDATE
    if (state.op === 'update' && state.updatePatch) {
      const matched = applyFilters(rows, state.filters);
      const now = new Date().toISOString();
      for (const row of matched) {
        Object.assign(row, state.updatePatch, { updated_at: now });
      }
      return { data: state.returning ? matched : null, error: null, count: matched.length };
    }

    // --- UPSERT (treat as update + insert)
    if (state.op === 'upsert' && state.insertRows) {
      const now = new Date().toISOString();
      const results: Row[] = [];
      for (const r of state.insertRows) {
        const idx = rows.findIndex((existing) => existing.id === r.id);
        if (idx >= 0) {
          Object.assign(rows[idx], r, { updated_at: now });
          results.push(rows[idx]);
        } else {
          const inserted = { id: r.id ?? uuid(), created_at: now, updated_at: now, ...r };
          rows.push(inserted);
          results.push(inserted);
        }
      }
      return { data: state.returning ? results : null, error: null, count: results.length };
    }

    // --- DELETE
    if (state.op === 'delete') {
      const matched = applyFilters(rows, state.filters);
      tables[state.table] = rows.filter((r) => !matched.includes(r));
      return { data: state.returning ? matched : null, error: null, count: matched.length };
    }

    // --- SELECT
    let result = applyFilters(rows, state.filters);
    if (state.orderBy) {
      const { col, asc } = state.orderBy;
      result = [...result].sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }
    const totalCount = result.length;
    if (state.rangeStart !== undefined && state.rangeEnd !== undefined) {
      result = result.slice(state.rangeStart, state.rangeEnd + 1);
    }
    if (state.limitN !== undefined) {
      result = result.slice(0, state.limitN);
    }
    return { data: result, error: null, count: totalCount };
  }

  function buildQueryBuilder(state: QueryState) {
    const builder = {
      select(cols?: string) {
        state.selectCols = cols;
        state.returning = true;
        return builder;
      },
      eq(col: string, value: unknown) {
        state.filters.push({ kind: 'eq', col, value });
        return builder;
      },
      neq(col: string, value: unknown) {
        state.filters.push({ kind: 'neq', col, value });
        return builder;
      },
      gt(col: string, value: unknown) {
        state.filters.push({ kind: 'gt', col, value });
        return builder;
      },
      gte(col: string, value: unknown) {
        state.filters.push({ kind: 'gte', col, value });
        return builder;
      },
      lt(col: string, value: unknown) {
        state.filters.push({ kind: 'lt', col, value });
        return builder;
      },
      lte(col: string, value: unknown) {
        state.filters.push({ kind: 'lte', col, value });
        return builder;
      },
      in(col: string, values: unknown[]) {
        state.filters.push({ kind: 'in', col, values });
        return builder;
      },
      is(col: string, value: null | boolean) {
        state.filters.push({ kind: 'is', col, value });
        return builder;
      },
      like(col: string, pattern: string) {
        state.filters.push({ kind: 'like', col, pattern });
        return builder;
      },
      ilike(col: string, pattern: string) {
        state.filters.push({ kind: 'ilike', col, pattern });
        return builder;
      },
      or(_expr: string) {
        // `.or('col.eq.x,col.eq.y')` — honored only partially; real support would
        // require parsing the filter DSL. Tests needing OR should call multiple
        // eq filters instead or extend this mock.
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        state.orderBy = { col, asc: opts?.ascending ?? true };
        return builder;
      },
      range(start: number, end: number) {
        state.rangeStart = start;
        state.rangeEnd = end;
        return builder;
      },
      limit(n: number) {
        state.limitN = n;
        return builder;
      },
      single() {
        const { data, error } = executeQuery(state);
        const rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
          return Promise.resolve({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found', details: '', hint: '' },
          });
        }
        if (rows.length > 1) {
          return Promise.resolve({
            data: null,
            error: { code: 'PGRST117', message: 'Multiple rows returned', details: '', hint: '' },
          });
        }
        return Promise.resolve({ data: rows[0], error });
      },
      maybeSingle() {
        const { data, error } = executeQuery(state);
        const rows = Array.isArray(data) ? data : [];
        return Promise.resolve({ data: rows[0] ?? null, error });
      },
      then<TResult>(
        onFulfilled?: (v: { data: unknown; error: unknown; count: number | null }) => TResult | PromiseLike<TResult>,
        onRejected?: (e: unknown) => TResult | PromiseLike<TResult>,
      ): Promise<TResult> {
        return Promise.resolve(executeQuery(state)).then(onFulfilled, onRejected);
      },
      catch<TResult>(onRejected?: (e: unknown) => TResult | PromiseLike<TResult>): Promise<TResult | { data: unknown; error: unknown; count: number | null }> {
        return Promise.resolve(executeQuery(state)).catch(onRejected);
      },
    };
    return builder;
  }

  const mock: MockSupabase = {
    from(table: string) {
      fromSpy(table);
      // Return a root proxy that handles insert/update/upsert/delete at the table level
      return {
        select(cols?: string) {
          return buildQueryBuilder({
            table,
            op: 'select',
            filters: [],
            selectCols: cols,
            returning: true,
          });
        },
        insert(rows: Row | Row[]) {
          return buildQueryBuilder({
            table,
            op: 'insert',
            filters: [],
            insertRows: Array.isArray(rows) ? rows : [rows],
            returning: false,
          });
        },
        update(patch: Row) {
          return buildQueryBuilder({
            table,
            op: 'update',
            filters: [],
            updatePatch: patch,
            returning: false,
          });
        },
        upsert(rows: Row | Row[], _opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
          return buildQueryBuilder({
            table,
            op: 'upsert',
            filters: [],
            insertRows: Array.isArray(rows) ? rows : [rows],
            returning: false,
          });
        },
        delete() {
          return buildQueryBuilder({
            table,
            op: 'delete',
            filters: [],
            returning: false,
          });
        },
      };
    },
    get snapshot() {
      return tables;
    },
    reset() {
      tables = JSON.parse(JSON.stringify(initial));
      for (const k of Object.keys(errors)) delete errors[k];
      if (config.errors) Object.assign(errors, config.errors);
      fromSpy.mockClear();
    },
    setError(table, error) {
      if (error === null) delete errors[table];
      else errors[table] = error;
    },
    seed(table, rows) {
      tables[table] = JSON.parse(JSON.stringify(rows));
    },
    fromSpy,
  };

  return mock;
}

/**
 * Convenience factory: builds a realistic auth + leads + conversations + agendamentos
 * environment for hook tests. Pass overrides to customize.
 */
export function createDefaultMockSupabase(overrides?: Partial<MockSupabaseConfig>) {
  return createMockSupabase({
    tables: {
      leads: [],
      conversations: [],
      agendamentos: [],
      profiles: [
        { id: 'test-user-id', tenant_id: 'tenant-1', role: 'admin', nome_completo: 'Test User' },
      ],
      ...overrides?.tables,
    },
    errors: overrides?.errors,
  });
}

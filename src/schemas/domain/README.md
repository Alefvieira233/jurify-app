# Domain Row Schemas

Runtime validation for Supabase rows at the hook boundary. This namespace
is distinct from `src/schemas/*Schema.ts`, which hosts **form input**
schemas. Domain schemas validate **database rows** — the other direction.

## Why

Supabase's generated types are structurally loose. Before these schemas,
hooks used `as unknown as DomainType` casts to bridge the gap. Those
casts bypass runtime validation, so a dropped column or renamed field
only surfaces when a component tries to read it — often in production,
after the error has already broken a page.

The 2026-04-10 audit counted 46 such casts. These schemas close the gap.

## Pattern

Every domain schema:

1. Lives in this directory as `<entityRow>.schema.ts`.
2. Exports `FooRowSchema` (the Zod schema) and `FooRow` (the inferred type).
3. Uses `.catch(default)` on every field that has a runtime default, so
   a malformed field degrades gracefully instead of failing the row.
4. Uses `.nullable().optional()` on joined / projected columns that may
   be absent from list queries.
5. Cross-checks the inferred type against the pre-existing TypeScript
   domain type with a compile-time assignability assertion.

## Usage at the hook boundary

Always use `.safeParse()` with a **drop-and-log** strategy — one bad
row must never break the list:

```ts
import { createLogger } from '@/lib/logger';
import { LeadRowSchema, type LeadRow } from '@/schemas/domain';

const log = createLogger('LeadsQuery');

function parseRows(raw: unknown[]): LeadRow[] {
  return raw.flatMap((row) => {
    const parsed = LeadRowSchema.safeParse(row);
    if (!parsed.success) {
      log.warn('Dropping malformed lead row', {
        error: parsed.error.issues,
        rowId: (row as { id?: string } | null)?.id,
      });
      return [];
    }
    return [parsed.data];
  });
}
```

Never use `.parse()` — it throws, and one corrupt row would break the
entire query.

## Migrating a new hook

1. Find the `as unknown as FooType` cast in the hook.
2. Add or reuse a schema in this directory.
3. Replace the cast with `FooSchema.safeParse()` in a drop-and-log loop.
4. Run `npm run lint`, `npm run type-check`, and the hook's test suite.
5. Update `docs/audit/2026-04-10/` tracking the remaining casts.

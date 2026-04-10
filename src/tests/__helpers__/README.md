# Test Helpers — Supabase Mock Migration

## Background

The 2026-04-10 audit found that 41 hook test files share a single pattern: a
chainable `Proxy` that returns the same canned data for any method call. Any
sequence like `.from('leads').select().eq('tenant_id', 'x').order('created_at').range(0, 9)`
would return the exact same array regardless of filters. This made every hook
test tautological — a hook that forgot to call `.eq('tenant_id', ...)` would
pass the test but leak data in production.

`supabaseMock.ts` replaces that pattern with a programmable mock that actually
processes filters, mutations, and pagination.

## When to use which

| Situation | Tool |
|---|---|
| New hook/component test | **Use `createMockSupabase`** |
| Integration test for edge-function logic | Import the `_shared/*-logic.ts` module directly |
| Legacy test still using `createChainableQuery` | Working? Leave it. Touched? Migrate it. |

## Migration pattern

**Before** (chainable Proxy — no filter processing):

```ts
function createChainableQuery() {
  const handler = {
    get(_target, prop) {
      if (prop === 'then') return (onFulfilled) => Promise.resolve({ data: SEED, error: null }).then(onFulfilled);
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => createChainableQuery() },
}));
```

**After** (programmable mock — real filter processing):

```ts
import { createMockSupabase } from '@/tests/__helpers__/supabaseMock';

// vi.mock is hoisted, so the mock must be created inside the factory and
// stashed on globalThis so the test body can access it.
vi.mock('@/integrations/supabase/client', async () => {
  const { createMockSupabase } = await import('../../tests/__helpers__/supabaseMock');
  const mock = createMockSupabase({ tables: { leads: [] } });
  (globalThis as Record<string, unknown>).__jurifyMockSupabase__ = mock;
  return { supabase: mock, supabaseUntyped: mock };
});

function getMock(): ReturnType<typeof createMockSupabase> {
  return (globalThis as Record<string, unknown>).__jurifyMockSupabase__ as ReturnType<typeof createMockSupabase>;
}

// In beforeEach, seed the data fresh for each test:
beforeEach(() => {
  getMock().reset();
  getMock().seed('leads', seedRows);
});
```

## New assertions you can write

Because the mock processes operations for real, you can assert things that
were impossible with the Proxy:

```ts
// Tenant isolation — put cross-tenant rows in the seed and assert they're hidden.
getMock().seed('leads', [{ id: '1', tenant_id: 'mine' }, { id: '2', tenant_id: 'other' }]);
expect(result.current.leads).toHaveLength(1);

// Actual mutation — verify writes land in the DB.
const before = getMock().snapshot.leads.length;
await result.current.createLead({ nome_completo: 'Novo' });
expect(getMock().snapshot.leads.length).toBe(before + 1);

// Error injection — simulate RLS denial.
getMock().setError('leads', { code: '42501', message: 'RLS denied' });
const ok = await result.current.createLead({ nome_completo: 'X' });
expect(ok).toBe(false);
```

## Known limitations

- `.or('col.eq.x,col.eq.y')` is accepted but not parsed — chain multiple `.eq()`
  calls instead, or extend the mock if you need OR filtering.
- `.rpc('fn_name', args)` is not implemented. Mock the RPC function at the
  `supabase` object level with `vi.spyOn` if needed.
- Realtime subscriptions (`.channel(...).on(...).subscribe()`) are not
  implemented. Hook tests that rely on realtime should mock the subscription
  lifecycle separately.
- No transaction support — each operation is atomic and stand-alone.

## Migrated files (audit 2026-04-10)

- ✅ `src/hooks/__tests__/useLeads.test.ts`

Files still using the deprecated `createChainableQuery` pattern are safe to
keep until the tests get edited for unrelated reasons. New tests must use
`createMockSupabase`.

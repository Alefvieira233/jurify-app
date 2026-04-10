# Edge Function Testing Framework

## Goal

Enable real, non-fraudulent tests for edge function logic without requiring a
running Supabase instance. Before the 2026-04-10 audit, edge function tests
redeclared helpers inline and tested the copies — this directory replaces that
pattern.

## How it works

Edge functions run in Deno and import from URLs (`jsr:`, `https://esm.sh/...`).
Node/Vitest can't execute those imports directly. The solution is to extract
**pure business logic** (no Deno.env, no Supabase client, no network) into
`supabase/functions/_shared/*-logic.ts` modules, then import those modules
from Vitest.

Tests in this directory consume:

- `../../supabase/functions/_shared/stripe-logic.ts` — covered by `../stripe-webhook.test.ts`
- `../../supabase/functions/_shared/whatsapp-logic.ts` — covered by `../whatsapp-webhook.test.ts`
- `../../supabase/functions/_shared/crypto.ts` — covered by `shared-crypto.test.ts`
- `../../supabase/functions/_shared/security.ts` — covered by `shared-security.test.ts`

The handlers themselves (the `Deno.serve(...)` wrappers) are not tested by
this framework. They are thin shells that delegate to the logic modules.
Live HTTP integration tests against a `supabase start` instance belong in a
separate e2e suite.

## Writing a new edge function test

1. **Extract the logic.** Move pure functions out of your edge function into
   `supabase/functions/_shared/<feature>-logic.ts`. The file must have zero
   Deno-specific imports: no `jsr:`, no `Deno.env.get`, no `https://esm.sh/...`.
   If you need env values, receive them as function parameters.

2. **Update the edge function** to import from the new shared module. The
   handler becomes a thin wrapper: read env vars, call logic, return response.

3. **Write the test** in this directory. Use relative imports to reach the
   shared module:

   ```ts
   import { myFunction } from '../../../../supabase/functions/_shared/feature-logic';
   ```

4. **For crypto / Deno globals,** stub them before the dynamic import:

   ```ts
   beforeEach(() => {
     (globalThis as Record<string, unknown>).Deno = {
       env: { get: (n: string) => (n === 'KEY' ? 'test-value' : undefined) },
     };
   });
   const { encrypt } = await import('../../../../supabase/functions/_shared/crypto');
   ```

## Anti-patterns (what the old tests did wrong)

- ❌ Copy-pasting the function body into the test file and testing the copy.
  If the edge function changes, the copy doesn't — false green.
- ❌ Mocking the Supabase client with a Proxy that returns the same canned
  data for any method call — filter chains are never exercised.
- ❌ Testing type shapes only (`expect(typeof fn).toBe('function')`). Tells
  you nothing about behavior.

## Anti-patterns (what we avoid here)

- Do NOT import the edge function handler (`index.ts`) directly — the `jsr:`
  and `https://esm.sh/...` imports break Vitest's module resolution.
- Do NOT hit a real Supabase from these tests — they must run offline in CI.
- Do NOT add realtime subscription tests here — those are flaky by nature
  and belong in e2e.

## Coverage status (2026-04-10)

| Module | Tests | Status |
|---|---|---|
| `_shared/stripe-logic.ts` | 42 | ✅ Rewritten from fraud |
| `_shared/whatsapp-logic.ts` | 47 | ✅ Rewritten from fraud |
| `_shared/crypto.ts` | 14 | ✅ New coverage |
| `_shared/security.ts` | 37 | ✅ New coverage + 2 documented gaps |
| `_shared/ai-budget.ts` | — | Pending |
| `_shared/rate-limiter.ts` | — | Pending (needs mock clock) |
| `_shared/kapso-client.ts` | — | Pending |

Documented security gaps (filed as tech debt in `docs/audit/2026-04-10/`):

- `HOMOGLYPHS` map doesn't include `1→i` — "1gn0re" bypasses the scanner
- `INJECTION_PATTERNS` regex requires adjacency — "ignore all previous prompts"
  (with "previous" between "all" and "prompts") bypasses
- Base64 scanner requires 40+ alphabet chars — short injections slip through

Pending edge function handlers that need thin-wrapper refactors before they
can be tested here: `agent-orchestrator`, `ai-agent-processor`, `kapso-manager`,
`process-prazos-alerts`, `create-checkout-session`.

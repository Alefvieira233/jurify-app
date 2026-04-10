# QA Audit — Test Quality

**Auditor:** Quinn (@qa)
**Date:** 2026-04-10
**Scope:** Jurify test suite (Vitest + Playwright)
**Mode:** READ-ONLY

---

## Executive Summary

| Metric | Value |
|---|---|
| **Raw test count (claim)** | 1447 |
| **Test files (vitest)** | 116 (`src/**/*.test.{ts,tsx}`) + 1 excluded legacy |
| **E2E spec files** | 21 (`e2e/*.spec.ts`) |
| **Source files (non-test)** | 517 |
| **Source lines (non-test)** | 86,272 |
| **Vitest test lines** | 20,930 |
| **E2E test lines** | 1,983 |
| **Total `it(...)` calls** | ~1325 (grep count, line-start anchored) |
| **Total `expect(...)` calls** | ~2465 |
| **Assertions-per-test ratio** | ~1.86 (low) |
| **Files mocking Supabase client** | 59 / 118 (50%) |
| **Files with any `vi.mock`** | 92 / 118 (78%) |
| **Edge Function unit tests** | **0** (no test file under `supabase/functions/`) |
| **Skipped tests** | 1 `describe.skip` + 1 `it.todo` |
| **Coverage threshold** | lines: 60, functions: 50, branches: 45, statements: 60 |
| **Exclusions from coverage** | 30+ hook files, all `src/pages/**`, all `src/components/forms/**`, multi-agent core |

**Verdict:** The 1447-test number is **theater**. Large swaths are mock-dominated, assertion-poor, and in several critical cases test **re-implementations of the code under test** rather than the code itself. Effective coverage is far below the 60% threshold the config reports, because the threshold is computed only over files *after* the extensive coverage exclusion list is applied.

---

## Real Coverage Estimate

| Layer | Claimed | Effective (my estimate) | Why the gap |
|---|---|---|---|
| Pure utils (validation, formatting, encryption, AppError, errorMessages) | ~80% | **~75%** | Honest tests exist |
| UI components (shadcn primitives) | n/a | n/a | Not tested; acceptable |
| Hooks (`src/hooks/**`) | ~60% reported | **~15–25% effective** | Proxy-based chainable Supabase mock returns canned data for every method call, so `createLead/updateLead/deleteLead` always "succeed". Mutations, RLS denials, network errors, pagination edge cases, retry logic, optimistic rollback — untested. Heaviest hooks (useAgenda*, useDashboardMetrics, useWhatsAppConversations, useGoogleCalendar, etc.) are **excluded from coverage**. |
| Feature components (managers, dashboards) | reports high | **~20%** | Every child hook is mocked; tests render and assert `getByText(...)` on static labels. Does not exercise real data flow, form submission, or error states. |
| Edge Functions (`supabase/functions/**`) | n/a | **~0%** | Zero unit tests. "Contract tests" in `edge-functions.test.ts` validate Zod schemas defined inline in the test file, not the actual function code. |
| RBAC SQL policy parity | reports 100% | **0%** | `rbac-database.test.ts` defines a TypeScript replica of `has_permission()` inside the test file and tests the replica against the frontend matrix. The database is never touched. Any divergence between actual SQL and replica is invisible. |
| Stripe webhook | reports covered | **~0%** | `stripe-webhook.test.ts` re-implements `mapPriceToPlanId` and `mapStripeStatus` inside the test file and tests those copies. Signature verification, event routing in the real function, idempotency, and downstream DB writes are never exercised. |
| WhatsApp webhook | reports covered | **~10%** | `whatsapp-webhook.test.ts` re-implements the payload normalizers inline. The real webhook in `supabase/functions/whatsapp-webhook/index.ts` — including tenant resolution, lead auto-creation, IA orchestration, handoff regex, dedup store — is never invoked. |
| Auth flows (AuthContext, login, session, lockout) | reports covered | **~30%** | AuthContext test is 979 lines but mocks Supabase; auto-logout block is `describe.skip`. E2E `auth.spec.ts` depends on `E2E_TEST_EMAIL/PASSWORD` secrets that memory says are unconfigured locally. |
| Lead auto-assignment (department routing) | reports covered | **~10%** | No test simulates the DB trigger behavior; hook-level test assumes the API returns success. |
| E2E (Playwright) | ~21 specs in CI | **~15% effective** | Pervasive `if (visible) then expect` pattern = silent pass on missing elements. 40 occurrences of `waitForTimeout` / hardcoded delays. One uses `setTimeout(5000)` wrapped in `new Promise`. |

**Blended real coverage estimate: ~22–28%** (versus the implied ~60% from the threshold — inflated by exclusions and by tests that don't exercise real logic).

---

## Test Quality Score: **38 / 100**

**Breakdown:**
- Pure util tests (+10): honest
- Hook tests structure (+5): renderHook + React Query wrapper is correct scaffolding
- RBAC permission matrix (+5): frontend matrix IS tested against itself, useful for catching frontend drift
- E2E exists in CI (+5): non-zero E2E
- SanitizerEngine, TrustEngine deep tests (+3): real logic, real assertions
- Edge Function tests (−8): **zero** real tests; schemas are in-test duplicates
- Webhook tests (−10): critical paths (Stripe, WhatsApp) re-implement the code under test
- RLS policy test (−8): tests a TS replica, not the database
- Feature tests (−6): mock-dominated, assert on static strings, happy-path only
- Resilience suite (−5): 3 files, 13 tests total, tests constants not resilience; name is misleading
- E2E conditional assertions (−3): silent pass on missing UI

---

## P0 — Critical (fix immediately)

### P0-1 — Stripe webhook tests are fraudulent
**File:** `src/tests/integration/stripe-webhook.test.ts:16-43`
The file defines `mapPriceToPlanId` and `mapStripeStatus` **locally in the test file** and then tests those local copies. The real `supabase/functions/stripe-webhook/index.ts` is never imported. If the production function changes (or has a bug), this test file cannot detect it. 37 assertions of pure theater on a revenue-critical path.

### P0-2 — WhatsApp webhook tests are fraudulent
**File:** `src/tests/integration/whatsapp-webhook.test.ts:154-302`
Same pattern. `isKapsoPayload`, `normalizeKapsoMessage`, `normalizeMetaMessages`, `createDeduplicator`, `getMessageId` are all **re-declared inside the test file**. The actual edge function with its IA pipeline, tenant resolution, lead routing, and handoff regex is never executed. The memory file boasts "WhatsApp/Kapso FUNCIONAL — 8 root causes corrigidos" but the test suite has zero ability to detect regressions in those fixes.

### P0-3 — RBAC database test does not touch the database
**File:** `src/tests/integration/rbac-database.test.ts:13-107`
Claims "Validates that has_permission() SQL function mirrors ROLE_PERMISSIONS". Actually defines a **TypeScript copy of the SQL matrix inline** (lines 16-103) and tests the frontend constant against the inline copy. 82 assertions. **Any divergence between the real Postgres `has_permission()` function and this hardcoded copy will not be caught.** The RLS department isolation (20260409000001) and status sync triggers (20260409000002) have **zero real tests**.

### P0-4 — No edge function tests exist at all
**Path:** `supabase/functions/**/*.ts`
50+ edge functions including `stripe-webhook`, `whatsapp-webhook`, `ai-agent-processor`, `agent-orchestrator`, `zapsign-integration`, `kapso-manager`, `admin-create-user`, `decrypt-data`. Zero `*.test.ts` files in that tree. `edge-functions.test.ts` tests Zod schemas declared inline, not the functions.

### P0-5 — Supabase chainable Proxy mock makes every hook test pass trivially
**File:** `src/hooks/__tests__/useLeads.test.ts:49-76`, and ~40 other hook test files copy this pattern (also in `__helpers__/hookTestSetup.ts:11-21`). The Proxy handler returns itself for any method call and resolves `{ data, error: null, count }` on `.then`. Consequences:
- `createLead` returns `true` because error is always null
- `.eq('tenant_id', ...).not('x', ...).range(...).select(...).single()` all produce the same data
- Tenant isolation bugs invisible
- RLS errors invisible
- Chained filter logic invisible
- Pagination off-by-one invisible

`useLeads.test.ts:215-255` "should call createLead/updateLead/deleteLead and return true on success" are tautological — they assert the mock returns the mock value.

---

## P1 — High

### P1-1 — "Resilience" test directory is misnamed
**Files:** `src/tests/resilience/concurrent-operations.test.ts` (22 lines, 2 tests, 2 assertions, 1 `it.todo`), `security-boundaries.test.ts` (38 lines, 3 tests), `error-recovery.test.ts` (61 lines, 8 tests).
Total: **13 tests for all resilience**. `concurrent-operations.test.ts` just instantiates a `new QueryClient` and asserts the config object. This is not concurrency testing. `security-boundaries.test.ts` reads `isFeatureEnabled` and timing constants — not security boundary testing.

### P1-2 — Happy-path-only feature tests
**Files:** `src/features/leads/__tests__/LeadsPanel.test.tsx` (7 tests), `src/features/processos/__tests__/ProcessosManager.test.tsx` (19 `vi.mock` calls, 6 tests), `src/features/crm/__tests__/CRMDashboard.test.tsx`, all `src/features/*/__tests__/*.test.tsx`.
Every downstream hook and child component is mocked. Tests assert `screen.getByText('Base de contatos vazia')` and similar static labels. Error state, loading-to-error transition, RLS denial, empty-but-authorized vs empty-due-to-filter, race conditions between refetch + mutation — none tested.

### P1-3 — `security.test.ts` is excluded from vitest but has 21 tests
**File:** `src/__tests__/security.test.ts` is explicitly excluded in `vitest.config.ts:101`. 21 tests, 61 assertions — completely dead code. Comment says "Legacy Jest file — needs migration" but the repo memory claims 1447 passing. These tests are not in that count but also not protecting anything.

### P1-4 — E2E silent-pass pattern
**Files:** `e2e/stripe-payment.spec.ts:30`, `e2e/billing.spec.ts`, `e2e/contratos.spec.ts`, `e2e/lead-to-contract.spec.ts`, `e2e/leads.spec.ts`, and most others.
The dominant pattern:
```ts
if (await button.isVisible({ timeout: 5_000 }).catch(() => false)) {
  await button.click();
  await expect(result).toBeVisible();
}
```
If the button is absent (because the UI broke), the `if` is false and the test **passes with zero real assertions**. This makes E2E a liar in the worst way.

### P1-5 — `npm run test:security` is a surface-level script
**File:** `scripts/security-audit.cjs` (112 lines). Only checks:
- `.env` doesn't contain the literal strings `SERVICE_ROLE`, `sk-`, `sk_live`, `PRIVATE_KEY` in VITE_ vars
- `.gitignore` mentions `.env`
- `vite.config.ts` string contains `drop: isProd ? ['console'`
- `vercel.json` has header keys present
- regex scan for 3 hardcoded key patterns in `src/`

No dependency CVE review beyond `npm audit --audit-level=high`. No RLS policy verification. No Edge Function secret check. No Supabase JWT expiry check. No session timeout validation. No permission bypass scan.

### P1-6 — Playwright uses `waitForTimeout` in 20+ places
**Files:** `e2e/auth.spec.ts:79`, `e2e/contratos.spec.ts:24,33`, `e2e/critical-flows.spec.ts:85,156,174`, `e2e/crud-operations.spec.ts:72`, `e2e/document-generation.spec.ts:14` (a raw `new Promise((r) => setTimeout(r, 5000))`), `e2e/file-upload.spec.ts:48,77,89`, `e2e/health-smoke.spec.ts:53`, `e2e/lead-to-contract.spec.ts:27,50,72`, `e2e/leads.spec.ts:19,33`, `e2e/password-reset.spec.ts:35`, plus more. Hardcoded delays are the #1 source of flakes and slow runs.

### P1-7 — Hook tests with suspiciously few assertions per test
Examples where assertion count is <= `it` count (meaning many tests have 1 or 0 real assertions):
- `src/hooks/__tests__/useAgendaAutomation.test.ts` — 3 its, 3 expects
- `src/hooks/__tests__/useAgentesMetrics.test.ts` — 2 its, 3 expects
- `src/hooks/__tests__/useNotificationTemplates.test.ts` — 3 its, 5 expects
- `src/hooks/__tests__/useZapSignIntegration.test.ts` — 3 its, 3 expects
- `src/hooks/__tests__/useGoogleCalendarConnection.test.ts` — 2 its, 4 expects
- `src/hooks/__tests__/useRealtimeSync.test.ts` — 1 it, 1 expect
- `src/hooks/__tests__/useAIAssistant.test.ts` — 3 its, 4 expects

These look like "import the hook, render it, assert it didn't throw" smoke tests.

### P1-8 — 30+ heavy hooks excluded from coverage
**File:** `vitest.config.ts:49-85`
All the hooks carrying the most business logic (`useAgendaAutomation`, `useAgendaIntelligence`, `useWhatsAppConversations`, `useGoogleCalendar`, `useDashboardMetrics`, `useMultiAgentSystem`, `useFollowUps`, `useAgentPipeline`, `useApiKeys`, `useConexoes`, `useDashboardMetricsFast`, `useDraftPersistence`, etc.) are **excluded** with the comment "tested via E2E" — but E2E has the silent-pass pattern (P1-4) and memory says "Playwright browsers nao instalados localmente." They are effectively untested and invisible in coverage reports.

### P1-9 — Coverage thresholds don't protect critical paths
**File:** `vitest.config.ts:88-93`
Threshold: 60% lines / 50% functions / 45% branches. With 30+ critical files excluded, the remaining covered files are mostly utilities and trivial hooks, so hitting 60% is trivial while leaving the real business logic untested.

---

## P2 — Medium

### P2-1 — `GoldenPath.test.tsx` is a schema smoke test, not a golden path
**File:** `src/tests/GoldenPath.test.tsx` (98 lines, 18 `expect`). Tests Zod schema rejection of empty names and label constants. Calling this "Enterprise Golden Path" is misleading — a real golden path test would walk lead → qualification → contract → signature → payment.

### P2-2 — `describe.skip` on auto-logout test
**File:** `src/contexts/__tests__/AuthContext.test.tsx:844`. Comment deflects to `useInactivityLogout.test.ts` but that file has a 30-min timer. The actual AuthContext integration of auto-logout (what happens to session state, channel cleanup, local storage) is skipped.

### P2-3 — Dual Playwright configs
**Files:** `playwright.config.ts` (root, baseURL 8080, 45s timeout) vs `tests/playwright.config.ts` (separate config). Two config files is a foot-gun for which one CI uses.

### P2-4 — No snapshot tests used
Not a problem per se (snapshot abuse is worse), but also no visual regression coverage of any kind.

### P2-5 — `test:security` is not wired into CI
`ci.yml` runs `trufflehog` and `npm audit --audit-level=critical`, but does **not** run `scripts/security-audit.cjs` (which would at least catch missing vercel.json headers). The script is orphaned to a developer command.

### P2-6 — No cleanup of fake timers in several tests
`src/hooks/__tests__/useInactivityLogout.test.ts` uses `vi.useFakeTimers` — spot-check didn't find missing `useRealTimers` in afterEach, but the pattern is risky.

### P2-7 — `src/tests/integration/ia-juridica.test.ts` has 12 tests for the IA Jurídica path
110 lines total. For a feature the memory calls "IA com memória longa + 12 padrões regex de handoff" this is thin.

### P2-8 — E2E CI runs only on `pull_request`, `master`, `main`
**File:** `.github/workflows/ci.yml:208`. The dedicated `e2e.yml` runs on push to `main`/`develop` and PR to `main`. Pushes directly to `main` trigger both files → duplicate runs. Develop pushes only trigger `e2e.yml`. Non-main/non-develop feature-branch pushes get no E2E until PR time.

### P2-9 — AuthContext test is 979 lines, 18 tests, 55 expects
**File:** `src/contexts/__tests__/AuthContext.test.tsx`. Assertions-per-test = 3.1. For an auth layer with session restore, token refresh, multi-tab sync, realtime channel lifecycle, auto-logout, profile fetching, RBAC hydration — this is thin per scenario.

---

## Critical Path Coverage Matrix

| Path | Unit | Integration | E2E | Effective |
|---|---|---|---|---|
| Login / signup | Partial (AuthContext mocked) | None | `e2e/auth.spec.ts` (depends on unconfigured secrets) | **LOW** |
| Password reset | None | None | `e2e/password-reset.spec.ts` (conditional assertions) | **LOW** |
| Stripe checkout | None | FRAUDULENT (tests inline copies) | `e2e/stripe-payment.spec.ts` (silent-pass) | **CRITICAL GAP** |
| Stripe webhook | None | FRAUDULENT | None (rejects unsigned in e2e) | **CRITICAL GAP** |
| WhatsApp webhook → IA → resposta | Partial (agents mocked) | FRAUDULENT | `e2e/whatsapp.spec.ts` | **CRITICAL GAP** |
| Lead auto-assignment (dept routing) | None | None | None | **CRITICAL GAP** |
| Lead ↔ conversation status sync (DB triggers) | None | None | None | **CRITICAL GAP** |
| RLS department isolation | None | FRAUDULENT (TS copy of SQL) | None | **CRITICAL GAP** |
| RBAC permission matrix | YES (frontend) | FRAUDULENT (database) | `e2e/rbac.spec.ts` | **MEDIUM** |
| ZapSign signature callback | None | `zapsign-integration.test.ts` (49 expects, mocked HTTP) | None | **LOW** |
| Google Calendar OAuth | None | None (hook excluded from coverage) | None | **NONE** |
| Multi-tenant isolation | None | None | `e2e/multi-tenant-isolation.spec.ts` | **LOW** |
| File upload | None | None | `e2e/file-upload.spec.ts` (conditional) | **LOW** |
| AI agent orchestration | `agent-orchestration.test.ts` (48 its, 130 expects) | None | None | **MEDIUM** (in-process only) |

---

## Patterns to Keep

Not everything is bad. The following are legitimately useful:
- `src/utils/__tests__/validation.test.ts`, `validation.extended.test.ts`, `formatting.test.ts`, `AppError.test.ts` — honest unit tests of pure logic
- `src/lib/legal/__tests__/TrustEngine.deep.test.ts` — 22 assertions against real TrustEngine logic
- `src/lib/security/__tests__/SanitizerEngine.test.ts` — 64 assertions, real sanitizer
- `src/lib/multiagents/core/__tests__/AgentMemory.test.ts`, `SharedContext.test.ts`, `WorkflowQueue.test.ts`, `ExecutionStore.test.ts` — unit tests of real data structures
- `src/tests/integration/agent-orchestration.test.ts` — 48 its / 130 expects exercising the in-process multi-agent pipeline (still mocked at the LLM boundary, but the pipeline itself is real)
- `e2e/rbac.spec.ts`, `e2e/multi-tenant-isolation.spec.ts` — real browser runs (assuming CI secrets configured)

---

## Recommendations (not for this audit to implement)

1. **Delete or rewrite** the three fraudulent "integration" tests (`stripe-webhook`, `whatsapp-webhook`, `rbac-database`). Either import the real Deno function (via `supabase functions serve` + HTTP) or delete them — they currently provide false confidence.
2. **Add Deno test harness** for `supabase/functions/**`. Use `deno test` in a CI job. Start with stripe-webhook signature validation and idempotency.
3. **Replace the chainable Proxy Supabase mock** with MSW (Mock Service Worker) intercepting the REST endpoint, or with a local Supabase Docker instance seeded with fixtures. This forces tests to exercise real filter chains and RLS behavior.
4. **Remove the `if (visible) then expect` pattern from E2E**. If an element isn't visible, the test should fail, not silently pass.
5. **Kill `waitForTimeout`**. Replace with `waitFor` on a condition or `toBeVisible({ timeout })`.
6. **Stop excluding 30+ hooks from coverage.** Either test them or remove the "covered by E2E" fiction.
7. **Wire `scripts/security-audit.cjs` into CI** or delete it.
8. **Rebuild the "resilience" suite** to actually test concurrency, timeout handling, retry storms, and optimistic rollback.
9. **Un-skip** the AuthContext auto-logout test or move the coverage to a named integration test.
10. **Add a database-level RBAC test** that runs against a real Postgres instance (supabase-js with a service role key in a test tenant) to verify `has_permission()` behavior per role.

---

## Summary Numbers

- **Raw test count:** 1447 (unverified — ~1325 `it()` calls were found via grep; the remainder are from `it.each` expansions and nested describes)
- **Effective coverage estimate:** **22–28%** of business logic
- **Test Quality Score:** **38 / 100**
- **P0 count:** 5
- **P1 count:** 9
- **P2 count:** 9
- **Fraudulent integration tests:** 3 (Stripe, WhatsApp, RBAC-database)
- **Edge function tests:** 0
- **Critical-path gaps:** 7 of 14

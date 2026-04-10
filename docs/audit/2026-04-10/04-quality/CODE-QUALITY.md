# Jurify — Code Quality Audit

**Date:** 2026-04-10
**Auditor:** Dex (@dev, AIOX)
**Scope:** Senior code-review pass on `src/` and `supabase/functions/` (READ-ONLY).
**Methodology:** Grep heuristics + structural checks + `npm run lint` + `npm run type-check`.

---

## Code Quality Score: **79 / 100**

| Dimension | Score | Weight |
|---|---|---|
| TypeScript discipline | 72 / 100 | 25% |
| Error handling | 88 / 100 | 15% |
| Complexity & file size | 78 / 100 | 15% |
| Duplication & DRY | 80 / 100 | 10% |
| Naming & consistency | 78 / 100 | 10% |
| Dead code / noise | 95 / 100 | 5% |
| Forms / schemas | 92 / 100 | 5% |
| Edge functions | 75 / 100 | 10% |
| Lint/TS cleanliness | 60 / 100 | 5% |

**Senior reviewer's gut feeling.** This codebase is genuinely above the SaaS average. The core patterns — `useEntityCRUD` factory, Zod-everywhere forms, `queryKeys` factory, ErrorBoundary + monitoring, feature-based structure, `lazyWithRetry`, RLS defense-in-depth — are all real, not decorative. The decomposition push shaved a lot of 400+ line files; none of the remaining offenders are "god components," they are data-heavy hooks and one monolithic edge function. What keeps this from being a 90+ is a TypeScript-hygiene problem: **46 `as unknown as` casts** concentrated in hooks, `dynamicSupabase = supabase as any` used as an escape valve, one unused `@ts-nocheck`-style pattern, and 2 fresh TS errors + 1 lint error + 1 warning that invalidate the memory's "0 errors / 0 warnings" claim. The multiagents subsystem (`src/lib/multiagents/`) is also the one place where complexity and `as unknown as Json` casts concentrate — it feels like legacy code that escaped the decomposition sweep. Edge functions are the other soft spot: `whatsapp-webhook/index.ts` is 2,101 lines and dwarfs everything else. Fix the handful of P0 type/lint issues and extract the multiagents cast layer into proper type guards, and the score jumps to ~88.

---

## Memory Claim Verification

| Claim | Reality | Verdict |
|---|---|---|
| "0 lint warnings" | 1 error + 1 warning (`--max-warnings 0` fails) | **FALSE** |
| "0 TS errors" | 2 errors in `chatQuickActions.tsx` (unused `React` import, reported twice) | **FALSE** |
| "0 components 400+ lines" | 14 src files > 400 lines (excluding tests/generated types/ui primitives) | **FALSE (but close in spirit)** |
| "Zero deprecated queryKey wrappers — factory 100%" | `src/lib/queryKeys.ts` exists and is imported widely — spot-check OK | TRUE |
| "Zero crypto-js" | Not found via grep of src | TRUE |
| "lazyWithRetry everywhere" | 43 occurrences across `App.tsx`, `Layout.tsx` — all route-level lazy uses it | TRUE |
| "Zero TODO/FIXME/HACK" | Verified: 0 real TODO markers (2 matches are BANT methodology doc-strings) | TRUE |

---

## 1. TypeScript Discipline — 72 / 100

### `any` usage (38 occurrences across 14 files)
**Production code (worst offenders):**
- `src/hooks/useEntityCRUD.ts:47` — `const dynamicSupabase = supabase as any;` (documented escape valve, but leaks `any` through `queryModifier?: (query: any) => any` at line 100)
- `src/hooks/useFollowUpSequences.ts:10` — identical `as any` escape valve
- `src/hooks/useProcessos.ts:72` — `(query: any) =>`
- `src/features/automations/FluxosManager.tsx:180` — `const nodeData = n.data as any;`
- `src/features/dashboard/components/analytics/AnalyticsDashboard.tsx:108` — `(query: any) =>`

**Tests:** The bulk of `any` (~30) is in test files mocking Supabase — lower priority but still a code smell. `AuthContext.test.tsx` alone has 14 `as any` casts.

### `as unknown as` double casts (46 occurrences across 23 files)
This is the real TS-discipline problem. It means "I'm bypassing the type system because the Supabase generated types don't match my domain types." Heavy concentration in:
- `src/hooks/useGoogleCalendar.ts` — 4 instances
- `src/hooks/useFollowUps.ts` — 4 instances
- `src/hooks/useConexoes.ts` — 3 instances
- `src/lib/multiagents/core/*` — 4 instances (`as unknown as Json`)
- `src/lib/monitoring.ts` — 3 instances
- `src/App.tsx:9-11` — Capacitor detection triple-cast (ugly but isolated)

**Root cause:** The generated `src/integrations/supabase/types.ts` (5,524 lines) is strict, and domain types in hooks are looser. Should be solved with runtime Zod parsers at the boundary, not double casts.

### `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`
**Zero.** Verified. Good.

### Non-null assertions (`!`)
95 occurrences across 66 files. Some legit (Postmark env vars), many in hooks/tests. Not a red flag on its own but each one is a latent NPE.

### Lint output (fresh run)
```
src/features/scheduling/components/NovoAgendamentoForm.tsx:113:23
  error: This assertion is unnecessary (no-unnecessary-type-assertion)

src/features/widget/WhatsAppWidget.tsx:115:17
  warning: Fast refresh only works when a file only exports components (react-refresh/only-export-components)

✖ 2 problems (1 error, 1 warning)
```
Script exits **non-zero** (`--max-warnings 0`).

### TypeScript compile output
```
src/features/ai-agents/components/chat/chatQuickActions.tsx(1,1):
  error TS6133: 'React' is declared but its value is never read.
  (reported twice — likely dual project include)
```

---

## 2. Error Handling — 88 / 100

- **Zero silent catches** (`catch (e) {}`) — verified via multiline grep. Excellent.
- **Zero `console.log` as sole error handling** — codebase uses `createLogger()` wrapper (`src/lib/logger.ts`) and `errorService` consistently.
- **Only 9 raw `console.*` calls** in `src/` — all in `sentry.ts`, `logger.ts`, `ErrorBoundary.test.tsx`, and `useGoogleCalendar.ts`. Clean.
- **Edge functions:** 116 `console.error` calls across 30 files — this is fine (edge functions log to stdout/Deno), but `_shared/logger.ts` exists and should be preferred.
- **Small concern:** `useGoogleCalendar.ts:2 console` calls bypass the logger wrapper.

---

## 3. Magic Numbers / Strings — mixed

- **Role strings (`'admin'`, `'viewer'`, `'manager'`, `'owner'`)** appear 192 times across 52 files. `src/types/rbac.ts` defines the union but call-sites still use raw literals instead of `ROLES.ADMIN` constants. P2 — one grep-away from a bug if a role is renamed.
- **`setTimeout(..., <number>)`** — 19 occurrences. Reasonable for UI (toast dismiss, debounce). No timeout constants extracted.
- **Hardcoded URLs (`https://...`)** — 54 files. Mostly SEO config, legal pages, and integration docs URLs (ZapSign, Google, etc.). A few suspicious ones in `features/settings/integrations/*` that should move to an `integrationsConfig.ts`.

---

## 4. Duplication — 80 / 100

- `useEntityCRUD` factory is used where practical; legacy hooks (`useContratos`, `useProcessos`, `useGoogleCalendar`) diverge for entity-specific reasons and they document it — acceptable.
- `as unknown as Json` casts repeat the same shape 6+ times across multiagents — should be `toJson()` helper.
- `applyLeadVisibilityFilter` logic in `AnalyticsDashboard.tsx:108` and `useProcessos.ts:72` are suspiciously similar — candidate for a shared `withTenantScope(query)` util.
- No major React-component duplication found in spot-check.

---

## 5. Complexity / File Size — 78 / 100

### Files > 400 lines (production, non-generated, non-test)

| Lines | File | Notes |
|---|---|---|
| 660 | `src/lib/multiagents/core/BaseAgent.ts` | Core class, justifiable |
| 553 | `src/hooks/useWhatsAppConversations.ts` | Heavy hook — candidate for split |
| 468 | `src/hooks/useEntityCRUD.ts` | Factory — justifiable |
| 454 | `src/features/processos/ProcessosManager.tsx` | Candidate for decomposition |
| 441 | `src/hooks/useGoogleCalendar.ts` | Candidate for split |
| 435 | `src/hooks/useAgendaAutomation.ts` | Candidate for split |
| 427 | `src/features/crm/FollowUpSequenceEditor.tsx` | Candidate for decomposition |
| 426 | `src/features/mission-control/MissionControl.tsx` | Candidate for decomposition |
| 426 | `src/features/mission-control/hooks/useRealtimeAgents.ts` | Candidate for split |
| 416 | `src/features/automations/RuleEditor.tsx` | Candidate |
| 416 | `src/features/ai-agents/components/ApiKeysManager.tsx` | Candidate |
| 409 | `src/features/users/UsuariosManager.tsx` | Candidate |
| 408 | `src/hooks/useAgentTraining.ts` | Candidate for split |
| 404 | `src/features/contracts/components/NovoContratoForm.tsx` | Candidate |

**14 files violate the memory's "zero 400+" claim.** Also `src/components/Sidebar.tsx` at 417 lines (component infrastructure — lower priority).

### Edge functions
- `supabase/functions/whatsapp-webhook/index.ts` — **2,101 lines**. This is a P1 in its own right. Extract business logic into `_shared/whatsapp/*` modules.
- `supabase/functions/kapso-manager/index.ts` — 904 lines.
- `supabase/functions/assistant/index.ts` — 591 lines.

---

## 6. Naming / Consistency — 78 / 100

- **Portuguese-English mix:** Feature directories are Portuguese (`processos`, `prazos`, `honorarios`, `contratos`, `agendamentos`), hooks follow domain language. This is consistent and acceptable for a BR-market product. Types and generic utilities are English. No misleading names found in spot-check.
- **Variable naming:** Consistent camelCase in code, kebab-case in files where expected.
- **One inconsistency:** some hooks use `useFooQuery` / `useFooMutation` suffix, others don't.

---

## 7. Dead Code — 95 / 100

- **Zero TODO/FIXME/HACK markers.** Verified.
- **Unused variables:** The TS error in `chatQuickActions.tsx` (`React` imported but unused) is the only confirmed live instance — TS6133 is on. Good.
- **Commented-out blocks:** Not found in spot-check.

---

## 8. Prop Drilling — not a problem

Spot-checked `MissionControl.tsx`, `ProcessosManager.tsx`, `FollowUpSequenceEditor.tsx`. They delegate to sub-components cleanly. Context usage (`AuthContext`) is reserved for auth, not misused for state.

---

## 9. useEffect Abuse — 78 / 100

- Only **3 files** have `useEffect` calling `supabase.*` directly: `useRealtimeSync.ts`, `useRealtimeNotifications.ts`, `AuthContext.tsx`. All three are legitimate (realtime subscriptions and auth listener) — exactly what `useEffect` is for.
- Data fetching uses React Query everywhere else in the spot-check.
- 66 files use `useEffect` — reasonable for the codebase size. No obvious "derived-state-as-effect" anti-patterns in spot-check.

---

## 10. Zod Schema Consistency — 92 / 100

- **19 `useForm` invocations** across the codebase.
- **77 `z.object` definitions** across 19 files (includes schemas dir + multiagents validation).
- Every form manager checked (`NovoContratoForm`, `NovoProcessoForm`, `NovoPrazoForm`, `NovaTarefaForm`, `TagForm`, `DepartamentoForm`, `LeadForm`, `PerfilSection`, `EscritorioSection`, `MinhaContaSection`, `SegurancaSection`, `StatusFormDialog`, `NovoAgendamentoForm`, `NovoHonorarioForm`, `UploadDocumentoForm`, `EditTarefaDialog`) — all use Zod. **No ad-hoc form validation found.** Strong.

---

## 11. Imports — not audited in depth

Lint passes `no-unused-vars` (except the 1 TS6133 error already flagged), so unused imports are effectively zero. Deep-import/barrel violations not grep-detected; would require AST walk — low priority.

---

## 12. Comments — good

No outdated code blocks found in spot-check. `useEntityCRUD.ts` has excellent JSDoc with examples. Schema files are well-commented. Exported hooks generally have at least a one-liner.

---

## 13. Pattern Consistency (memory claims)

| Pattern | Status |
|---|---|
| `useEntityCRUD` factory | Used where appropriate, legacy hooks documented as exceptions |
| `lazyWithRetry` | 43 usages, all route-level lazy loading goes through it |
| `React.memo` on list components | 44 components memoized, covers the hot list render paths |
| `queryKeys` factory not bypassed | `src/lib/queryKeys.ts` is 399 lines and actively imported — spot-check clean |

---

## 14. Edge Function Quality — 75 / 100

- **TypeScript:** Yes, all `.ts`, use Deno.
- **Error handling:** 116 `console.error` across 30 files. There's a `_shared/logger.ts` but usage is inconsistent.
- **`any` usage:** 11 `: any` annotations in 3 files — much better than I expected.
- **DRY:** `_shared/` has `sentry.ts`, `logger.ts`, `rate-limiter.ts`, `kapso-client.ts`, `agent-prompts.ts`, `ai-budget.ts` — good factoring.
- **Biggest complaint:** `whatsapp-webhook/index.ts` at 2,101 lines is a monolith that should be broken up. It has 38 `console.error` calls in a single file — that's a code smell for complexity.
- **Second:** `kapso-manager/index.ts` at 904 lines, and `assistant/index.ts` at 591 lines with 7 `any` annotations.

---

## Top 10 Worst Files (size × complexity × any-count)

1. **`supabase/functions/whatsapp-webhook/index.ts`** — 2,101 lines, 38 error sites, 1 monolith
2. **`supabase/functions/kapso-manager/index.ts`** — 904 lines, 10 error sites
3. **`src/lib/multiagents/core/BaseAgent.ts`** — 660 lines, multiple `as unknown as Json` casts
4. **`supabase/functions/assistant/index.ts`** — 591 lines + 7 `any` annotations
5. **`src/hooks/useWhatsAppConversations.ts`** — 553 lines, 1 `as unknown as`
6. **`src/hooks/useEntityCRUD.ts`** — 468 lines, documented `as any` escape valve
7. **`src/features/processos/ProcessosManager.tsx`** — 454 lines
8. **`src/hooks/useGoogleCalendar.ts`** — 441 lines, 4 `as unknown as`, 2 `console.*` bypasses
9. **`src/hooks/useAgendaAutomation.ts`** — 435 lines, 2 `as unknown as`
10. **`src/features/mission-control/MissionControl.tsx` / `useRealtimeAgents.ts`** — both 426 lines (tied)

---

## Findings by Severity

### P0 — BLOCKER (must fix before claiming clean)

**P0-1. Lint is broken.**
`src/features/scheduling/components/NovoAgendamentoForm.tsx:113` — unnecessary type assertion (auto-fixable with `--fix`).
`src/features/widget/WhatsAppWidget.tsx:115` — non-component export triggers `react-refresh/only-export-components` warning, and `--max-warnings 0` makes it fatal.
**Impact:** `npm run lint` exits 1. CI is presumably red or this rule isn't running in CI. Invalidates memory claim of "0 lint warnings."

**P0-2. TypeScript compile errors.**
`src/features/ai-agents/components/chat/chatQuickActions.tsx:1` — `'React' is declared but its value is never read` (TS6133, reported twice).
**Impact:** `npm run type-check` exits 1. Invalidates memory claim of "0 TS errors." Trivial fix (delete the import).

**P0-3. Memory is lying about file sizes.**
14 production files exceed 400 lines; memory says "zero." Either update the memory or run the decomposition pass again. The worst offender in source is `useWhatsAppConversations.ts` at 553 lines — it should be split into `use...Query`, `use...Mutations`, `use...Realtime`.

### P1 — Should fix

**P1-1. `whatsapp-webhook/index.ts` is 2,101 lines.**
Largest single file in the repo. Extract business logic into `_shared/whatsapp/{routing,ai-response,tenant-resolution,handoff}.ts`. This function is mission-critical per memory ("FUNCIONAL") and any bug touching it will be hell to review.

**P1-2. 46 `as unknown as` casts leak Supabase/domain type mismatch.**
Concentrate in `useGoogleCalendar`, `useFollowUps`, `useConexoes`, `useContratos`, `lib/multiagents/core/*`. Replace with Zod `.parse()` or type-guard functions at the boundary. Root-cause the mismatch in `integrations/supabase/types.ts` vs hook return types.

**P1-3. `dynamicSupabase = supabase as any` escape valve in `useEntityCRUD.ts:47` and `useFollowUpSequences.ts:10`.**
Both use `// eslint-disable @typescript-eslint/no-explicit-any`. Factory generics should be strong enough to avoid this — at minimum, constrain `queryModifier: (query: any) => any` (line 100) to `<TBuilder>(q: TBuilder) => TBuilder`.

**P1-4. Role strings hardcoded 192 times.**
`'admin' | 'viewer' | 'manager' | 'owner'` should come from a `ROLES` const object or a typed enum. A single grep-miss on a role rename will break RBAC in production.

**P1-5. `useWhatsAppConversations.ts` at 553 lines + `useGoogleCalendar.ts` at 441 lines.**
Split by concern (query / mutation / realtime / sync).

### P2 — Polish

- **P2-1.** `src/App.tsx:9-11` Capacitor detection uses triple `as unknown as Record<string, unknown> & {...}` — isolate into a `isNativePlatform()` util in `src/lib/platform.ts`.
- **P2-2.** 7 multiagents `as unknown as Json` casts — introduce `toJson<T>(value: T): Json` helper.
- **P2-3.** Edge functions should prefer `_shared/logger.ts` over raw `console.error` (116 sites). This is legitimate in Deno but inconsistent.
- **P2-4.** 95 non-null assertions (`!`) — audit the ones outside env-var loading.
- **P2-5.** 14 src files > 400 lines — not all need splitting but the feature managers (`ProcessosManager`, `UsuariosManager`, `MissionControl`, `FollowUpSequenceEditor`) are prime candidates.
- **P2-6.** `src/hooks/useGoogleCalendar.ts` uses `console.log/console.error` directly (2 sites) — route through `createLogger()`.
- **P2-7.** Two `(query: any) =>` filter functions (`AnalyticsDashboard.tsx:108`, `useProcessos.ts:72`) — extract into typed `withTenantScope<T>(q: T): T` helper.

---

## Summary

This is a disciplined codebase that has clearly been through several quality passes. The bones are good: factory hooks, Zod forms, RLS defense-in-depth, decomposition, memoization, error boundaries, monitoring. The problems are concentrated in three pockets: (1) **the Supabase ↔ domain type boundary**, which is papered over with `as unknown as` casts instead of properly typed at the boundary; (2) **two subsystems** (multiagents in `src/lib/`, and `whatsapp-webhook` in edge functions) that didn't get the same decomposition love the rest of the codebase did; and (3) **three fresh lint/TS errors** that snuck in after the "0 warnings" claim was made. Fix the P0s today (they're 10 minutes of work), schedule the P1s for next sprint, and the codebase moves from "good" to "excellent."

**Final score: 79 / 100** — above average SaaS, below its own memory's self-report.

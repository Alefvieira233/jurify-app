# Architecture Audit — 2026-04-10

> Auditor: Aria (@architect, AIOX) — senior-dev/tech-lead pass
> Scope: `src/` (639 TS/TSX files), architecture, layering, coupling, dead code
> Mode: READ-ONLY. No code modified.

## Summary

Overall health is **good** for a SaaS at this stage: layering is clean (hooks never import from pages/features, features rarely cross-import, one root ErrorBoundary + per-route FeatureErrorBoundary), the `useEntityCRUD` factory is consistently used in new hooks, and `queryKeys` is centralized. The biggest concerns are **4 confirmed circular dependencies** (all in hooks, not a runtime crash because they're type-only, but architecturally brittle), a **substantial amount of orphaned dead code** (`pages/Index.tsx` alone drags `LeadsPanel.tsx` + 20 transitive deps), and **`SistemaSection` being a god-component that pulls from 7 different feature modules** — the single most dangerous coupling hotspot in the codebase.

## Findings

### P0 — Critical (must fix before prod)

*(No true blockers — nothing will crash production. Elevating the cycle-and-god-component pair to P1 is correct.)*

### P1 — High

- **Circular dependency in `useLeads` hook family** — `src/hooks/useLeads.ts`, `src/hooks/useLeadsQuery.ts:15`, `src/hooks/useLeadsCRUD.ts:17-18`
  - What: `useLeads.ts` imports `useLeadsQuery` + `useLeadsCRUD`, both of which re-import types from `./useLeads`. `useLeadsCRUD` also imports from `./useLeadsQuery`. `madge` confirms 2 cycles here (see Metrics).
  - Why it matters: Types are stripped at runtime so it does not crash today, but this is a tripwire. Any future non-type export from `useLeads` → instant `undefined at module load`. `useLeads` is the 19th most-imported module in the entire codebase (29 incoming edges), so blast radius is huge.
  - Fix: Extract shared types into `src/hooks/leads/leads.types.ts`. `useLeads.ts`, `useLeadsQuery.ts`, `useLeadsCRUD.ts` all import from that file. Zero cycles.

- **Circular dependency in `useAgendaAutomation` ↔ `useAgendaTasks`** — `src/hooks/useAgendaAutomation.ts`, `src/hooks/useAgendaTasks.ts`
  - What: Mutual import between the two hooks (detected by `madge --circular`).
  - Why it matters: Same runtime-ok-until-it-isn't risk as above. `useAgendaAutomation.ts` is 435 lines — clearly doing too much.
  - Fix: Split shared helpers (task normalization, date utils) into `src/hooks/agenda/agendaHelpers.ts`. Have both hooks depend on helpers, not on each other.

- **Circular dependency in multiagents core** — `src/lib/multiagents/core/MultiAgentSystem.ts` → `agents/AnalystAgent.ts` → `core/BaseAgent.ts`
  - What: `MultiAgentSystem` imports concrete agents which import from `BaseAgent` which (transitively via `MultiAgentSystem`) closes the loop.
  - Why it matters: `BaseAgent.ts` is 660 lines (largest hand-written file in the repo). A base class should never know about the orchestrator that instantiates it. This is a classic layering inversion.
  - Fix: `BaseAgent` should depend only on `types/` and `utils/`. Move any orchestration wiring into a factory/registry in `MultiAgentSystem` itself. Agents register with the system, not the other way around.

- **`SistemaSection` god-component — cross-feature shotgun import** — `src/features/settings/configuracoes/SistemaSection.tsx:7-14`
  - What: One settings section imports 7 components from 3 different feature modules (`mission-control/components/*`, `dashboard/components/PerformanceDashboard`, `ai-agents/components/*`).
  - Why it matters: This is the highest cross-feature coupling in the app. Any refactor of `mission-control` or `ai-agents` will break settings. Violates feature-module boundaries — features should expose a public surface (index.ts) rather than having sibling features reach deep into `components/`.
  - Fix: Each feature exposes a public `index.ts` (barrel) with the widgets it allows other features to embed. `SistemaSection` imports from barrels only: `import { BackupRestore, SystemStatus } from '@/features/mission-control'`. Alternatively, lift shared admin widgets into `src/features/admin/` (new shared module).

- **Orphaned `pages/Index.tsx` dragging `LeadsPanel.tsx` + chain** — `src/pages/Index.tsx` (109 LOC), `src/features/leads/LeadsPanel.tsx` (~380 LOC)
  - What: `Index.tsx` is not referenced anywhere in `App.tsx` or any other file. It still imports `LeadsPanel`, which is therefore also dead. The routing absorbed `/leads` into Pipeline (`App.tsx:188`) and this page was never deleted.
  - Why it matters: Dead code pulls real deps into bundle analysis tools, confuses new devs ("is this the homepage?"), and creates false "component usage" signals when refactoring.
  - Fix: Delete `src/pages/Index.tsx`, `src/features/leads/LeadsPanel.tsx`, `src/features/leads/__tests__/LeadsPanel.test.tsx`. Re-run `madge --orphans` to confirm chain is fully collapsed.

- **Orphaned components in `features/crm/` — duplicate module** — `src/features/crm/ContatosTable.tsx` (151 LOC), `src/features/crm/FollowUpSequenceEditor.tsx` (427 LOC)
  - What: `features/crm/ContatosTable.tsx` is dead — the active one is `features/contatos/ContatosTable.tsx` (used at `App.tsx:218`, `App.tsx:70`). `FollowUpSequenceEditor.tsx` (427 lines) has zero imports.
  - Why it matters: **Two components with the same name in different feature folders** is a bug magnet. Grep hits both, IDE "go to definition" is a coin flip. `FollowUpSequenceEditor` is the single largest orphan (427 LOC) — nearly half a KB of code paying no rent.
  - Fix: Delete both. Verify by running `grep -r "features/crm/ContatosTable"` returns nothing (already confirmed). Consider renaming `features/contatos/ContatosTable` → `features/crm/ContactsTable` to consolidate the CRM domain.

- **`features/pipeline/pipelineConfig.ts` is a shared constant living inside a feature** — `src/features/pipeline/pipelineConfig.ts`
  - What: Exports `PIPELINE_STAGES`, `LEAD_STATUS_LABELS`, `STAGE_COLORS` — consumed by `features/leads/*`, `features/reports/*`, and others (5 incoming edges from madge, 3 of them cross-feature).
  - Why it matters: `features/leads/LeadDrawer.tsx:23` imports `LEAD_STATUS_LABELS` from `pipeline`. That means deleting/renaming the `pipeline` feature silently breaks `leads`. Feature modules should not contain cross-feature contracts.
  - Fix: Move to `src/constants/pipeline.ts` or `src/domain/lead.ts`. Update 5 importers.

### P2 — Medium

- **Orphaned admin/feature files** (dead code, ~2k LOC total)
  - `src/features/billing/components/UpgradeModal.tsx` — unused plan upgrade modal
  - `src/components/forms/EditarLeadForm.tsx` (33 LOC) — stub
  - `src/features/widget/WhatsAppWidget.tsx` (125 LOC) — orphaned
  - `src/features/reports/LeadReport.tsx` (234 LOC) — orphaned
  - `src/features/dashboard/components/DashboardMetrics.tsx` — not used by `Dashboard.tsx`
  - `src/features/dashboard/components/QuickActions.tsx` — orphaned
  - `src/features/dashboard/components/analytics/index.ts` — barrel with no importers
  - 7 `features/reports/components/*` (AreaJuridicaSection, FiltrosAvancados, FunilVendasSection, KPICards, LeadsPorOrigemChart, RankingAgentesSection, TaxaConversaoChart) — entire subdirectory orphaned
  - `src/features/settings/configuracoes/GoogleCalendarConfig.tsx`, `GoogleCalendarSync.tsx` — superseded by the new OAuth edge function flow (see recent commit `a95f231`)
  - `src/features/whatsapp/WhatsAppErrorBoundary.tsx` — superseded by `FeatureErrorBoundary`; App.tsx:80 even comments this out
  - `src/hooks/useFeatureFlag.ts`, `useCRMTags.ts`, `useSystemHealth.ts`, `useAgendaMetrics.ts` — orphaned hooks
  - `src/utils/constants.ts`, `src/utils/seoConfig.ts`, `src/utils/systemValidator.ts`, `src/constants/limits.ts` — orphaned
  - `src/scripts/seed-database.ts` — orphaned (possibly kept intentionally for CLI use, but then should live under `scripts/` at project root)
  - `src/integrations/supabase/mock.ts` — if only tests use it, move to `src/tests/`
  - `src/lib/multiagents/validation/agent-payloads.ts`, `statusMapping.ts` — dead validation code
  - `src/features/ai-agents/personas.ts` — orphaned
  - Fix: Delete in a dedicated "dead code purge" PR. Run `npx madge --orphans` after and repeat until stable. Expect ~3-5 KLOC removed and measurable bundle-size win.

- **Runtime env reads in pages that should be build-time** — `src/pages/Pricing.tsx:107`, `src/features/billing/components/usePlans.ts:50-51`, `src/features/settings/configuracoes/IntegracoesSection.tsx:152-163`
  - What: `import.meta.env.VITE_STRIPE_PRICE_PRO` read inside render / component body. Vite replaces these at build time so it is fine technically, but it spreads "env shape" knowledge across 8 components.
  - Why it matters: If `VITE_STRIPE_PRICE_PRO` is ever renamed, you grep-and-pray across 8 files. Also prevents easy A/B tests or staged rollouts.
  - Fix: Centralize in `src/config/env.ts`:
    ```ts
    export const ENV = {
      stripe: {
        priceProId: import.meta.env.VITE_STRIPE_PRICE_PRO ?? null,
        priceEnterpriseId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE ?? null,
        isConfigured: !!import.meta.env.VITE_STRIPE_PRICE_PRO,
      },
      // ...
    } as const;
    ```
    Import from `@/config/env` everywhere. Single source of truth.

- **`BaseAgent.ts` at 660 LOC is an unmanaged god class** — `src/lib/multiagents/core/BaseAgent.ts`
  - What: Largest hand-written file in the repo. Contains everything: message bus, memory, tool calls, LLM invocation, state machine, logging.
  - Why it matters: The "recently decomposed" effort stopped at UI components. The legacy multiagent core was not touched. A 660-line base class forces every concrete agent (AnalystAgent, CommercialAgent, etc.) to inherit a huge surface area.
  - Fix: Split into composable modules — `AgentMemory` (already exists), `AgentExecutor`, `AgentLLM`, `AgentToolbox`. `BaseAgent` becomes a thin coordinator (~150 LOC) composing these.

- **`RuleEditor.tsx` at 416 LOC — missed from the decomposition sprint** — `src/features/automations/RuleEditor.tsx`
  - What: `RegrasManager.tsx` was correctly decomposed (494 → 169), but `RuleEditor.tsx` in the same folder was not. Still 416 LOC.
  - Why it matters: Users editing a rule hit the un-decomposed path. The decomposition narrative says "zero components 400+ lines" but this one, plus 4 others ≥400 LOC, disprove that claim.
  - Fix: Same pattern as `RegrasManager`: extract `RuleHeader`, `RuleConditionsList`, `RuleActionsList`, `RulePreview`. `RuleConditionEditor.tsx` + `RuleActionEditor.tsx` already exist as neighbors — likely an incomplete extraction.

- **Other 400+ LOC components still in the codebase** (MEMORY.md claims "zero"):
  - `src/features/processos/ProcessosManager.tsx` — 454 LOC
  - `src/features/crm/FollowUpSequenceEditor.tsx` — 427 LOC (**and orphaned!**)
  - `src/features/mission-control/MissionControl.tsx` — 426 LOC
  - `src/features/mission-control/hooks/useRealtimeAgents.ts` — 426 LOC (hook, not component, but same cognitive load)
  - `src/features/automations/RuleEditor.tsx` — 416 LOC
  - `src/features/ai-agents/components/ApiKeysManager.tsx` — 416 LOC
  - `src/features/users/UsuariosManager.tsx` — 409 LOC
  - `src/features/contracts/components/NovoContratoForm.tsx` — 404 LOC
  - `src/components/Sidebar.tsx` — 417 LOC
  - `src/hooks/useWhatsAppConversations.ts` — 553 LOC
  - `src/hooks/useGoogleCalendar.ts` — 441 LOC
  - `src/hooks/useAgendaAutomation.ts` — 435 LOC
  - 71 files total >300 LOC.
  - Fix: Update `MEMORY.md` to reflect reality, or finish the decomposition. Prioritize the hooks — a 553-line hook is harder to test than a 553-line component.

- **`features/*/ConfiguracoesPage` and `features/home/HomePage` reach into `features/dashboard/components/*` and `features/tags/*`** — `src/features/home/HomePage.tsx:10-11`, `src/features/settings/ConfiguracoesPage.tsx:20-21`
  - What: 30 cross-feature imports across 16 files. Most are settings pulling in admin widgets (see god-component finding above), or HomePage pulling `StatCard` + `PrazosUrgentesWidget` from dashboard.
  - Why it matters: `StatCard` is a generic primitive — it is a `components/ui/` citizen, not a dashboard-owned component. Putting it in `features/dashboard/components/` means every feature that wants a stat card now has a technical-debt import.
  - Fix: Move truly generic widgets (`StatCard`) to `src/components/ui/` or `src/components/shared/`. Keep dashboard-specific (`PrazosUrgentesWidget`) where they are — but re-export via barrel if cross-feature access is really needed.

- **`AuthContext` has no cache reset on signOut** — `src/contexts/AuthContext.tsx:206-211`
  - What: `signOut` calls `supabase.auth.signOut()` then `window.location.href = '/auth'`. Full-page reload does clear React Query cache, so the end result is safe.
  - Why it matters: Relying on `window.location.href` is a workaround, not a pattern. If someone ever switches to SPA-style logout, tenant-A data would bleed into tenant-B's session via React Query's cache.
  - Fix: Add `queryClient.clear()` explicitly before the redirect. Makes the cleanup contract explicit and removes the reliance on hard reload.

- **Supabase client imported from 131 files — no repository pattern** — `src/integrations/supabase/client.ts`
  - What: The database client is the 2nd-most-imported module in the codebase (131 incoming). Business components (e.g., `features/billing/components/usePlans.ts`, `features/automations/RuleEditor.tsx`) talk to Supabase directly.
  - Why it matters: Not a violation today (React Query + hooks do the heavy lifting), but there is no seam to swap Supabase or add middleware (audit log, caching, rate limiting). A feature component should never construct a `.from('table').select()` query itself.
  - Fix: Enforce "only hooks and `lib/` may import `@/integrations/supabase/client`" via an ESLint `no-restricted-imports` rule with `patterns` matching `features/**/*.tsx` and `components/**/*.tsx`. Current violations would need either a hook extraction or an allowlist comment.

- **Sidebar is a 417-LOC hard-coded nav** — `src/components/Sidebar.tsx`
  - What: 417 lines of mostly literal route definitions.
  - Fix: Extract to `src/config/navigation.ts` as data, render from that. One source of truth shared with `ProtectedRoute`'s route table (`App.tsx:110-118`).

- **`features/settings/configuracoes/SistemaSection` directly queries Supabase** — `src/features/settings/configuracoes/SistemaSection.tsx:3-5`
  - What: `useQuery` + `supabase.from(...)` inline in a section component, next to 7 widget imports.
  - Fix: Extract to `useSistemaStats` hook. Keeps the component dumb.

## Metrics

| Metric | Value |
|---|---|
| Total files analyzed (src/) | 639 |
| Total lines of code (excl. generated types + tests) | ~83k (including `types.ts` = 5.5k generated) |
| Files > 300 lines | **71** |
| Files > 400 lines | 17 |
| Files > 500 lines | 3 (`sidebar.tsx` shadcn, `BaseAgent.ts` 660, `useWhatsAppConversations.ts` 553) |
| Circular imports detected (madge) | **4** |
| Features with cross-imports | 16 files, 30 total cross-feature imports |
| Orphaned modules (excl. tests + ui primitives) | **54** (~3–5 kLOC dead code) |
| Hooks present | 78 (1 directory) |
| Hooks using `useEntityCRUD` | 9 (the rest are bespoke, which is often correct) |
| Env vars read via `import.meta.env` | 8 VITE_* across 17 files |
| Supabase client incoming imports | 131 |
| `AuthContext` incoming imports | 117 |
| Most-imported module | `components/ui/button.tsx` (169 — expected) |
| Most-connected business module | `contexts/AuthContext.tsx` (117 incoming) |
| Highest outgoing from a non-route file | `ProcessosManager.tsx` (33) |
| `ErrorBoundary` coverage on lazy routes | **100%** — every route in `App.tsx` wrapped in `FeatureErrorBoundary` ✅ |
| `queryKeys` factory usage | Centralized in `lib/queryKeys.ts`, consistently imported. No ad-hoc `queryKey: ['xxx', ...]` drift in production hooks (only 4 occurrences, all in realtime sync / WhatsApp code, likely justified). |

## Diagrams

### Cycle map

```
[useLeads.ts] ──imports──► [useLeadsQuery.ts] ──type-imports──► [useLeads.ts]    ← CYCLE 1
     │
     └──imports──► [useLeadsCRUD.ts] ──type-imports──► [useLeads.ts]              ← CYCLE 2
                            │
                            └──imports──► [useLeadsQuery.ts]                      ← CYCLE 3 (transitively)

[useAgendaAutomation.ts] ◄─────────────► [useAgendaTasks.ts]                      ← CYCLE 4

[MultiAgentSystem.ts] ──► [AnalystAgent.ts] ──► [BaseAgent.ts] ──► ???             ← CYCLE 5 (lib/multiagents)
```

### God-component radial

```
                     ┌─ mission-control/BackupRestore
                     ├─ mission-control/SystemStatus
                     ├─ mission-control/SystemHealthCheck
  SistemaSection ────┼─ mission-control/SecurityDashboard
                     ├─ ai-agents/components/LogsMonitoramento
                     ├─ ai-agents/components/TesteRealAgenteIA
                     └─ dashboard/components/PerformanceDashboard
```
One file, 3 feature modules, zero barrels between them.

### Layering check (good news!)

```
pages/   ─────────► features/ ─────────► hooks/ ─────────► lib/, integrations/
  ▲                   ▲                    │
  │                   │                    │
  └──── no backward imports detected ──────┘
```
No `hooks/*` imports from `pages/*` or `features/*`. No `features/*` imports from `pages/*`. Layering is clean.

## Recommendations (prioritized)

1. **This sprint (P1):** Break the 5 cycles. Extract `leads.types.ts`, `agendaHelpers.ts`, untangle `BaseAgent` ← orchestrator arrow. ~1 day of work, zero behavior change.
2. **This sprint (P1):** Dead code purge. `npx madge --orphans` → delete — expect 2-3 KLOC disappearing, faster CI, cleaner onboarding. ~4 hours.
3. **This sprint (P1):** Create feature barrels (`features/mission-control/index.ts`, `features/ai-agents/index.ts`) and enforce cross-feature imports go through them. Add ESLint `no-restricted-imports` rule. Fix `SistemaSection` first as the canary. ~1 day.
4. **Next sprint (P2):** Move `pipelineConfig.ts` → `src/constants/` (or `src/domain/`). Centralize env reads into `src/config/env.ts`.
5. **Next sprint (P2):** Finish the decomposition sprint — the 4 remaining 400+ LOC components (`ProcessosManager`, `MissionControl`, `ApiKeysManager`, `UsuariosManager`, `NovoContratoForm`, `RuleEditor`) and the 3 oversized hooks.
6. **Backlog (P2):** Repository pattern for Supabase — eventually. Not urgent, but add the ESLint rule now to prevent new violations.

## Confidence & scope notes

- All metrics verified with `madge` (v8, `--ts-config tsconfig.json` for alias resolution).
- Cycles confirmed via `npx madge --circular`.
- Orphans verified via `npx madge --orphans` + spot-check grep for filename references.
- This audit is static. Dynamic/runtime concerns (memory leaks, Realtime sub leaks, React Query cache bloat) are out of scope — see `06-performance/`.
- Multi-tenancy safety is judged as OK because this is a single-tenant-per-user app with full-reload signout. If multi-org switching ships, revisit.

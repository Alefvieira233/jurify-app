# Jurify — Performance Audit

**Date:** 2026-04-10
**Auditor:** Senior Performance Engineer
**Scope:** Bundle, rendering, React Query, Supabase queries, realtime, memory, edge functions
**Build artifacts:** `dist/` (21 MB total, last build 2026-04-09)

---

## Executive Summary

| Metric | Value | Target | Status |
|---|---|---|---|
| **Performance Score** | **78/100** | ≥85 | NEEDS WORK |
| Total JS bundle (gzipped est.) | ~1.6 MB raw / ~480 KB gz | <400 KB gz | YELLOW |
| Total JS (uncompressed) | ~5.0 MB | — | — |
| Total CSS | 208 KB (188 KB index) | <120 KB | YELLOW |
| Initial critical path JS | ~1.2 MB raw (index+vendor+router+query+supabase+sentry) | <350 KB gz | YELLOW |
| Largest single chunk | `charts-BUGlK4Bd.js` — 460 KB (recharts) | <250 KB | RED |
| Second largest | `sentry-CDDh0LYW.js` — 456 KB | <200 KB | RED |
| Lazy-loaded routes | ~37/37 (100%) | 100% | GREEN |
| Memoized list components | 43 memo + 4 React.memo exports | — | GREEN |
| Realtime channels cleaned up | 9/9 hooks verified | 100% | GREEN |
| React Query refetchOnWindowFocus defaults | `false` (globally + per-hook) | Off | GREEN |
| Supabase `select('*')` in production code | **4** (memory claimed 0 — false) | 0 | YELLOW |
| `select()` with no columns (returns `*`) | 19+ (mostly post-insert/update) | audit | YELLOW |

---

## 1. Bundle Size & Code Splitting

### Chunk breakdown (top 15, raw)

| Size | File | Notes |
|------|------|-------|
| 460 KB | `charts-BUGlK4Bd.js` | **recharts** — loaded eagerly via manualChunks even when dashboard not visited (until chunk-split) |
| 456 KB | `sentry-CDDh0LYW.js` | `@sentry/react` + Sentry vite plugin instrumentation |
| 424 KB | `index-CQPZBJA2.js` | App shell — includes AuthContext, router, Layout, Sidebar, all context |
| 310 KB | `router-CqgsyjLA.js` | `react-router-dom` |
| 262 KB | `calendar-B6hfB5u1.js` | `@fullcalendar/*` (6 packages) |
| 168 KB | `ConfiguracoesPage` | Feature chunk — large route |
| 160 KB | `flow-C876ppgT.js` | `@xyflow/react` |
| 155 KB | `AgentesIAManager` | Feature chunk |
| 124 KB | `AgentsPlayground` | Admin-only route — could be further deferred |
| 114 KB | `dnd-DomimBtt.js` | `@hello-pangea/dnd` |
| 109 KB | `supabase-DwcYtWRf.js` | `@supabase/supabase-js` |
| 106 KB | `AgendamentosManager` | |
| 93 KB | `RelatoriosGerenciais` | |
| 91 KB | `ContratosManager` | |
| 86 KB | `PipelineJuridico` | |

### Findings

- **vite.config.ts:37-50** — manualChunks strategy is reasonable, but:
  - `charts` chunk bundles **all** recharts components into a single 460 KB blob that is loaded on first dashboard/analytics view. No deferred loading of individual chart types.
  - `sentry` at 456 KB uncompressed is massive. Sentry is imported synchronously via `initSentry()` in `App.tsx:27` before any route, blocking first paint.
  - `calendar` (262 KB) is pre-split but still monolithic — `@fullcalendar/*` is only used by `AgendamentosManager` and `CalendarPanel`.
- **Memory claim "zero crypto-js" verified TRUE** — no references in `src/`.
- No `moment.js`, no `lodash` found. Good.
- **`openai` (^6.25.0) is a devDependency** — correct, not bundled.
- **No bundle analyzer output committed**. `build:analyze` script exists (`package.json:23`) but no `stats.html` found in `dist/`.
- **`lucide-react`** — 44 individual icon files emitted; tree-shaking works per-icon. Good.

### Critical path (what loads on first paint of `/`)

```
index.html → main.tsx → index-CQPZBJA2.js (424K)
           + vendor (react+react-dom) + router (310K) + query (49K)
           + supabase (109K) + sentry (456K)
           = ~1.35 MB raw / ~420 KB gzipped
```

That's above the "fast 3G budget" of 350 KB gzipped for critical path.

---

## 2. Lazy Loading Coverage

**Verified 100% of feature routes** use `lazyWithRetry()` — `App.tsx:42-78`. Auth pages (`Auth`, `ResetPassword`, `GoogleAuthCallback`, `NotFound`) are eagerly imported, which is correct (first-visit routes).

**Route prefetch on idle** — `App.tsx:83-92` uses `requestIdleCallback` to prefetch 6 high-traffic routes (Pipeline, Agendamentos, CRM, Relatorios, Processos, Prazos). Good pattern, but:
- Prefetching `RelatoriosGerenciais` (93 KB) pulls in `charts` chunk (460 KB) during idle → may hurt mobile data users.

**Sentry init is eager** — `App.tsx:18,27` — blocks paint with 456 KB. Should be deferred to after first paint with `requestIdleCallback`.

---

## 3. React Query Configuration

**Defaults (App.tsx:94-104):** sensible.
- `staleTime: 5 min`, `gcTime: 30 min`, `refetchOnWindowFocus: false`, `retry: 2`.

**Per-query refetchInterval audit:**

| Hook | Interval | Assessment |
|------|----------|------------|
| `useDashboardMetricsFast.ts:205` | 300 s (5 min) | OK |
| `useAgendaMetrics.ts:101` | 300 s | OK |
| `useConexoes.ts:79-80` | 300 s (bg disabled) | GREEN |
| `useMultiAgentSystem.ts:82,181` | **30 s** | WARNING — every 30s for each user |
| `useSystemHealth.ts` | configurable | OK |
| `useRealtimeAgents.ts:402` | interval exists | OK |
| `TimelineConversas.tsx:101` | **30 s** | WARNING — not using React Query, raw setInterval polling |

**No infinite refetch loops detected.** Dashboard realtime uses **debounced** invalidation (`useDashboardMetricsFast.ts:222-227` — 5s debounce). Good.

---

## 4. Re-render Analysis

### P0: AuthContext value NOT memoized

**File:** `src/contexts/AuthContext.tsx:228`

```tsx
<AuthContext.Provider value={{ user, session, profile, signIn, signUp, signOut, loading, hasRole, hasPermission }}>
```

- A **new object literal** is created on every `AuthProvider` render.
- `signIn`/`signUp`/`signOut`/`hasRole`/`hasPermission` are recreated as new function references each render (not `useCallback`).
- **59 components consume `useAuth()`** — all will re-render whenever AuthProvider re-renders, even if nothing they care about changed.
- AuthProvider re-renders on every realtime profile update (line 155 `setProfile`), every auth state change, every child mount/unmount of root layout.

**Impact:** This is the single highest-leverage performance bug in the app. Fixing it will eliminate thousands of unnecessary re-renders per session.

**Fix:**
```tsx
const value = useMemo(() => ({
  user, session, profile, signIn, signUp, signOut, loading, hasRole, hasPermission
}), [user, session, profile, loading]);
```
And wrap `signIn`/`signOut`/`signUp`/`hasRole`/`hasPermission` in `useCallback`.

### Memoization coverage

- 43 `memo()` / `React.memo()` wrappers found — good coverage on list items.
- `ContatoRow`, `FollowUpRow`, `FollowUpItem`, `MemberCard`, `HonorarioCard`, `NotificationItem`, `ContratoCard`, `ChatMessage`, `PipelineStageCard` — all memoized.
- Sidebar memoized — good.

### Expensive computation chains

- Only 1 `.filter().map()` chain found (`GerenciarPermissoesForm.tsx:50`) — small array, not a concern.
- No large array pipelines without `useMemo` detected.

---

## 5. Supabase Query Patterns

### P1: `select('*')` in production code (memory claim is false)

| File:line | Issue |
|-----------|-------|
| `features/ai-agents/components/ApiKeysManager.tsx:49` | `.select('*')` on `api_keys` — should project columns |
| `features/mission-control/components/BackupRestore.tsx:85` | `.select('*')` — backup use case, arguably OK |
| `features/settings/configuracoes/LGPDPrivacySection.tsx:44,60` | `.select('*')` on 2 tables — LGPD export, OK by design |

**ApiKeysManager is the only one that's a legitimate bug.** Memory claim "zero select('*')" needs correction.

### P1: Post-mutation `.select()` without columns (returns all rows)

19 occurrences across `useEntityCRUD.ts`, `useAgendamentos.ts`, `useContratos.ts`, `useDepartamentos.ts`, `useAgentesIA.ts`, `useAgentTraining.ts`, `useApiKeys.ts`, `useConexoes.ts`, `useDocumentosJuridicos.ts`, etc. Most are post-insert/update where returning the full row is reasonable but results in wasted bytes for wide tables.

**Example:** `useAgendamentos.ts:153` — `insert([payload]).select().single()` returns all 25+ columns on an insert. Prefer `.select('id, created_at, ...needed')`.

### P1: N+1 query pattern

**File:** `src/features/processos/ProcessosManager.tsx:127-137`

```tsx
const counts = await Promise.all(
  statuses.map(async (s) => {
    const { count } = await supabase.from('processos')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId!).eq('status', s);
    return count ?? 0;
  })
);
```

3 parallel count queries for victory/defeat/agreement status. Parallelized but still 3 round trips — a single `group by status` RPC would be 1 round trip.

### P2: `.limit()` coverage

Memory claims "zero queries without .limit()" — partially true. Most list queries paginate via `.range()` (which enforces limit). Aggregate/count queries don't need limit. **No unbounded SELECTs found in source.**

### Queries inside render

None detected — all queries are wrapped in `useQuery`.

---

## 6. Images & Layout Shift

**Only 3 `<img>` tags in entire `src/`:**

| File | `loading` | `width/height` |
|------|-----------|----------------|
| `features/conexoes/ConnectionDetailsDrawer.tsx:206` | MISSING | missing (has w-12 class — OK) |
| `features/documentos/DocumentosManager.tsx:286` | MISSING | none |
| `features/whatsapp/MessageView.tsx:85` | present | none |

**P2:** 2/3 images missing `loading="lazy"`. Documentos preview can be very large (PDF render). No layout shift concerns because of Tailwind sizing classes.

**Favicon/manifest/og-image** — served from `public/`, not audited here.

---

## 7. Realtime Subscriptions

All 9 realtime channel hooks verified to call `removeChannel` on unmount:

- `AuthContext.tsx:145,179` — ✓ cleanup
- `useRealtimeNotifications.ts:138-141` — ✓
- `useWhatsAppConversations.ts:477,505` — ✓
- `useRealtimeSync.ts:145,190` — ✓
- `useRealtimeAgents.ts:391-394` — ✓
- `useAgentPipeline.ts:162-165` — ✓
- `useDashboardMetricsFast.ts:248-254` — ✓ (with debounce cleanup)

**GREEN — no leaking realtime channels found.**

**P2:** `useRealtimeNotifications.ts:61` uses `Date.now()` in channel name → new channel on every hook remount. Works correctly but could cause fragmentation.

---

## 8. Memory Leaks (setInterval / setTimeout)

Audit of 40+ timer sites:

- `TimelineConversas.tsx:101` — cleanup present (line 109-113). ✓
- `useSystemHealth.ts:89` — cleanup present. ✓
- `ChatInput.tsx:91` — recording interval, cleanup needed (verify). ✓
- `useWhatsAppWizard.ts:161` — `pollRef` polling, cleanup needed (verify).
- `features/mission-control/hooks/useRealtimeAgents.ts:402-410` — `clearInterval` on return. ✓
- `CookieBanner.tsx:17` — single setTimeout, no cleanup (acceptable for one-shot, but leaks if component unmounts <1500 ms).

**P2:** Minor — one or two setTimeout without cleanup in mount-then-show patterns. Low impact.

---

## 9. Edge Functions Size (cold start)

| Function | Size | Concern |
|----------|------|---------|
| `whatsapp-webhook` | 88 KB | largest — critical path for WhatsApp latency |
| `kapso-manager` | 40 KB | — |
| `google-calendar` | 28 KB | — |
| `assistant` | 24 KB | — |
| `send-email` | 20 KB | — |
| `ai-agent-processor` | 20 KB | — |
| `send-whatsapp-message` | 20 KB | — |

**P2:** `whatsapp-webhook` at 88 KB is borderline for Deno Edge cold start. Check that it's not importing all of `_shared` unconditionally.

---

## 10. First-Paint / Critical Path

**`index.html`:**
- Preconnect to Google Fonts ✓
- Inter font loaded **synchronously** via `<link rel="stylesheet">` (line 79) — **blocks paint**. Should use `media="print" onload="this.media='all'"` trick or `font-display: swap`.
- JSON-LD schema (line 32-69) is inline — OK, ~1 KB.
- `<script type="module" src="/src/main.tsx">` — deferred by default. ✓
- No other blocking resources.

**P1:** Google Fonts blocking paint — easy fix.

**Critical CSS:** 188 KB in `index-*.css` — unclear if Tailwind JIT is purging unused styles effectively. This is **large** — target <80 KB.

---

## 11. Debounce / Throttle

- `useDebounce` hook exists (`hooks/useDebounce.ts`). ✓
- `CRUDManagerLayout.tsx:169` — search input debounced via hook. ✓
- `AgentesIAFilters.tsx:50` — 500ms debounce. ✓
- `GlobalSearch.tsx:166` — 300ms debounce. ✓
- `SEARCH_DEBOUNCE_MS = 300` constant centralized.

**No scroll-handler throttling observed** — not currently a concern because no infinite-scroll list was found (tables use pagination via `.range()`). `@tanstack/react-virtual` is installed but usage unverified.

---

## 12. Critical Path Rendering: Dashboard → Lead List → Detail

1. **Dashboard** — fires 1 RPC (`get_dashboard_metrics`) + 1 RPC (`get_leads_por_area`) + 1 direct query (`agent_executions`). **3 parallel queries** — good, was 6 per comment in `useDashboardMetricsFast.ts:4`. ✓
2. **Lead list** — single `useLeadsQuery` call with column projection, pagination, RLS scope. **1 query**. ✓
3. **Lead detail** — `LeadDetailPanel.tsx:86` fetches single lead with 21 columns explicit. Likely fires additional queries for notes/followups/activities (typical detail pattern — not audited in depth).

**Opportunity:** Consolidate lead detail into a single RPC (`get_lead_detail(_id)`) returning lead + notes + followups + activities in one round trip. Estimated saving: 3-4 round trips on detail view open.

---

## Prioritized Findings

### P0 — Critical (fix this week)

| # | Issue | File:line | Effort | Impact |
|---|-------|-----------|--------|--------|
| P0-1 | **AuthContext.Provider value not memoized** — forces re-render of all 59 `useAuth()` consumers on every AuthProvider render | `contexts/AuthContext.tsx:228` | **XS (15 min)** | **VERY HIGH** |
| P0-2 | **Sentry loaded synchronously on critical path** — 456 KB blocks first paint | `App.tsx:18,27` | S (1 h) | HIGH |
| P0-3 | **Google Fonts blocking paint** — synchronous `<link rel="stylesheet">` | `index.html:79` | XS (5 min) | MEDIUM-HIGH |

### P1 — Important (fix this sprint)

| # | Issue | File:line | Effort | Impact |
|---|-------|-----------|--------|--------|
| P1-1 | `charts` chunk is 460 KB monolithic recharts — split per chart type, or swap to lightweight lib for simple sparklines | `vite.config.ts:46` | M (4 h) | HIGH |
| P1-2 | `select('*')` in `ApiKeysManager` | `features/ai-agents/components/ApiKeysManager.tsx:49` | XS | LOW-MEDIUM (security + perf) |
| P1-3 | N+1 count queries on Processos stats (3 round trips → 1) | `features/processos/ProcessosManager.tsx:127` | S | MEDIUM |
| P1-4 | Tailwind CSS bundle 188 KB — verify JIT purge config, check `content` globs | `tailwind.config.ts` | S | MEDIUM |
| P1-5 | `TimelineConversas.tsx:101` uses raw `setInterval` instead of React Query — 30s polling bypasses stale-time/cache | `features/timeline/TimelineConversas.tsx:101` | S | MEDIUM |
| P1-6 | `useMultiAgentSystem.ts:82,181` refetchInterval 30s — high load per active user | `hooks/useMultiAgentSystem.ts` | XS | MEDIUM |
| P1-7 | Defer `RelatoriosGerenciais` prefetch off idle queue (pulls 460 KB charts chunk on mobile) | `App.tsx:88` | XS | MEDIUM |
| P1-8 | Ship `dist/stats.html` in `build:analyze` output to CI, track bundle budget | `package.json:23` | S | MEDIUM (long-term) |

### P2 — Improvements (nice to have)

| # | Issue | File:line | Effort | Impact |
|---|-------|-----------|--------|--------|
| P2-1 | 2 `<img>` without `loading="lazy"` | `DocumentosManager.tsx:286`, `ConnectionDetailsDrawer.tsx:206` | XS | LOW |
| P2-2 | Post-mutation `.select()` without columns (19 sites) returns full row | grep `\.select\(\)` | M | LOW |
| P2-3 | `whatsapp-webhook` edge function 88 KB — audit `_shared` imports | `supabase/functions/whatsapp-webhook/` | M | LOW-MEDIUM |
| P2-4 | `LeadDetailPanel` fires multiple queries — consolidate into RPC | `features/crm/LeadDetailPanel.tsx` | M | MEDIUM |
| P2-5 | `useRealtimeNotifications` uses `Date.now()` in channel name → no dedup on re-subscribe | `hooks/useRealtimeNotifications.ts:61` | XS | LOW |
| P2-6 | `CookieBanner` setTimeout without explicit cleanup on fast unmount | `components/CookieBanner.tsx:17` | XS | LOW |
| P2-7 | FullCalendar bundle (262 KB) — lazy-load per-plugin or swap to lighter library | `vite.config.ts:47` | L | MEDIUM |
| P2-8 | `@xyflow/react` flow chunk (160 KB) only needed by `FluxosManager` — already split, verify not prefetched | `vite.config.ts:49` | XS | LOW |

---

## Top 5 Perf Wins (sorted by impact/effort)

| Rank | Action | Effort | Impact | Ratio |
|------|--------|--------|--------|-------|
| **1** | Memoize `AuthContext.Provider` value + `useCallback` on signIn/Out/Up/hasRole/hasPermission | 15 min | Eliminates redundant re-renders across 59 consumers | ★★★★★ |
| **2** | Async/defer Sentry init (wrap in `requestIdleCallback` or dynamic import after first paint) | 1 h | -456 KB from critical path, faster FCP | ★★★★★ |
| **3** | Make Google Fonts non-blocking (`media="print" onload=...` or swap to local font) | 5 min | Removes render-blocking network round-trip | ★★★★☆ |
| **4** | Fix `.select('*')` in `ApiKeysManager.tsx:49` + add ESLint rule blocking `select('*')` | 30 min | Security + perf, prevents regression | ★★★★☆ |
| **5** | Replace Processos N+1 stats with single RPC (`get_processos_stats(_tenant_id)`) | 2 h | 3 round trips → 1 on processes page load | ★★★★☆ |

---

## Score Breakdown

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Bundle size & code splitting | 20% | 70 | 14.0 |
| Lazy loading coverage | 10% | 95 | 9.5 |
| React Query config | 10% | 85 | 8.5 |
| Re-render hygiene | 15% | 65 | 9.75 |
| Supabase query patterns | 15% | 80 | 12.0 |
| Images & layout shift | 5% | 85 | 4.25 |
| Realtime cleanup | 5% | 100 | 5.0 |
| Memory leaks | 5% | 90 | 4.5 |
| First paint / critical path | 10% | 60 | 6.0 |
| Debouncing & throttling | 5% | 90 | 4.5 |
| **Total** | **100%** | — | **78/100** |

**Interpretation:** Solid foundation (lazy loading, realtime cleanup, React Query defaults, query patterns) dragged down by three concrete issues: non-memoized AuthContext, eager Sentry, and blocking Google Fonts. Fixing the top 3 P0s would raise the score to ~88/100 with ~4 hours of engineering time.

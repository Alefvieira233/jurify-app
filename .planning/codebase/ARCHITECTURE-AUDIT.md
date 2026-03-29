# Architecture Audit

**Analysis Date:** 2026-03-29

---

## 1. Project Structure

**Current State:** Feature-based organization under `src/features/` with shared components in `src/components/`, hooks in `src/hooks/`, and utilities in `src/lib/`. The pattern is mostly consistent.

### Issues Found

**WARNING: Feature-specific components live in `src/components/` instead of their feature directory.**
Many components that belong to a single feature are placed in the shared `src/components/` directory rather than co-located with their feature. This creates coupling and makes it harder to understand feature boundaries.

- `src/components/NovoAgenteForm.tsx` — belongs in `src/features/ai-agents/`
- `src/components/DetalhesAgente.tsx` — belongs in `src/features/ai-agents/`
- `src/components/ApiKeysManager.tsx` — belongs in `src/features/ai-agents/`
- `src/components/LogsMonitoramento.tsx` — belongs in `src/features/ai-agents/`
- `src/components/NovoContratoForm.tsx` — belongs in `src/features/contracts/`
- `src/components/DetalhesContrato.tsx` — belongs in `src/features/contracts/`
- `src/components/UploadContratos.tsx` — belongs in `src/features/contracts/`
- `src/components/StatusAssinatura.tsx` — belongs in `src/features/contracts/`
- `src/components/GerarAssinaturaZapSign.tsx` — belongs in `src/features/contracts/`
- `src/components/NovoAgendamentoForm.tsx` — belongs in `src/features/scheduling/`
- `src/components/DetalhesAgendamento.tsx` — belongs in `src/features/scheduling/`
- `src/components/GoogleCalendarConfig.tsx` — belongs in `src/features/scheduling/`
- `src/components/GoogleCalendarSync.tsx` — belongs in `src/features/scheduling/`
- `src/components/NovoUsuarioForm.tsx` — belongs in `src/features/users/`
- `src/components/EditarUsuarioForm.tsx` — belongs in `src/features/users/`
- `src/components/GerenciarPermissoesForm.tsx` — belongs in `src/features/users/`
- `src/components/CreateAdminUser.tsx` — belongs in `src/components/admin/`
- `src/components/DashboardMetrics.tsx` — belongs in `src/features/dashboard/`
- `src/components/PerformanceDashboard.tsx` — belongs in `src/features/dashboard/`
- `src/components/SecurityDashboard.tsx` — belongs in `src/features/settings/` or `src/features/audit/`
- `src/components/SystemHealthCheck.tsx` — belongs in `src/features/mission-control/`
- `src/components/SystemStatus.tsx` — belongs in `src/features/mission-control/`
- `src/components/billing/SubscriptionManager.tsx` — belongs in `src/features/billing/`
- `src/components/analytics/AnalyticsDashboard.tsx` — belongs in `src/features/reports/`
- `src/components/relatorios/` (entire directory) — belongs in `src/features/reports/`
- `src/components/configuracoes/` (entire directory) — belongs in `src/features/settings/sections/`
- `src/components/agenda/` — belongs in `src/features/scheduling/`
- `src/components/forms/LeadForm.tsx` — belongs in `src/features/leads/`

**Severity:** Warning
**Impact:** 45+ components are misplaced. Feature boundaries are blurred, making it unclear what a feature owns.
**Fix approach:** Move feature-specific components into their respective `src/features/{name}/components/` directories. Keep only truly shared/generic components in `src/components/` (ConfirmDialog, EmptyState, ErrorState, LoadingSpinner, PaginationControls, ErrorBoundary, Layout, Sidebar, TopBar, Breadcrumbs, GlobalSearch, CookieBanner).

**INFO: No circular dependency between features detected.**
Features import from `src/components/`, `src/hooks/`, `src/lib/`, and `src/contexts/` — never from other features. This is a healthy pattern.

---

## 2. Routing Architecture

**Current State:** All routes defined in `src/App.tsx` (lines 150-224). Every feature route uses `lazyWithRetry()` for code splitting. Routes inside the `<ProtectedRoute><Layout /></ProtectedRoute>` wrapper are auth-gated. Sentry wraps the router for navigation tracking.

### Issues Found

**WARNING: Several routes lack RBAC role restrictions.**
The following routes are accessible to any authenticated user (including `viewer` role) but may contain write operations that should be restricted:

| Route | Component | Concern |
|-------|-----------|---------|
| `/conexoes` | `ConexoesManager` | Manages WhatsApp connections — should require `admin`/`manager` |
| `/fluxos` | `FluxosManager` | Automation flows — has direct Supabase writes |
| `/regras` | `RegrasManager` | Automation rules — has direct Supabase writes |
| `/agentes` | `AgentesIAManager` | AI agent config — should require at least `user` with `execute` |
| `/base-conhecimento` | `BaseConhecimento` | AI knowledge base — upload capability |
| `/departamentos` | `DepartamentosManager` | Org structure — should require `admin`/`manager` |
| `/tags` | `TagsManager` | Tag management — low risk but write access |
| `/metricas` | `MetricasOperacionais` | Operational metrics — contains potentially sensitive data |

**Severity:** Warning (RBAC is enforced at DB level via RLS, but UI should hide unauthorized actions)
**Fix approach:** Add `requiredRoles` to routes that contain management operations. Alternatively, use `useRBAC().can()` inside components to hide write actions for unauthorized roles.

**INFO: Redirect routes are properly handled.**
Dead routes (`/leads`, `/timeline`, `/planos`, `/analytics`, `/billing`, `/administracao`, `/painel-prazos`, `/crm/followups`) all use `<Navigate to="..." replace />`. No orphan routes found.

**INFO: Lazy loading is comprehensive.**
All 37 feature routes use `lazyWithRetry()`. Critical paths (Auth, NotFound) are directly imported. Idle prefetching targets the 6 most-used routes (lines 76-85).

---

## 3. State Management

**Current State:** Single React Context (`AuthContext`) for auth state. All server state managed via TanStack React Query in `src/hooks/`. No Redux, Zustand, or other global state libraries.

### Issues Found

**CRITICAL: 14 hooks use useState+useEffect instead of React Query for server state.**
These hooks manually manage loading/error/data states, duplicating what React Query provides and losing benefits like caching, deduplication, background refetch, and stale-while-revalidate:

| Hook | File |
|------|------|
| `useActivityLogs` | `src/hooks/useActivityLogs.ts` |
| `useAgentTraining` | `src/hooks/useAgentTraining.ts` |
| `useAIAssistant` | `src/hooks/useAIAssistant.ts` |
| `useApiKeys` | `src/hooks/useApiKeys.ts` |
| `useCalendarEvents` | `src/hooks/useCalendarEvents.ts` |
| `useCRMActivities` | `src/hooks/useCRMActivities.ts` |
| `useCRMPipeline` | `src/hooks/useCRMPipeline.ts` |
| `useFollowUps` | `src/hooks/useFollowUps.ts` |
| `useGoogleCalendar` | `src/hooks/useGoogleCalendar.ts` |
| `useIntegracoesConfig` | `src/hooks/useIntegracoesConfig.ts` |
| `useLogsExecucao` | `src/hooks/useLogsExecucao.ts` |
| `useMultiAgentSystem` | `src/hooks/useMultiAgentSystem.ts` |
| `useNotifications` | `src/hooks/useNotifications.ts` |
| `useWhatsAppConversations` | `src/hooks/useWhatsAppConversations.ts` |

**Severity:** Critical (causes duplicate network requests, stale data, no cache sharing between components)
**Fix approach:** Migrate each hook to use `useQuery`/`useMutation` from `@tanstack/react-query`. Follow the pattern established in `src/hooks/useAgendamentos.ts` or `src/hooks/useLeads.ts`.

**WARNING: AuthContext passes a large object that triggers re-renders.**
`src/contexts/AuthContext.tsx` line 221 passes `{ user, session, profile, signIn, signUp, signOut, loading, hasRole, hasPermission }` as a single context value. Any change to `loading`, `user`, or `profile` re-renders all consumers. Functions like `signIn`, `signUp`, `signOut` are not memoized with `useCallback` (only `fetchProfile` is).

**Severity:** Warning
**Fix approach:** Split AuthContext into two contexts: `AuthStateContext` (user, session, profile, loading) and `AuthActionsContext` (signIn, signUp, signOut, hasRole, hasPermission). Memoize the actions object. This prevents re-renders in components that only need actions.

---

## 4. Data Flow Patterns

**Current State:** React Query handles server state in ~31 hooks. Direct Supabase client is used via `supabaseUntyped` for untyped access. Cache invalidation uses both `setQueryData` (optimistic) and `invalidateQueries` patterns. A generic `useOptimisticMutation` helper exists at `src/hooks/useOptimisticMutation.ts`.

### Issues Found

**WARNING: 52 direct Supabase calls in components/features outside hooks.**
The following files import `supabase` directly and make database calls inline instead of through hooks:

Feature components with direct Supabase access:
- `src/features/automations/FluxosManager.tsx`
- `src/features/automations/RegrasManager.tsx`
- `src/features/automations/RuleEditor.tsx`
- `src/features/conexoes/ConexoesManager.tsx`
- `src/features/conexoes/ConnectionDetailsDrawer.tsx`
- `src/features/conexoes/QRCodeWizard.tsx`
- `src/features/whatsapp/WhatsAppIA.tsx`
- `src/features/whatsapp/WhatsAppKapsoSetup.tsx`
- `src/features/reports/RelatoriosGerenciais.tsx`
- `src/features/crm/LeadDetailPanel.tsx`
- `src/features/processos/ProcessosManager.tsx`
- `src/features/processos/components/EncerrarProcessoDialog.tsx`
- `src/features/honorarios/HonorariosManager.tsx`
- `src/features/equipe/EquipeManager.tsx`
- `src/features/users/UsuariosManager.tsx`
- `src/features/contracts/ContratosManager.tsx`
- `src/features/prazos/components/PrazosCalendario.tsx`
- `src/features/ai-agents/EnhancedAIChat.tsx`
- `src/features/timeline/TimelineConversas.tsx`
- `src/features/mission-control/hooks/useRealtimeAgents.ts`

Shared components with direct Supabase access:
- `src/components/GlobalSearch.tsx`
- `src/components/OnboardingFlow.tsx`
- `src/components/ForgotPasswordDialog.tsx`
- `src/components/NovoContratoForm.tsx`
- `src/components/NovoAgendamentoForm.tsx`
- `src/components/NovoAgenteForm.tsx`
- `src/components/NovoUsuarioForm.tsx`
- `src/components/EditarUsuarioForm.tsx`
- `src/components/GerenciarPermissoesForm.tsx`
- `src/components/UploadContratos.tsx`
- `src/components/DetalhesContrato.tsx`
- `src/components/ApiKeysManager.tsx`
- `src/components/BackupRestore.tsx`
- `src/components/SystemHealthCheck.tsx`
- `src/components/SystemStatus.tsx`
- `src/components/GoogleCalendarConfig.tsx`
- `src/components/GerarAssinaturaZapSign.tsx`
- `src/components/TesteRealAgenteIA.tsx`
- `src/components/billing/SubscriptionManager.tsx`
- `src/components/analytics/AnalyticsDashboard.tsx`
- `src/components/configuracoes/LGPDPrivacySection.tsx`
- `src/components/configuracoes/UsuariosPermissoesSection.tsx`
- `src/components/configuracoes/EscritorioSection.tsx`
- `src/components/configuracoes/PerfilSection.tsx`
- `src/components/relatorios/RankingAgentesTable.tsx`
- `src/components/relatorios/ConversaoChart.tsx`
- `src/components/relatorios/hooks/useRelatoriosData.ts`
- `src/components/agenda/CalendarPanel.tsx`
- `src/components/agenda/QuickAddModal.tsx`
- `src/components/ai/AIAssistantChat.tsx`
- `src/components/PerformanceDashboard.tsx`
- `src/components/admin/adminUserService.ts`

**Severity:** Warning
**Impact:** Bypasses React Query cache, causes duplicate requests, makes data flow harder to trace.
**Fix approach:** Extract data access into dedicated hooks under `src/hooks/`. Components should only consume hooks, never import `supabase` directly.

**INFO: `select('*')` used in 34 queries across hooks.**
This fetches all columns when only a subset may be needed. Not a performance issue for small tables, but will matter at scale for tables like `leads` (which has 30+ columns).

**Severity:** Info
**Fix approach:** Replace `select('*')` with explicit column lists in high-volume queries (leads, agendamentos, contratos, whatsapp_messages).

---

## 5. Auth & RBAC Architecture

**Current State:**
- Authentication via Supabase Auth with JWT tokens
- Role stored in separate `user_roles` table (not in `profiles` — prevents privilege escalation)
- 4 roles: `admin`, `manager`, `user`, `viewer` defined in `src/types/rbac.ts`
- Client-side RBAC via `useRBAC()` hook at `src/hooks/useRBAC.ts`
- Route protection via `ProtectedRoute` at `src/components/ProtectedRoute.tsx`
- Department-scoped permissions via `departamento_membros` table
- 30-minute inactivity logout via `useInactivityLogout`
- Server-side protection via RLS policies in Supabase

### Issues Found

**WARNING: `hasPermission` in AuthContext is async but never awaited in practice.**
`src/contexts/AuthContext.tsx` lines 208-218: `hasPermission()` returns `Promise<boolean>` but performs a synchronous lookup in `ROLE_PERMISSIONS`. The async signature is misleading and complicates consumer code. Meanwhile, `useRBAC().can()` does the same thing synchronously.

**Severity:** Warning
**Fix approach:** Change `hasPermission` to return `boolean` (synchronous), matching `useRBAC().can()`. Or deprecate it in favor of `useRBAC().can()`.

**WARNING: `useRBAC.ts` line 8 uses `as any` cast for Supabase client.**
```typescript
const supabaseUntyped = supabase as any;
```
This bypasses type safety for the `departamento_membros` query. If the table schema changes, no compile-time error will be raised.

**Severity:** Warning
**Fix approach:** Add `departamento_membros` to the generated Supabase types, or use a typed RPC function.

**INFO: RBAC resource list is comprehensive.**
All 20 resources have permission entries for all 4 roles. The matrix in `src/types/rbac.ts` covers leads, contratos, agentes_ia, usuarios, configuracoes, relatorios, logs, integracoes, whatsapp, agendamentos, pipeline, processos, prazos, honorarios, documentos, conexoes, departamentos, tags, notificacoes, fluxos, regras.

**INFO: Missing resources in RBAC matrix.**
The following features exist but have no RBAC resource entry:
- `suporte` (tickets) — any user can create/read tickets
- `tarefas` — any user can CRUD tasks
- `equipe` — route-protected to admin/manager but no fine-grained permission
- `crm` (contacts table) — no resource-level control
- `mission-control` — admin-only route but no resource entry
- `audit` (audit trail) — route-protected but no resource entry

**Severity:** Info (low risk since RLS covers DB-level access)

---

## 6. Error Handling Architecture

**Current State:**
- Global `ErrorBoundary` wraps the entire app at `src/App.tsx` line 140
- Per-route `ErrorBoundary` wraps every feature route (lines 160-221)
- Custom `WhatsAppErrorBoundary` for WhatsApp feature at `src/features/whatsapp/WhatsAppErrorBoundary.tsx`
- Sentry integration captures all boundary errors
- `ErrorBoundary` at `src/components/ErrorBoundary.tsx` supports custom fallback, reset, and reload

### Issues Found

**INFO: Error boundary coverage is excellent.**
Every route component is wrapped in `<ErrorBoundary>`. The global boundary catches any escapes. Sentry receives component stack traces (line 41-50).

**WARNING: No error boundaries inside feature components.**
Large components like `FluxosManager` (515 lines), `WhatsAppIA` (911 lines), `RuleEditor` (914 lines), and `RelatoriosGerenciais` (809 lines) have no internal error boundaries. A crash in a sub-component brings down the entire page.

**Severity:** Warning
**Fix approach:** Add `<ErrorBoundary fallback={<ErrorState />}>` around major sub-sections in large components (e.g., around chart panels, data tables, and form dialogs).

---

## 7. Performance Architecture

**Current State:**
- Build output: **3.29 MB total JS** (gzipped ~800KB estimated)
- All routes lazy-loaded via `lazyWithRetry()` with automatic retry on chunk failure
- Idle prefetching for 6 most-used routes
- React Query with 5-minute stale time and 30-minute GC time
- Vite code splitting produces ~40 chunks

### Issues Found

**WARNING: Three chunks exceed 100KB (uncompressed).**

| Chunk | Size | Gzip | Concern |
|-------|------|------|---------|
| `FluxosManager` | 190.42 KB | 58.95 KB | `@xyflow/react` bundled into feature chunk |
| `AgentsPlayground` | 109.14 KB | 38.80 KB | Admin-only page, acceptable |
| `sentry` | 445.32 KB | 147.60 KB | Loaded with main bundle |
| `charts` (recharts) | 457.32 KB | 121.96 KB | Loaded when any chart is shown |
| `CalendarPanel` | 298.29 KB | 87.63 KB | FullCalendar is heavy |
| `index` (main) | 259.27 KB | 78.19 KB | Main bundle |

**Severity:** Warning
**Fix approach:**
1. Sentry: Use `lazyLoadIntegration()` to defer Sentry replay and profiling bundles.
2. FullCalendar (`CalendarPanel` 298KB): Already lazy-loaded, acceptable. Consider lighter alternative for simple views.
3. Recharts (`charts` 457KB): Already lazy-loaded, acceptable. The charts chunk is shared across multiple routes.

**INFO: Main bundle (`index`) at 259KB is reasonable.**
Contains React, React DOM, Radix primitives, Tailwind runtime, and React Router. No bloat detected.

**INFO: `dnd.esm` (97.8KB) is separately chunked.**
`@hello-pangea/dnd` is only loaded for Kanban views.

---

## 8. Database Architecture

**Current State:**
- 100 migrations in `supabase/migrations/`
- RLS enabled across tables (52 migrations reference RLS)
- Golden RLS migration: `supabase/migrations/20260221000001_rls_golden.sql`
- `tenant_id` column on all multi-tenant tables
- `get_current_tenant_id()` function for RLS policies
- Recent tables have proper indexes

### Issues Found

**WARNING: High migration count (100 files) with no squash.**
A `SQUASH_REFERENCE.md` exists in the migrations directory, suggesting awareness of the issue, but the 100 individual files remain. This slows local `db reset` and makes the schema hard to reason about.

**Severity:** Warning
**Fix approach:** Squash all migrations up to the current stable schema into a single baseline migration. Keep `SQUASH_REFERENCE.md` updated.

**INFO: Index coverage is good for recent tables.**
Tables created after 2026-03-17 have indexes on `tenant_id`, status columns, and foreign keys. Older tables may lack some indexes — verify via `pg_stat_user_indexes` in production.

**WARNING: `notificacoes` table queries lack pagination.**
`src/hooks/useNotifications.ts` line 50-55 fetches ALL active notifications for a tenant with no `.limit()` or `.range()`. As notification volume grows, this becomes a performance problem.

**Severity:** Warning
**Fix approach:** Add `.limit(50)` and implement cursor-based pagination or infinite scroll.

**WARNING: `agendamentos` query fetches all records without pagination.**
`src/hooks/useAgendamentos.ts` line 77-84 selects all agendamentos for a tenant. No pagination.

**Severity:** Warning
**Fix approach:** Add date-range filtering (e.g., only load next 30 days by default) and pagination.

---

## 9. Edge Function Architecture

**Current State:**
- 32 Edge Functions in `supabase/functions/`
- All use `Deno.serve()` native pattern
- 13 shared modules in `supabase/functions/_shared/`: cors, rate-limiter, security, supabase-client, logger, sentry, ai-model, embeddings, cache, kapso-client, legal-context, media-utils, agent-prompts
- CORS handled via `_shared/cors.ts` with origin whitelist + Vercel deployment regex

### Issues Found

**CRITICAL: 17 of 32 Edge Functions have NO rate limiting.**

Functions without rate limiting:
- `agent-orchestrator` — AI orchestration (expensive)
- `cleanup-agent-memory` — service-role protected but no rate limit
- `create-drive-folder` — creates Google Drive folders
- `create-portal-session` — Stripe portal session
- `data-retention-cleanup` — data deletion
- `decrypt-data` — decryption endpoint
- `encrypt-data` — encryption endpoint
- `extract-document-text` — text extraction
- `google-calendar` — Google Calendar API
- `health` — health check (acceptable)
- `ingest-document-from-file` — document ingestion
- `kapso-manager` — Kapso WhatsApp management
- `media-processor` — media processing
- `process-followup-queue` — follow-up processing
- `process-prazos-alerts` — deadline alerts
- `send-push-notification` — push notifications
- `stripe-webhook` — Stripe webhook (should have Stripe signature verification instead)

**Severity:** Critical for user-facing functions (`create-drive-folder`, `decrypt-data`, `encrypt-data`, `google-calendar`, `kapso-manager`). Info for cron/internal functions.
**Fix approach:** Add rate limiting using `_shared/rate-limiter.ts` to all user-facing functions. Cron/internal functions protected by service-role key are lower priority.

**WARNING: Rate limiting is imported via `_shared/security.ts` in only 1 function (`assistant`).**
The other 14 functions that have rate limiting import directly from `_shared/rate-limiter.ts`. The `_shared/security.ts` module wraps rate limiting with audit logging and PII redaction — a better pattern.

**Severity:** Warning
**Fix approach:** Standardize on importing from `_shared/security.ts` for consistent audit logging.

**INFO: 2 functions skip CORS headers (acceptable).**
- `cleanup-agent-memory` — internal cron, no browser access
- `stripe-webhook` — external webhook, Stripe signature verification instead of CORS

---

## 10. Scalability Concerns

### Missing Pagination

**WARNING: Several hooks fetch all records without pagination.**

| Hook | File | Table | Risk |
|------|------|-------|------|
| `useAgendamentos` | `src/hooks/useAgendamentos.ts` | `agendamentos` | Grows linearly with appointments |
| `useNotifications` | `src/hooks/useNotifications.ts` | `notificacoes` | Grows rapidly with activity |
| `useAgentesIA` | `src/hooks/useAgentesIA.ts` | `agentes_ia` | Low risk (few agents per tenant) |
| `useTags` | `src/hooks/useTags.ts` | `tags` | Low risk (bounded) |
| `useStatusManager` | `src/hooks/useStatusManager.ts` | Status config | Low risk (bounded) |
| `useSystemSettings` | `src/hooks/useSystemSettings.ts` | Settings | Low risk (bounded) |
| `useNotificationTemplates` | `src/hooks/useNotificationTemplates.ts` | Templates | Low risk (bounded) |
| `useApiKeys` | `src/hooks/useApiKeys.ts` | API keys | Low risk (bounded) |

**Severity:** Warning for `useAgendamentos` and `useNotifications`. Info for bounded tables.

### select('*') on Large Tables

**WARNING: 34 queries use `select('*')` instead of explicit column lists.**
For tables with many columns (e.g., `leads` has 30+ fields), this transfers unnecessary data. The `useRBAC` hook fetches `departamento_membros.*` on every render for every authenticated user.

**Severity:** Warning
**Fix approach:** Replace `select('*')` with explicit column lists in high-frequency queries. Priority: `useRBAC.ts` (runs on every page), `useLeads.ts`, `useWhatsAppConversations.ts`.

### Realtime Channel Scaling

**INFO: `useRealtimeSync` at `src/hooks/useRealtimeSync.ts` subscribes to 5 tables per tenant.**
Each authenticated user opens one Supabase Realtime channel with 5 table subscriptions. This is within Supabase limits for moderate user counts but should be monitored.

### N+1 Query Patterns

**INFO: No N+1 patterns detected in hooks.**
Hooks use Supabase's PostgREST joins or fetch complete datasets. The `useLeads` hook uses server-side pagination with `.range()`.

---

## Summary

### Critical Issues (2)
1. **14 hooks use useState instead of React Query** — causes stale data, duplicate requests, no caching
2. **17 Edge Functions lack rate limiting** — DoS vulnerability on user-facing endpoints

### Warnings (8)
1. **45+ components misplaced** in `src/components/` instead of feature directories
2. **8 routes lack RBAC restrictions** on management operations
3. **52 direct Supabase calls in components** bypass hook/cache layer
4. **AuthContext causes unnecessary re-renders** — large monolithic context value
5. **`hasPermission` async signature is misleading** — performs synchronous lookup
6. **100 unsquashed migrations** slow local development
7. **`useNotifications` and `useAgendamentos`** fetch all records without pagination
8. **No internal error boundaries** in large components (500-900+ lines)

### Info (6)
1. Lazy loading is comprehensive with retry logic
2. Error boundary coverage at route level is excellent
3. RBAC resource matrix covers 20 resources across 4 roles
4. No circular dependencies between features
5. Build size (3.29 MB / ~800KB gzip) is within budget
6. No N+1 query patterns detected

---

*Architecture audit: 2026-03-29*

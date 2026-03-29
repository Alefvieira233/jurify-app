# Quality Audit

**Analysis Date:** 2026-03-29

---

## 1. Files Over 300 Lines (Should Be Split)

| File | Lines | Severity | Notes |
|------|-------|----------|-------|
| `src/integrations/supabase/types.ts` | 2453 | warning | Auto-generated — do not split; regenerate from schema |
| `src/contexts/__tests__/AuthContext.test.tsx` | 979 | info | Test file; acceptable if well-organized |
| `src/features/automations/RuleEditor.tsx` | 914 | **critical** | God component — form, validation, preview, and rule logic all in one |
| `src/features/whatsapp/WhatsAppIA.tsx` | 911 | **critical** | God component — chat UI, AI config, session management, file upload |
| `src/features/reports/RelatoriosGerenciais.tsx` | 809 | **critical** | Mixes data fetching, chart rendering, filter logic, and export |
| `src/components/ui/sidebar.tsx` | 762 | warning | shadcn/ui generated; low priority to split |
| `src/tests/legal-modules.test.ts` | 751 | info | Test file; acceptable |
| `src/features/conexoes/ConnectionDetailsDrawer.tsx` | 737 | **critical** | Too many connection-type branches in one component |
| `src/features/settings/IntegracoesConfig.tsx` | 676 | **critical** | All integration UIs in one component; split by integration |
| `src/features/whatsapp/WhatsAppKapsoSetup.tsx` | 661 | **critical** | Setup flow + state machine + API calls all inline |
| `src/lib/multiagents/core/BaseAgent.ts` | 640 | warning | Core lib — review for extraction of prompt-building logic |
| `src/components/forms/LeadForm.tsx` | 609 | **critical** | Monolithic form; split into field sections + submit logic |
| `src/features/automations/FlowEditor.tsx` | 605 | **critical** | Node editor + sidebar + toolbar + execution logic |
| `src/hooks/useAgendaAutomation.ts` | 548 | **critical** | Hook doing too much — split by concern (see section 9) |
| `src/pages/AgentsPlayground.tsx` | 540 | **critical** | Page acting as feature shell + orchestration logic |
| `src/components/UploadContratos.tsx` | 537 | warning | Upload + preview + processing in one component |
| `src/tests/integration/whatsapp-webhook.test.ts` | 534 | info | Integration test file |
| `src/features/crm/CRMDashboard.tsx` | 518 | **critical** | Dashboard with pipeline, stats, filters, and modals inline |
| `src/features/automations/FluxosManager.tsx` | 515 | **critical** | Flow list + CRUD + editor launcher in one file |
| `src/pages/Auth.tsx` | 506 | warning | Login + signup + reset + magic link — consider splitting tabs to sub-components |
| `src/hooks/useLeads.ts` | 506 | **critical** | Hook doing too much (see section 9) |
| `src/features/processos/ProcessosManager.tsx` | 504 | **critical** | Legal case manager mixing list, detail panel, filters, and actions |
| `src/features/automations/RegrasManager.tsx` | 496 | warning | Similar structure to FluxosManager — consider shared list pattern |
| `src/features/contracts/ContratosManager.tsx` | 492 | warning | Contract list + status machine + signing flow |
| `src/components/TesteRealAgenteIA.tsx` | 491 | **critical** | Test/debug component in production source tree |
| `src/hooks/useWhatsAppConversations.ts` | 490 | warning | Large hook — check for extraction opportunities |
| `src/features/reports/MetricasOperacionais.tsx` | 479 | warning | Similar to RelatoriosGerenciais — both need chart/data split |
| `src/components/billing/SubscriptionManager.tsx` | 478 | warning | Billing UI + plan comparison + payment flow mixed |
| `src/components/ai/AIAssistantChat.tsx` | 459 | warning | Chat UI + context management + prompt config |
| `src/components/agenda/CalendarPanel.tsx` | 454 | warning | Calendar + event form + availability logic |
| `src/hooks/useGoogleCalendar.ts` | 447 | warning | OAuth + CRUD + conflict detection in one hook |
| `src/components/ApiKeysManager.tsx` | 445 | warning | Key generation + rotation + revocation + display |
| `src/features/mission-control/hooks/useRealtimeAgents.ts` | 428 | warning | Realtime subscription + state derivation + side effects |
| `src/features/crm/FollowUpSequenceEditor.tsx` | 427 | warning | Sequence builder mixed with step templates |
| `src/features/mission-control/MissionControl.tsx` | 425 | warning | Orchestration page mixing agent grid + logs + controls |

**Recommended action for all critical files:** Extract data-fetching to custom hooks, extract sub-sections to sub-components, keep manager/page components under 200 lines.

---

## 2. Duplicated Code Patterns

### Pattern A: Local `supabase as any` cast instead of canonical import

A canonical `supabaseUntyped` export exists at `src/integrations/supabase/client.ts:51`. Many files correctly import it, but 12 hooks/components create their own local `as any` cast instead, bypassing the single source of truth.

**Files with redundant local casts (should use canonical import):**
- `src/hooks/useConexoes.ts:8` — `const supabaseUntyped = supabase as any`
- `src/hooks/useDepartamentos.ts:8` — `const db = supabase as any`
- `src/hooks/useLeadHistorico.ts:6` — `const db = supabase as any`
- `src/hooks/useLeadNotas.ts:8` — `const db = supabase as any`
- `src/hooks/useLeadTagsBatch.ts:7` — `const db = supabase as any`
- `src/hooks/useRBAC.ts:8` — `const supabaseUntyped = supabase as any`
- `src/hooks/useTags.ts:8` — `const db = supabase as any`
- `src/hooks/useTeamMembers.ts:7` — `const db = supabase as any`
- `src/components/OnboardingFlow.tsx:13` — `const db = supabase as any`
- `src/features/equipe/EquipeManager.tsx:19` — `const db = supabase as any`
- `src/features/conexoes/ConnectionDetailsDrawer.tsx:23` — `const supabaseUntyped = supabase as any`
- `src/features/whatsapp/WhatsAppKapsoSetup.tsx:30` — `const supabaseUntyped = supabase as any`

**Files correctly using canonical import:** 80+ files import `supabaseUntyped` from `@/integrations/supabase/client`.

**Severity:** critical
**Fix:** Replace all local casts with `import { supabaseUntyped as supabase } from '@/integrations/supabase/client'`. Long-term: regenerate `types.ts` with `supabase gen types typescript` to eliminate the need for `supabaseUntyped` entirely.

### Pattern B: Two logger implementations

| File | Pattern | Consumers |
|------|---------|-----------|
| `src/lib/logger.ts` | Factory `createLogger(module)` returning scoped logger. Level-gated via `import.meta.env.PROD`. No remote transport. | 80+ files across hooks, components, lib |
| `src/utils/logger.ts` | Singleton `logger` instance. Level-gated via env vars. Has remote transport (`sendToRemote`). Emoji prefixes. | 0 production files (only its own test) |

`src/utils/logger.ts` is effectively dead code. No production file imports it. The only consumer is its own test file `src/utils/__tests__/logger.test.ts`.

**Severity:** warning
**Fix:** Delete `src/utils/logger.ts` and `src/utils/__tests__/logger.test.ts`. If remote logging is needed in the future, add a transport to `src/lib/logger.ts`.

### Pattern C: Two monitoring implementations

| File | Pattern | Consumers |
|------|---------|-----------|
| `src/lib/monitoring.ts` | `MonitoringService` with `captureError`, `trackMetric`, `trackAction`. Provides `useMonitoring()` hook and `withErrorTracking()` wrapper. Sends to Sentry via dynamic import. | `src/hooks/useAgendaAutomation.ts` (1 consumer) |
| `src/utils/monitoring.ts` | `MonitoringService` with `trackLeadConversion`, `trackContractSigned`, `trackAIAgentExecution`, `trackUserAction`, `trackError`, `checkSystemHealth`. Business-specific methods. Sends to Sentry via direct import. | `src/features/ai-agents/AgentesIAManager.tsx` (1 consumer) |

Both have overlapping error-tracking and metric-tracking functionality but different APIs. Each has exactly 1 production consumer.

**Severity:** warning
**Fix:** Merge into `src/lib/monitoring.ts`. Port business-specific tracking methods (`trackLeadConversion`, etc.) from `src/utils/monitoring.ts`. Delete `src/utils/monitoring.ts`.

### Pattern D: Repeated Supabase query-then-toast pattern

Nearly every hook in `src/hooks/` follows an identical pattern:
```typescript
const { data, error } = await supabaseUntyped.from('table').select('*')...;
if (error) throw error;
// ... then in mutation onSuccess:
toast({ title: 'Sucesso', ... });
// ... and onError:
toast({ title: 'Erro', variant: 'destructive' });
```

This pattern is repeated across 21 hook files with 59 `useMutation` calls and 26 `useQuery` calls, each duplicating error toast logic.

**Severity:** info (minor duplication, not a bug)
**Fix:** The generic `useEntityCRUD` hook at `src/hooks/useEntityCRUD.ts` already abstracts this pattern. Migrate remaining hooks to use it or a similar shared mutation wrapper that handles toast notifications centrally.

### Pattern E: Duplicate admin-create-user calls

Both files call the same `admin-create-user` Edge Function with identical patterns:
- `src/components/NovoUsuarioForm.tsx:41`
- `src/components/admin/adminUserService.ts:8`

**Severity:** info
**Fix:** `NovoUsuarioForm` should call `adminUserService.createAdmin()` instead of invoking the edge function directly.

---

## 3. Console.log in Production Code

### Legitimate (logger/monitoring infrastructure -- acceptable)
- `src/lib/logger.ts` — wraps `console.*` by design
- `src/utils/logger.ts` — wraps `console.*` by design (dead code; see section 2B)
- `src/lib/monitoring.ts` — wraps `console.*` by design
- `src/utils/monitoring.ts` — wraps `console.*` by design
- `src/lib/sentry.ts` — conditional `console.log` for dev mode and missing DSN warnings
- `src/integrations/supabase/mock.ts` — test mock; acceptable

### Should be replaced with logger calls

| File | Line | Statement | Severity |
|------|------|-----------|----------|
| `src/features/automations/FluxosManager.tsx` | 298 | `console.error('Erro ao salvar fluxo:', err)` | warning |
| `src/features/whatsapp/WhatsAppKapsoSetup.tsx` | 104 | `console.log(...)` debug trace | warning |
| `src/features/whatsapp/WhatsAppKapsoSetup.tsx` | 113 | `console.log(...)` response trace | warning |
| `src/features/whatsapp/WhatsAppKapsoSetup.tsx` | 125 | `console.error(...)` timeout | warning |
| `src/features/whatsapp/WhatsAppKapsoSetup.tsx` | 176 | `console.warn(...)` state stuck | warning |

**Total stray console calls in production code:** 5 (outside of logger/monitoring/mock infrastructure).

**Status:** Mostly clean. The 5 remaining calls are all in `FluxosManager` and `WhatsAppKapsoSetup`.

**Fix:** Replace with `createLogger('FluxosManager')` / `createLogger('WhatsAppKapso')` calls. `WhatsAppKapsoSetup` already imports `createLogger` but uses `console.*` directly in some paths.

---

## 4. TypeScript `any` Usage

### Critical -- Supabase untyped casts

All `supabase as any` / `supabaseUntyped` usage bypasses the entire Supabase type system. Queries through these aliases return `any`, silencing all type errors on column names, filter values, and return shapes.

**Scale:** ~92 files total use either the canonical `supabaseUntyped` import (80+) or local `as any` casts (12). This means the vast majority of Supabase queries in the app are untyped.

**Root cause:** The auto-generated `src/integrations/supabase/types.ts` does not include all database tables. Tables added after the last type generation (agent_memories, workflow_queue, conexoes, departamentos, lead_historico, lead_notas, lead_tags_batch, rbac tables, tags, team_members, onboarding, tarefas, tickets_suporte, status_pipeline, etc.) require untyped access.

**Severity:** critical
**Fix:** Run `supabase gen types typescript --project-id yfxgncbopvnsltjqetxw > src/integrations/supabase/types.ts` to regenerate types including all current tables. Then progressively replace `supabaseUntyped` imports with typed `supabase` client. This is a single command that eliminates the #1 type-safety issue in the entire codebase.

### Non-Supabase `any` in production code

| File | Line | Usage | Severity |
|------|------|-------|----------|
| `src/components/analytics/AnalyticsDashboard.tsx` | 99 | `(query: any)` parameter | warning |
| `src/features/automations/FluxosManager.tsx` | 259 | `n.data as any` node data cast | warning |

### `any` in test files (acceptable)

| File | Count | Context |
|------|-------|---------|
| `src/tests/setup.ts` | 2 | Mock setup objects |
| `src/contexts/__tests__/AuthContext.test.tsx` | 16 | Mock Supabase responses |
| `src/components/__tests__/ProtectedRoute.test.tsx` | 7 | Mock auth context |
| `src/features/tarefas/__tests__/TarefasPage.test.tsx` | 3 | Mock hook returns |
| `src/features/ai-agents/__tests__/AgentesIAManager.test.tsx` | 3 | Mock props |

**Total non-test `any` (excluding Supabase casts):** 2 instances.

**Fix for AnalyticsDashboard:** Type `query` as the appropriate Supabase `PostgrestFilterBuilder` or define a `VisibilityFilter` interface. For `FluxosManager`, define a `FlowNodeData` interface for node data.

---

## 5. TODO / FIXME / HACK Comments

Full scan of all `.ts` and `.tsx` files in `src/` found **zero** `TODO`, `FIXME`, or `HACK` code markers.

All matches were false positives:
- `XXX` in `src/lib/security/SanitizerEngine.ts` -- CPF/CNPJ format documentation strings (`XXX.XXX.XXX-XX`)
- `XXX` in `src/lib/multiagents/agents/CommercialAgent.ts` -- currency format template strings (`R$ X.XXX,XX`)
- `XXX` in `src/lib/multiagents/agents/QualifierAgent.ts` -- methodology heading in prompt template
- `XXX` in `src/lib/multiagents/agents/AdvancedReasoningAgent.ts` -- methodology heading
- `XXX` in `src/lib/legal/TrustEngine.ts` -- regex pattern comment

**Status:** Clean. No actionable code markers found.

---

## 6. Error Handling Gaps

### 6.1 Edge Function calls with ignored error returns

Systematic scan of all 48 `supabase.functions.invoke()` callsites in `src/`:

**Properly handled (destructure `error` and check it):** 38 callsites

**Error return silently ignored:**

| File | Line | Function Called | Issue |
|------|------|-----------------|-------|
| `src/features/conexoes/ConnectionDetailsDrawer.tsx` | 189 | `kapso-manager` (logout) | `await` without destructuring error. Falls through to success toast regardless. |
| `src/features/conexoes/ConnectionDetailsDrawer.tsx` | 222 | `kapso-manager` (delete) | `await` without checking error before proceeding to local DB delete. |
| `src/features/conexoes/ConexoesManager.tsx` | 109 | `kapso-manager` (delete) | Same pattern -- no error check before local state cleanup. |
| `src/features/conexoes/QRCodeWizard.tsx` | 115 | `kapso-manager` (status) | Uses `statusRes.data?.connected` but does not check `statusRes.error`. |
| `src/features/conexoes/QRCodeWizard.tsx` | 124 | `kapso-manager` (qrcode) | Uses `qrRes.data?.qrcode` but does not check `qrRes.error`. |
| `src/components/agenda/CalendarPanel.tsx` | 270 | `google-calendar` | `await` inside try/catch, but error is only logged, not surfaced to user. |
| `src/utils/systemValidator.ts` | 160 | `health-check` | Checks `data?.status` but does not destructure `error` tuple. Works because it falls through to false on any failure, but is fragile. |

**Severity:** warning (3 kapso deletes/logouts could leave stale data if the remote call fails silently)

**Fix:** For all kapso-manager calls, destructure `{ error }` and surface failures via toast. For `CalendarPanel`, add `toast.error()` after logging. For `systemValidator`, destructure `{ data, error }` explicitly.

### 6.2 `console.error` without user-facing feedback

| File | Line | Context |
|------|------|---------|
| `src/features/automations/FluxosManager.tsx` | 298 | `console.error` on save failure without toast |
| `src/features/whatsapp/WhatsAppKapsoSetup.tsx` | 125 | `console.error` on timeout without error state transition |
| `src/features/whatsapp/WhatsAppKapsoSetup.tsx` | 176 | `console.warn` on stuck state without user notification |

**Severity:** warning
**Fix:** Add `toast.error()` or set error state after each `console.error`/`console.warn`.

### 6.3 ErrorBoundary coverage

Only 2 ErrorBoundary components exist:
- `src/components/ErrorBoundary.tsx` -- wraps the entire app in `src/App.tsx`
- `src/features/whatsapp/WhatsAppErrorBoundary.tsx` -- wraps WhatsApp feature

**No feature-level ErrorBoundaries exist for:**
- Automations (RuleEditor, FlowEditor -- complex UIs prone to crashes)
- Reports (chart rendering failures)
- Mission Control (realtime subscription errors)
- CRM Dashboard (complex drag-and-drop)

**Severity:** warning
**Fix:** Add ErrorBoundary wrappers around each lazy-loaded feature route in the router config. This prevents a crash in one feature from taking down the entire app.

---

## 7. Dead Code / Unused Exports

### 7.1 `src/utils/logger.ts` -- zero production consumers

No production file imports from `@/utils/logger`. The only consumer is its own test at `src/utils/__tests__/logger.test.ts`. The entire codebase uses `createLogger` from `@/lib/logger.ts` instead.

**Severity:** warning
**Fix:** Delete `src/utils/logger.ts` and `src/utils/__tests__/logger.test.ts`.

### 7.2 `src/utils/monitoring.ts` -- 1 production consumer

Only `src/features/ai-agents/AgentesIAManager.tsx` imports from `@/utils/monitoring`. The overlapping `src/lib/monitoring.ts` also has only 1 consumer (`src/hooks/useAgendaAutomation.ts`).

**Severity:** info
**Fix:** Consolidate into one file (see section 2C).

### 7.3 `src/components/TesteRealAgenteIA.tsx` -- debug component in production tree

This 491-line component IS reachable: it is imported by `src/components/configuracoes/SistemaSection.tsx:10` and rendered inside the Settings > Sistema tab. It invokes `n8n-webhook-forwarder` edge function for testing AI agents.

**Severity:** critical
**Fix:** This is a developer/admin testing tool exposed to all users who can access Settings. Either:
1. Gate it behind an `admin`-only role check, or
2. Move it to a dedicated `/admin/agent-test` route behind RBAC, or
3. Remove it from the production UI and keep it as a standalone dev tool.

### 7.4 `rrule` and `@types/rrule` -- unused dependencies

Both `rrule` (^2.8.1) and `@types/rrule` (^2.1.7) are listed in `dependencies` but no file in `src/` or `supabase/functions/` imports from `rrule`.

**Severity:** info
**Fix:** Remove both from `package.json`.

### 7.5 `@types/rrule` in wrong section

Even if `rrule` were used, `@types/rrule` is a type package that belongs in `devDependencies`, not `dependencies`.

**Severity:** info

### 7.6 Potential dead exports requiring tool-based analysis

A full dead-export scan requires `npx ts-prune` or bundler tree-shaking report. The following utilities export many named functions, some of which may be unused:

- `src/utils/validation.ts` -- 9 named exports
- `src/utils/encryption.ts` -- 8 named exports
- `src/utils/formatting.ts` -- 18 named exports
- `src/utils/seoConfig.ts` -- 4 named exports

**Recommended action:** Run `npx ts-prune` to identify specific unused exports.

---

## 8. God Components

The following components have too many responsibilities:

| Component | File | Lines | Responsibilities | Severity |
|-----------|------|-------|------------------|----------|
| `RuleEditor` | `src/features/automations/RuleEditor.tsx` | 914 | Rule form, condition builder, action builder, preview, validation, save | critical |
| `WhatsAppIA` | `src/features/whatsapp/WhatsAppIA.tsx` | 911 | Chat UI, AI config, session state, file upload, conversation history | critical |
| `RelatoriosGerenciais` | `src/features/reports/RelatoriosGerenciais.tsx` | 809 | Data fetching, 6+ chart types, filter state, date ranges, CSV export | critical |
| `ConnectionDetailsDrawer` | `src/features/conexoes/ConnectionDetailsDrawer.tsx` | 737 | Branches for 5+ connection types, config forms, status polling, action buttons | critical |
| `IntegracoesConfig` | `src/features/settings/IntegracoesConfig.tsx` | 676 | WhatsApp, Google Calendar, Stripe, ZapSign, Postmark config UIs all inline | critical |
| `WhatsAppKapsoSetup` | `src/features/whatsapp/WhatsAppKapsoSetup.tsx` | 661 | Multi-step setup wizard + QR polling + state machine + API calls | critical |
| `LeadForm` | `src/components/forms/LeadForm.tsx` | 609 | Personal info, contact, tags, source, notes, assignment, validation | critical |
| `FlowEditor` | `src/features/automations/FlowEditor.tsx` | 605 | Canvas, node sidebar, toolbar, properties panel, undo/redo, execution | critical |
| `CRMDashboard` | `src/features/crm/CRMDashboard.tsx` | 518 | Pipeline board, stats cards, filters, modals, drag-and-drop, search | critical |
| `FluxosManager` | `src/features/automations/FluxosManager.tsx` | 515 | Flow list, CRUD operations, flow runner, status display, error handling | critical |
| `ProcessosManager` | `src/features/processos/ProcessosManager.tsx` | 504 | Case list, detail panel, document links, deadline view, status updates | critical |

**Recommended refactor pattern for all:**
1. Extract data fetching into a dedicated `use[Feature]Data` hook
2. Extract each major UI section into a named sub-component
3. Keep the Manager/Dashboard component as an orchestrator under 150 lines
4. Co-locate sub-components in a `components/` subdirectory next to the manager

---

## 9. Hooks With Too Many Responsibilities

| Hook | File | Lines | Concerns Mixed | Severity |
|------|------|-------|----------------|----------|
| `useAgendaAutomation` | `src/hooks/useAgendaAutomation.ts` | 548 | Scheduling CRUD, automation triggers, conflict detection, notification dispatch | critical |
| `useLeads` | `src/hooks/useLeads.ts` | 506 | Lead CRUD, pipeline stage management, tag operations, history tracking, notifications | critical |
| `useWhatsAppConversations` | `src/hooks/useWhatsAppConversations.ts` | 490 | Conversation list, message CRUD, realtime subscription, file upload, contact sync | warning |
| `useGoogleCalendar` | `src/hooks/useGoogleCalendar.ts` | 447 | OAuth flow, event CRUD, availability check, conflict resolution | warning |
| `useRealtimeAgents` | `src/features/mission-control/hooks/useRealtimeAgents.ts` | 428 | Realtime subscription, agent state derivation, heartbeat monitoring, action dispatch | warning |

**Recommended action for critical hooks:**

`useLeads.ts` -- split into:
- `useLeadsCRUD` -- create/read/update/delete
- `useLeadsPipeline` -- stage transitions
- `useLeadsTags` -- tag assignment (already partially in `useLeadTagsBatch.ts`)
- `useLeadsNotifications` -- notification side effects

`useAgendaAutomation.ts` -- split into:
- `useAgendamentos` -- CRUD (already exists at `src/hooks/useAgendamentos.ts`)
- `useAgendaConflicts` -- conflict detection
- `useAgendaAutomations` -- trigger logic (email, WhatsApp, Drive folder)

---

## 10. Test Coverage Gaps

### Features WITH test files

| Feature | Test Location | Coverage Level |
|---------|--------------|----------------|
| Auth | `src/contexts/__tests__/AuthContext.test.tsx` | Comprehensive (979 lines) |
| WhatsApp webhook | `src/tests/integration/whatsapp-webhook.test.ts` | Integration test |
| WhatsApp Kapso setup | `src/features/whatsapp/__tests__/WhatsAppKapsoSetup.test.tsx` | Component test |
| Legal modules | `src/tests/legal-modules.test.ts` | Integration test |
| RBAC | `src/tests/security/rbac.test.tsx`, `src/hooks/__tests__/useRBAC.test.ts`, `src/tests/integration/rbac-database.test.ts` | Multi-level |
| ProtectedRoute | `src/components/__tests__/ProtectedRoute.test.tsx` | Component test |
| ErrorBoundary | `src/components/__tests__/ErrorBoundary.test.tsx` | Component test |
| Scheduling | `src/features/scheduling/__tests__/AgendamentosManager.test.tsx` | Component test |
| AI Agents | `src/features/ai-agents/__tests__/AgentesIAManager.test.tsx` | Component test |
| CRM Dashboard | `src/features/crm/__tests__/CRMDashboard.test.tsx` | Component test |
| Pipeline | `src/features/pipeline/__tests__/PipelineJuridico.test.tsx` | Component test |
| Home | `src/features/home/__tests__/HomePage.test.tsx` | Component test |
| Dashboard | `src/features/dashboard/__tests__/Dashboard.test.tsx` | Component test |
| Conexoes | `src/features/conexoes/__tests__/ConexoesManager.test.tsx`, `ConnectionDetailsDrawer.test.tsx` | Component tests |
| Suporte | `src/features/suporte/__tests__/SuportePage.test.tsx` | Component test |
| Tarefas | `src/features/tarefas/__tests__/TarefasPage.test.tsx` | Component test |
| Settings (StatusManager) | `src/features/settings/sections/__tests__/StatusManager.test.tsx` | Component test |
| Billing (SubscriptionManager) | `src/components/billing/__tests__/SubscriptionManager.test.tsx` | Component test |
| Golden Path | `src/tests/GoldenPath.test.tsx` | Smoke test |
| Agents integration | `src/tests/AgentsIntegration.test.ts` | Integration test |
| ZapSign | `src/tests/integration/zapsign-integration.test.ts` | Integration test |
| Stripe | `src/tests/integration/stripe-webhook.test.ts` | Integration test |
| IA Juridica | `src/tests/integration/ia-juridica.test.ts` | Integration test |

### Hooks with dedicated tests (43 hook test files)

All major hooks have test files in `src/hooks/__tests__/`, including: `useLeads`, `useProcessos`, `usePrazosProcessuais`, `useHonorarios`, `useDocumentosJuridicos`, `useContratos`, `useAgendaAutomation`, `useWhatsAppConversations`, `useGoogleCalendar`, `useAgentesIA`, `useNotifications`, `useCRMPipeline`, `useRBAC`, `useTags`, and 29 more.

### Features WITHOUT any test files

| Feature | Directory | Risk Level | Notes |
|---------|-----------|------------|-------|
| Automations | `src/features/automations/` | **high** | RuleEditor (914 lines), FlowEditor (605 lines), FluxosManager (515 lines) -- complex UIs with no tests |
| Reports | `src/features/reports/` | medium | RelatoriosGerenciais (809 lines) -- data visualization, hard to break silently |
| Mission Control | `src/features/mission-control/` | medium | Realtime agent monitoring |
| Equipe | `src/features/equipe/` | low | Team management |
| Departamentos | `src/features/departamentos/` | low | Department management |
| Contatos | `src/features/contatos/` | low | Contact table (mostly uses shared hooks) |
| Contracts | `src/features/contracts/` | medium | ContratosManager (492 lines) -- contract lifecycle |
| Leads | `src/features/leads/` | low | LeadsPanel -- thin wrapper; hook is tested |
| Logs | `src/features/logs/` | low | Read-only log viewer |
| Tags | `src/features/tags/` | low | Tag management UI |
| Timeline | `src/features/timeline/` | low | Conversation timeline display |
| Users | `src/features/users/` | low | User management |
| Notifications | `src/features/notifications/` | low | Notification panel |
| Audit | `src/features/audit/` | low | Audit log viewer |

### Components without test files

| Component | File | Risk Level |
|-----------|------|------------|
| AI Assistant Chat | `src/components/ai/AIAssistantChat.tsx` (459 lines) | medium |
| Calendar Panel | `src/components/agenda/CalendarPanel.tsx` (454 lines) | medium |
| ApiKeysManager | `src/components/ApiKeysManager.tsx` (445 lines) | medium |
| LeadForm | `src/components/forms/LeadForm.tsx` (609 lines) | **high** |
| TesteRealAgenteIA | `src/components/TesteRealAgenteIA.tsx` (491 lines) | low (should be deleted/gated) |

### Priority order for adding tests

1. `src/features/automations/` -- RuleEditor + FlowEditor + FluxosManager have 2034 combined lines with zero tests. Automation bugs cause silent data corruption.
2. `src/components/forms/LeadForm.tsx` -- 609-line form handling the primary data entry point. Validation bugs = bad data in the system.
3. `src/features/contracts/ContratosManager.tsx` -- Contract lifecycle with signing flow. Legal/financial implications.
4. `src/features/reports/RelatoriosGerenciais.tsx` -- 809 lines of data visualization. Wrong numbers in reports erode trust.
5. `src/components/ai/AIAssistantChat.tsx` -- AI chat with edge function calls. Error handling critical for UX.

---

## 11. Dependency Health

### Dependencies in wrong section

| Package | Current Section | Should Be | Reason |
|---------|----------------|-----------|--------|
| `@types/rrule` (^2.1.7) | dependencies | devDependencies (or removed) | Type-only package; `rrule` is not imported anywhere |
| `openai` (^6.25.0) | devDependencies | correct | Only used in test mocks |

### Unused dependencies

| Package | Version | Evidence |
|---------|---------|----------|
| `rrule` | ^2.8.1 | No import found in `src/` or `supabase/functions/` |
| `@types/rrule` | ^2.1.7 | No import of `rrule` anywhere |

### Heavy dependencies worth monitoring

| Package | Version | Bundle Impact | Notes |
|---------|---------|---------------|-------|
| `recharts` | ^2.12.7 | Large | Used in reports/dashboard. Lazy-loaded via `RelatoriosGerenciais`. |
| `@xyflow/react` | ^12.10.1 | Large | Used only in FlowEditor. Should be lazy-loaded. |
| `@fullcalendar/*` | ^6.1.20 (6 packages) | Large | Calendar feature. Already in lazy-loaded route. |
| `@sentry/react` | ^10.32.0 | Medium | Error monitoring. Loaded at startup. |
| `@capacitor/*` | ^8.x (16 packages) | N/A at build | Mobile platform packages. Tree-shaken in web build, but clutter `node_modules`. |

### Capacitor packages (16 total)

The project includes 16 `@capacitor/*` packages for mobile app support. These are legitimate but represent a large maintenance surface. Verify mobile build is still active; if not, consider removing to reduce dependency count.

### Lock file

`package-lock.json` is present and committed. No `yarn.lock` or `pnpm-lock.yaml` conflicts.

---

## Priority Summary

| Priority | Issue | Files | Effort |
|----------|-------|-------|--------|
| P0 -- Quick win | Regenerate Supabase types to eliminate 92-file `supabaseUntyped` usage | Run `supabase gen types typescript` | 1 hour |
| P0 -- Quick win | Replace 12 local `as any` casts with canonical import | 12 files listed in section 2A | 30 min |
| P1 -- Fix now | Gate `TesteRealAgenteIA.tsx` behind admin role or remove from settings UI | `src/components/configuracoes/SistemaSection.tsx` | 15 min |
| P1 -- Fix now | Handle ignored Edge Function errors in conexoes delete/logout | `ConnectionDetailsDrawer.tsx`, `ConexoesManager.tsx`, `QRCodeWizard.tsx` | 1 hour |
| P1 -- Add now | Tests for Automations feature (RuleEditor, FlowEditor, FluxosManager) | `src/features/automations/` | 1 day |
| P1 -- Add now | Tests for LeadForm component | `src/components/forms/LeadForm.tsx` | 4 hours |
| P2 -- Next sprint | Split god components (top 5 above 700 lines) | `RuleEditor`, `WhatsAppIA`, `RelatoriosGerenciais`, `ConnectionDetailsDrawer`, `IntegracoesConfig` | 3 days |
| P2 -- Next sprint | Split `useLeads.ts` and `useAgendaAutomation.ts` | `src/hooks/` | 1 day |
| P2 -- Next sprint | Add ErrorBoundaries per feature route | Router config + 5-6 new boundary components | 4 hours |
| P3 -- Backlog | Delete dead `src/utils/logger.ts` + consolidate monitoring | 4 files | 2 hours |
| P3 -- Backlog | Replace 5 remaining `console.*` calls with logger | `WhatsAppKapsoSetup`, `FluxosManager` | 30 min |
| P3 -- Backlog | Remove unused `rrule` + `@types/rrule` dependencies | `package.json` | 5 min |
| P3 -- Backlog | Type 2 remaining non-test `any` usages | `AnalyticsDashboard.tsx`, `FluxosManager.tsx` | 30 min |

---

*Quality audit: 2026-03-29 -- Complete. All sections verified against codebase scans.*

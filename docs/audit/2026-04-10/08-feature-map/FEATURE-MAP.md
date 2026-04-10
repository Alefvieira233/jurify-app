# Jurify Feature Map — 2026-04-10

Ground-truth reference compiled by @analyst (Alex) for cross-referencing in all audit streams.

## Overview

| Metric | Count |
|---|---|
| Total features (`src/features/*`) | 34 |
| Total routes (React Router) | 54 (30 unique feature routes + 6 public + 9 redirects + 9 admin/guarded) |
| Total global hooks (`src/hooks/*`) | 78 |
| Total feature-local hooks | 11 |
| Total Edge Functions | 34 |
| Total tables referenced from frontend | 64 |
| Edge Functions using OpenAI | 8 |
| Default model | `gpt-4o-mini` (`_shared/ai-model.ts`) |
| Premium model | `gpt-4o` (reserved for complex legal analysis) |

---

## Features

| Feature | Files | Components | Local Hooks | Main Route(s) | Purpose |
|---|---:|---:|---:|---|---|
| agents | 3 | 3 | 0 | `/admin/playground` | Agent playground UI (dev/admin-only) |
| ai-agents | 30 | 25 | 1 | `/agentes`, `/base-conhecimento` | AI agent CRUD, persona config, knowledge base, test chat |
| audit | 2 | 1 | 0 | `/auditoria` | Audit trail viewer |
| automations | 20 | 17 | 1 | `/fluxos`, `/regras` | ReactFlow editor + rule engine (triggers/conditions/actions) |
| billing | 9 | 6 | 1 | `/configuracoes/plano` (via settings) | Stripe checkout/portal, subscription status, plans |
| conexoes | 20 | 15 | 1 | `/conexoes` | WhatsApp (Kapso) connection wizard, logs, alerts |
| contatos | 2 | 1 | 0 | `/crm` | Contact/client table (primary CRM entry) |
| contracts | 12 | 10 | 1 | `/contratos` | Contract upload, list, ZapSign integration |
| crm | 10 | 9 | 0 | `/crm/lead/:leadId`, `/crm/followups` | CRM dashboard, lead detail drawer, follow-up sequences |
| dashboard | 18 | 16 | 0 | `/dashboard` | Main dashboard, analytics cards, performance widgets |
| departamentos | 4 | 3 | 0 | `/departamentos` | Department CRUD (admin/manager) |
| documentos | 3 | 2 | 0 | `/documentos` | Legal document upload + vector ingestion |
| equipe | 9 | 8 | 0 | `/equipe` | Team member management (admin/manager) |
| home | 2 | 1 | 0 | `/` | Home/landing after login |
| honorarios | 3 | 2 | 0 | `/honorarios` | Fees/invoicing |
| leads | 10 | 9 | 0 | `/arquivados`, LeadDrawer (shared) | Lead drawer + archived leads view |
| logs | 1 | 1 | 0 | `/logs` | Activity logs viewer (admin/manager) |
| mission-control | 7 | 5 | 1 | `/admin/mission-control` | Admin ops: backup/restore, system health, security |
| notifications | 2 | 1 | 0 | `/notificacoes` | Notification inbox |
| onboarding | 7 | 6 | 0 | inline (modal) | Multi-step onboarding flow |
| pipeline | 11 | 7 | 1 | `/pipeline`, `/pipeline/classico` | Kanban operational + classic pipeline view |
| prazos | 6 | 5 | 0 | `/prazos`, `/painel-prazos`→`/prazos?tab=painel` | Legal deadlines manager + dashboard tab |
| processos | 7 | 6 | 0 | `/processos` | Case/lawsuit management |
| reports | 24 | 20 | 3 | `/relatorios`, `/metricas`, `/analytics`→/relatorios | Management reports, operational metrics |
| scheduling | 10 | 9 | 0 | `/agendamentos` | Appointment calendar + Google Calendar sync |
| settings | 38 | 34 | 1 | `/configuracoes`, `/configuracoes/:section`, `/integracoes` | Settings umbrella (largest feature) |
| suporte | 3 | 2 | 0 | `/suporte` | Support ticket inbox |
| tags | 4 | 3 | 0 | `/tags` | Tag CRUD |
| tarefas | 4 | 3 | 0 | `/tarefas` | Task list |
| timeline | 2 | 1 | 0 | (absorbed by CRM) | Timeline component (imported by leads) |
| users | 5 | 4 | 0 | `/usuarios` | User management (admin/manager) |
| whatsapp | 10 | 8 | 0 | `/whatsapp` | WhatsApp IA inbox, error boundary, setup |
| widget | 1 | 1 | 0 | — | Embeddable widget (unused entry) |

Totals: 291 feature files, 241 feature components, 11 feature-local hooks.

---

## Routes

All feature routes are lazy-loaded via `lazyWithRetry()` from `src/lib/lazyWithRetry.ts`. The router is `BrowserRouter` (v6) in `src/App.tsx` wrapped with `withSentryReactRouterV6Routing`. All feature routes nest under `<ProtectedRoute><Layout /></ProtectedRoute>`.

### Public routes (eager, unguarded)
| Path | Component | Lazy |
|---|---|---|
| `/auth` | `pages/Auth` | no |
| `/auth/google/callback` | `pages/GoogleAuthCallback` | no |
| `/reset-password` | `pages/ResetPassword` | no |
| `/termos` | `pages/TermosDeUso` | yes |
| `/privacidade` | `pages/PoliticaDePrivacidade` | yes |
| `/precos` | `pages/Pricing` | yes |

### Protected routes (all lazy, all behind `ProtectedRoute`)
| Path | Component | Extra Roles |
|---|---|---|
| `/` (index) | `features/home/HomePage` | — |
| `/home` | → redirect `/` | — |
| `/dashboard` | `features/dashboard/Dashboard` | — |
| `/leads` | → redirect `/pipeline` | — |
| `/conexoes` | `features/conexoes/ConexoesManager` | admin, manager |
| `/pipeline` | `features/pipeline/KanbanOperacional` | — |
| `/pipeline/classico` | `features/pipeline/PipelineJuridico` | — |
| `/agendamentos` | `features/scheduling/AgendamentosManager` | — |
| `/tarefas` | `features/tarefas/TarefasPage` | — |
| `/contratos` | `features/contracts/ContratosManager` | — |
| `/relatorios` | `features/reports/RelatoriosGerenciais` | — |
| `/whatsapp` | `features/whatsapp/WhatsAppIA` | — |
| `/agentes` | `features/ai-agents/AgentesIAManager` | admin, manager |
| `/fluxos` | `features/automations/FluxosManager` | admin, manager |
| `/regras` | `features/automations/RegrasManager` | admin, manager |
| `/usuarios` | `features/users/UsuariosManager` | admin, manager |
| `/logs` | `features/logs/LogsPanel` | admin, manager |
| `/integracoes` | `features/settings/IntegracoesConfig` | admin |
| `/configuracoes` | `features/settings/ConfiguracoesPage` | admin, manager |
| `/configuracoes/:section` | `features/settings/ConfiguracoesPage` | admin, manager |
| `/configuracoes/:section/:subsection` | `features/settings/ConfiguracoesPage` | admin, manager |
| `/notificacoes` | `features/notifications/NotificationsPanel` | — |
| `/timeline` | → redirect `/crm` | — |
| `/planos` | → redirect `/billing` (→ `/configuracoes/plano`) | — |
| `/analytics` | → redirect `/relatorios` | — |
| `/crm` | `features/contatos/ContatosTable` | — |
| `/crm/followups` | → redirect `/crm` | — |
| `/crm/lead/:leadId` | `features/crm/LeadDetailPanel` | — |
| `/processos` | `features/processos/ProcessosManager` | — |
| `/prazos` | `features/prazos/PrazosManager` | — |
| `/painel-prazos` | → redirect `/prazos?tab=painel` | — |
| `/auditoria` | `features/audit/AuditTrail` | admin, manager |
| `/honorarios` | `features/honorarios/HonorariosManager` | admin, manager |
| `/documentos` | `features/documentos/DocumentosManager` | — |
| `/departamentos` | `features/departamentos/DepartamentosManager` | admin, manager |
| `/tags` | `features/tags/TagsManager` | — |
| `/equipe` | `features/equipe/EquipeManager` | admin, manager |
| `/arquivados` | `features/leads/ArquivadosView` | — |
| `/metricas` | `features/reports/MetricasOperacionais` | — |
| `/suporte` | `features/suporte/SuportePage` | — |
| `/base-conhecimento` | `features/ai-agents/BaseConhecimento` | admin, manager, user |
| `/billing` | → redirect `/configuracoes/plano` | — |
| `/administracao` | → redirect `/configuracoes` | — |
| `/admin/playground` | `pages/AgentsPlayground` | admin |
| `/admin/mission-control` | `features/mission-control/MissionControl` | admin |
| `/admin/status` | `pages/AdminStatus` | admin |
| `*` | `pages/NotFound` | — |

Every feature route is wrapped in `<FeatureErrorBoundary feature="..."/>` for granular error isolation.

---

## Hooks

### Global hooks (`src/hooks/*.ts(x)`) — 78 total

Grouped by category with usage counts from cross-codebase import scan.

**UI / Utilities**
| Hook | Usage | Category |
|---|---:|---|
| `use-toast` | 89 | ui (toast) |
| `usePageTitle` | 37 | ui (meta) |
| `useDebounce` | 14 | util |
| `use-mobile` | 6 | ui (responsive) |
| `useDraftPersistence` | 4 | util (form drafts) |
| `useFocusOnRouteChange` | 1 | ui (a11y) |
| `useKeyboardShortcuts` | 1 | ui |
| `useTableKeyboardNav` | 1 | ui |
| `useVirtualList` | 1 | ui perf |

**RBAC / Auth**
| Hook | Usage | Category |
|---|---:|---|
| `useRBAC` | 32 | rbac (primary permission hook) |
| `usePlanLimits` | 6 | rbac (plan gating) |
| `useBiometrics` | 1 | auth |
| `useInactivityLogout` | 1 | auth |

**Data / CRUD (leads, pipeline, crm, ops)**
| Hook | Usage |
|---|---:|
| `useLeads` | 28 |
| `useTeamMembers` | 17 |
| `useConexoes` | 12 |
| `useDepartamentos` | 11 |
| `useAgendamentos` | 10 |
| `usePrazosProcessuais` | 9 |
| `useAgentesIA` | 8 |
| `useTags` | 7 |
| `useWhatsAppConversations` | 6 |
| `useTarefas` | 5 |
| `useProcessos` | 5 |
| `useHonorarios` | 4 |
| `useContratos` | 4 |
| `useCalendarEvents` | 4 |
| `useEntityCRUD` | 4 (factory) |
| `useFollowUps` | 3 |
| `useDocumentosJuridicos` | 3 |
| `useIntegracoesConfig` | 3 |
| `useCRMPipeline` | 2 |
| `useStatusManager` | 2 |
| `useSystemSettings` | 2 |
| `useTicketsSuporte` | 2 |
| `useLogsExecucao` | 2 |
| `useDashboardMetricsFast` | 2 |
| `useAgentTraining` | 2 |
| `useLeadHistorico` | 1 |
| `useLeadNotas` | 1 |
| `useLeadScoring` | 1 |
| `useLeadTagsBatch` | 1 |
| `useCRMActivities` | 1 |
| `useFollowUpSequences` | 1 |
| `useMRR` | 1 |
| `useActivityLogs` | 1 |
| `useLogActivity` | 1 |

**Integrations**
| Hook | Usage |
|---|---:|
| `useGoogleCalendarConnection` | 5 |
| `useGoogleCalendar` | 4 |
| `useZapSignIntegration` | 2 |

**System / Realtime**
| Hook | Usage |
|---|---:|
| `useRealtimeSync` | 1 |
| `useRealtimeNotifications` | 2 |
| `useNetworkStatus` | 1 |
| `useNetworkBanner` | 1 |
| `usePushNotifications` | 1 |
| `useLocalPrazosNotifications` | 1 |
| `useNotifications` | 1 |
| `useNotificationTemplates` | 1 |
| `useResponseTime` | 1 |
| `useConsentLog` | 1 |
| `useAgendaAutomation` | 1 |
| `useAgendaIntelligence` | 1 |
| `useAgentesMetrics` | 1 |
| `useNativeShare` | 1 |
| `useCapacitor` | 2 |

**Agent sub-module** (`src/hooks/agents/`): `useAgentCrud`, `useAgentStats`, `useAgentTest` — composed via `index.ts` and re-exported through `useAgentesIA.ts`.

### Feature-local hooks (11 total)
| Hook | Feature |
|---|---|
| `useAgentesIAFilters` | ai-agents |
| `useRegrasData` | automations |
| `usePlans` | billing |
| `useWhatsAppWizard` | conexoes |
| `useUploadContratos` | contracts |
| `useRealtimeAgents` | mission-control |
| `useKanbanGrouping` | pipeline |
| `useRelatoriosData` | reports |
| `useMetricasData` | reports |
| `useReportMetrics` | reports |
| `useUsuariosPermissoes` | settings |

---

## Edge Functions

All functions live in `supabase/functions/*/index.ts`. Unless listed in `supabase/config.toml` as `verify_jwt = false`, the default is **JWT-required** (authenticated users only).

| Function | LOC | JWT | Purpose | Called By |
|---|---:|---|---|---|
| `admin-create-user` | 236 | yes | Admin-only: creates a new Supabase user with role + invite email | `features/users/components/NovoUsuarioForm`, `features/settings/configuracoes/admin/adminUserService` |
| `agent-orchestrator` | 130 | yes | Routing layer between agents (multi-agent system) | (internal — no direct frontend call found) |
| `agentes-ia-api` | 207 | yes | REST-like CRUD for AI agents with OpenAI usage | (internal, no direct invoke; agent CRUD goes through hook → DB) |
| `ai-agent-processor` | 578 | yes | Executes an AI agent with persona, knowledge base context | `hooks/useAgentesIA`, `features/ai-agents/EnhancedAIChat` |
| `assistant` | 591 | yes | General AI assistant chat endpoint | `hooks/useAIAssistant`, `features/ai-agents/components/AIAssistantChat` |
| `auto-followup` | 278 | yes | Scheduled follow-up automation | (cron/trigger) |
| `chat-completion` | 185 | yes | Generic OpenAI chat completion proxy (ALLOWED_MODELS allowlist) | (internal) |
| `cleanup-agent-memory` | 81 | yes | Data retention: prunes old agent memory | (cron) |
| `create-checkout-session` | 175 | yes | Stripe: creates checkout session for plan upgrade | `pages/Pricing`, `features/billing/components/usePlans` |
| `create-drive-folder` | 146 | yes | Google Drive: creates client folder | `hooks/useAgendaTasks` |
| `create-portal-session` | 117 | yes | Stripe: creates billing portal session | `features/billing/components/usePlans` |
| `data-retention-cleanup` | 179 | yes | Scheduled: purges expired data per LGPD | (cron) |
| `decrypt-data` | 138 | yes | Server-side decryption of sensitive fields | `utils/encryption` |
| `encrypt-data` | 127 | yes | Server-side encryption of sensitive fields | `utils/encryption` |
| `extract-document-text` | 353 | yes | OCR / text extraction from uploaded documents | (internal, ingestion pipeline) |
| `generate-document` | 132 | yes | Template-driven document generation | (internal) |
| `generate-embedding` | 85 | yes | OpenAI embeddings for vector search | (internal, ingestion) |
| `google-calendar` | 231 | yes | Unified Google Calendar OAuth + API (merged per a95f231) | `features/scheduling/components/CalendarPanel` |
| `health` | 60 | **no** | Minimal public liveness probe | (external monitoring) |
| `health-check` | 216 | **no** | Full system health with integration checks (OpenAI, Stripe, ZapSign, Kapso) | `utils/systemValidator`, `hooks/useSystemHealth`, `lib/integrations/EnterpriseWhatsApp`, `lib/integrations/WhatsAppMultiAgent` |
| `ingest-document` | 191 | yes | Vector ingestion (text payload) | (internal) |
| `ingest-document-from-file` | 181 | yes | Vector ingestion (file upload) | (internal) |
| `kapso-manager` | 904 | yes | WhatsApp/Kapso connection lifecycle + wizard + messaging control | `features/conexoes/ConnectionDetailsDrawer` (4x), `features/conexoes/wizard/useWhatsAppWizard` (6x) |
| `media-processor` | 223 | yes | WhatsApp media handling (audio transcription via OpenAI) | (internal, webhook path) |
| `process-followup-queue` | 188 | yes | Drains `crm_followup_queue` | (cron) |
| `process-prazos-alerts` | 120 | yes | Runs `check_prazos_vencendo` + notifications | (cron) |
| `send-email` | 408 | yes | Postmark wrapper with 7 templates | `hooks/useAgendaTasks` |
| `send-push-notification` | 133 | yes | FCM/APNS push delivery | (internal) |
| `send-whatsapp-message` | 492 | yes | Outbound WhatsApp via Kapso | `hooks/useAgendaTasks`, `hooks/useZapSignIntegration` |
| `stripe-webhook` | 335 | **no** (signature verified) | Stripe events → subscriptions table | (external Stripe) |
| `vector-search` | 130 | yes | Semantic search over embeddings | (internal) |
| `weekly-report` | 194 | yes | Generates + emails weekly summary report (Postmark) | (cron) |
| `whatsapp-webhook` | **2101** | **no** (Kapso) | Inbound WhatsApp: tenant resolution → IA → response (largest fn in codebase) | (external Kapso) |
| `zapsign-integration` | 261 | **no** (signature verified) | ZapSign webhook + call wrapper | `hooks/useZapSignIntegration` (2x) |

**Note:** `features/ai-agents/components/TesteRealAgenteIA.tsx` calls `n8n-webhook-forwarder`, which does NOT exist in `supabase/functions/` — **dead reference / likely broken**.

**Shared modules** (`supabase/functions/_shared/`): contains `ai-model.ts` defining `DEFAULT_OPENAI_MODEL = "gpt-4o-mini"` and `PREMIUM_OPENAI_MODEL = "gpt-4o"`.

---

## Integrations

| Name | Status | Entry (Frontend) | Entry (Backend) | Config Needed |
|---|---|---|---|---|
| **WhatsApp / Kapso v2** | **FUNCTIONAL** (per 2026-04-08 fix) | `useConexoes`, `useWhatsAppWizard`, `useWhatsAppConversations`, `WhatsAppIA`, `ConnectionDetailsDrawer` | `kapso-manager` (904 LOC), `whatsapp-webhook` (2101 LOC), `send-whatsapp-message`, `media-processor` | `KAPSO_API_KEY`, `KAPSO_WEBHOOK_SECRET` (configured) |
| **Stripe** | **PARTIAL** — webhook functional, checkout needs real price IDs | `usePlans`, `pages/Pricing` | `create-checkout-session`, `create-portal-session`, `stripe-webhook` | `STRIPE_SECRET_KEY` (ok), `STRIPE_WEBHOOK_SECRET` (ok), `VITE_STRIPE_PRICE_PRO` / `VITE_STRIPE_PRICE_ENTERPRISE` (**placeholder**) |
| **ZapSign** | **STUB** — code complete, missing key | `useZapSignIntegration` | `zapsign-integration` (261 LOC) | `ZAPSIGN_API_KEY` (**not configured**) |
| **Postmark (Email)** | **FUNCTIONAL** — 7 templates | `useAgendaTasks` (indirect) | `send-email` (408 LOC), `weekly-report` | `POSTMARK_API_KEY` (configured) |
| **OpenAI** | **FUNCTIONAL** | `useAIAssistant`, `useAgentesIA`, `EnhancedAIChat`, `AIAssistantChat` | `_shared/ai-model.ts`, 8 edge fns (see AI Touchpoints) | `OPENAI_API_KEY` (configured) |
| **Google Calendar** | **PARTIAL** — OAuth code complete, missing credentials | `useGoogleCalendar`, `useGoogleCalendarConnection`, `CalendarPanel`, `pages/GoogleAuthCallback` | `google-calendar` (merged OAuth+API, 231 LOC per a95f231) | `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (**both missing**) |
| **Google Drive** | **PARTIAL** — depends on Google OAuth above | `useAgendaTasks` | `create-drive-folder` | same as Google Calendar |
| **Sentry** | **PARTIAL** — initialized but DSN missing in prod | `App.tsx` (initSentry), `ErrorBoundary`, `FeatureErrorBoundary`, `withSentryReactRouterV6Routing` | — | `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (**not in Vercel**) |
| **Capacitor (Native Mobile)** | Functional for native builds | `useCapacitor`, `useBiometrics`, `useNativeShare`, `usePushNotifications`, `DeepLinkHandler` in `App.tsx` | — | Platform build only |
| **n8n (webhook forwarder)** | **BROKEN** — references non-existent edge fn | `features/ai-agents/components/TesteRealAgenteIA.tsx` | ❌ **missing** `n8n-webhook-forwarder` function | Remove call or create function |

---

## Database Touchpoints

64 distinct tables referenced from `src/` (frontend + hooks + utils).

### Core domain
- **leads / lead_historico / lead_interactions / lead_notas / lead_tags / crm_lead_scores** → crm, leads, pipeline, reports, dashboard
- **processos / prazos_processuais / audit / documents / documentos_juridicos / document_hashes** → processos, prazos, documentos, audit
- **agendamentos / reminders / google_calendar_settings / google_calendar_sync_logs / google_calendar_tokens** → scheduling
- **contratos / contratos_uploads** → contracts
- **honorarios** → honorarios
- **tarefas** → tarefas

### AI & Agents
- **agentes_ia / agent_ai_logs / agent_executions / agent_memory / agent_training_documents** → ai-agents, mission-control
- **ai_usage** → mission-control, reports

### Automation
- **automation_flows / automation_flow_nodes / automation_flow_edges** → automations (flow editor)
- **automation_rules / automation_rule_conditions / automation_rule_actions** → automations (rules)
- **automation_tasks / workflow_jobs** → automations, cron

### CRM
- **crm_activities / crm_pipeline_stages / crm_followups / crm_followup_sequences / crm_followup_queue** → crm, pipeline

### Messaging
- **whatsapp_conversations / whatsapp_messages / conexoes_whatsapp / conexoes_logs / conexoes_alertas / timeline_conversas** → whatsapp, conexoes, timeline

### Identity / RBAC / Tenancy
- **profiles / user_roles / user_permissions / role_permissions / tenants / departamento_membros / departamentos** → contexts/AuthContext, equipe, departamentos, users, settings
- **api_keys / system_settings / configuracoes_integracoes** → settings, integrations

### Ops
- **logs_atividades / notificacoes / notification_templates / tickets_suporte / tags / consent_logs / subscriptions** → logs, notifications, suporte, tags, billing

---

## AI Touchpoints

**Default model:** `gpt-4o-mini` (~$0.15/1M tokens — orchestrator, routing, simple tasks).
**Premium model:** `gpt-4o` (~$15/1M tokens — complex legal analysis only).
Defined in `supabase/functions/_shared/ai-model.ts`.

### Edge Functions using OpenAI (8)
| Function | Usage |
|---|---|
| `agentes-ia-api` | Per-agent model override (`agente.modelo_ia || 'gpt-4o-mini'`) |
| `agent-orchestrator` | Multi-agent routing decisions |
| `ai-agent-processor` | Main agent execution (persona + knowledge + tools) |
| `assistant` | General-purpose assistant chat |
| `chat-completion` | Generic proxy with `ALLOWED_MODELS` allowlist: `['gpt-4o-mini','gpt-4o','gpt-3.5-turbo','gpt-4-turbo', DEFAULT]` — guardrail |
| `health-check` | Calls OpenAI to verify key validity |
| `media-processor` | Whisper transcription for audio WhatsApp messages |
| `whatsapp-webhook` | Inbound-message AI auto-response (largest surface) |

### Guardrails observed
- **Model allowlist** in `chat-completion` (rejects non-whitelisted models)
- **Tenant-scoped memory** (agent_memory + agent_training_documents via RLS)
- **AI context summarization** (long memory → summary + 10 verbatim recent messages, per memory notes)
- **12 regex handoff patterns** in `whatsapp-webhook` to escalate to human
- **ia_active auto-reactivation** after 2h inactivity
- **ai_usage logging** for cost tracking (table + mission-control dashboard)

### Frontend callers
- `hooks/useAgentesIA` → `ai-agent-processor`
- `hooks/useAIAssistant` → `assistant`
- `features/ai-agents/EnhancedAIChat` → `ai-agent-processor`
- `features/ai-agents/components/AIAssistantChat` → `assistant`
- `features/ai-agents/components/TesteRealAgenteIA` → **`n8n-webhook-forwarder`** (BROKEN — fn missing)

---

## Cross-Feature Dependencies

All cross-feature imports identified via `@/features/{feature}` path scan. 16 edges, 11 source features → 9 target features.

| From | To | Symbol | File |
|---|---|---|---|
| ai-agents | ai-agents (self) | `EnhancedAIChat` | `components/DetalhesAgente.tsx` |
| contatos | leads | `LeadDrawer` | `ContatosTable.tsx` |
| home | dashboard | `StatCard`, `PrazosUrgentesWidget` | `HomePage.tsx` |
| leads | pipeline | `LEAD_STATUS_LABELS` from `pipelineConfig` | `LeadDrawer.tsx` |
| leads | tags | `TagBadge` | `LeadDrawerAtendimento.tsx` |
| leads | pipeline | `LEAD_STATUS_LABELS` | `LeadDrawerAtendimento.tsx` |
| leads | pipeline | `PIPELINE_STAGES`, `LEAD_STATUS_LABELS` | `LeadDrawerOperacional.tsx` |
| leads | timeline | `TimelineConversas` | `LeadsPanel.tsx` |
| pipeline | leads | `LeadDrawer` | `KanbanOperacional.tsx` |
| processos | prazos | `PrazoAlertaBadge` | `components/ProcessoDetalhes.tsx` |
| reports | dashboard | `ConversionFunnel`, `RevenueCard`, `ResponseTimeChart`, `ChurnCard` | `RelatoriosGerenciais.tsx` |
| reports | pipeline | `PIPELINE_STAGES`, `STAGE_COLORS` | `useMetricasData.ts` |
| settings | billing | `SubscriptionManager` | `configuracoes/AssinaturaSection.tsx` |
| settings | mission-control | `BackupRestore`, `SystemStatus`, `SystemHealthCheck`, `SecurityDashboard` | `configuracoes/SistemaSection.tsx` |
| settings | dashboard | `PerformanceDashboard` | `configuracoes/SistemaSection.tsx` |
| settings | ai-agents | `LogsMonitoramento`, `TesteRealAgenteIA` | `configuracoes/SistemaSection.tsx` |
| settings | users | `NovoUsuarioForm`, `EditarUsuarioForm`, `GerenciarPermissoesForm` | `configuracoes/UsuariosPermissoesSection.tsx` |
| settings | tags | `TagsManager` | `ConfiguracoesPage.tsx` |
| settings | departamentos | `DepartamentosManager` | `ConfiguracoesPage.tsx` |

### Most interconnected features (by in + out edges)
1. **settings** — 7 outbound imports (billing, mission-control × 4, dashboard, ai-agents × 2, users × 3, tags, departamentos) — umbrella feature pulling everything together.
2. **leads** — 3 outbound (pipeline × 3, tags, timeline) + 2 inbound (contatos, pipeline) = 5 edges.
3. **pipeline** — 1 outbound (leads) + 4 inbound (leads × 3, reports) = 5 edges. `pipelineConfig.ts` is the shared single-source-of-truth for lead status labels.
4. **dashboard** — 0 outbound + 3 inbound (home, reports, settings) = 3 edges. Provides reusable analytics cards.

### Feature groups with no cross-imports (isolated)
agents, audit, automations, conexoes, crm (self-contained), documentos, equipe, honorarios, logs, notifications, onboarding, prazos (only exported to processos), scheduling, suporte, tarefas, whatsapp, widget, users (only consumed by settings).

---

## Orphans

### Hooks defined in `src/hooks/` but not imported by standard `@/hooks/...` alias
13 hooks flagged; re-verified via raw name scan:

| Hook | Verified status |
|---|---|
| `useAgendaMetrics` | truly orphan (0 references) |
| `useAgendaReminders` | truly orphan (0 references) |
| `useAgendaTasks` | used — 1 file (`send-email`/`send-whatsapp-message`/`create-drive-folder` caller) |
| `useAgentPipeline` | truly orphan (0 references) |
| `useAIAssistant` | used — 1 file (`AIAssistantChat`) |
| `useApiKeys` | truly orphan (0 references) |
| `useCRMTags` | truly orphan (0 references) |
| `useFeatureFlag` | truly orphan (0 references) |
| `useLeadsCRUD` | used — 1 file (internal refactor stub) |
| `useLeadsQuery` | truly orphan (0 references) |
| `useMultiAgentSystem` | used — 1 file |
| `useOptimisticMutation` | used — 1 file |
| **`useSystemHealth`** | **truly orphan (0 references)** — defined but never called |

**True orphans (7):** `useAgendaMetrics`, `useAgendaReminders`, `useAgentPipeline`, `useApiKeys`, `useCRMTags`, `useFeatureFlag`, `useLeadsQuery`, `useSystemHealth`.

### Features with zero direct route & zero imports
- **widget** — 1 file, never imported, no route.
- **timeline** — only consumed by `features/leads/LeadsPanel.tsx`, route `/timeline` is a redirect to `/crm`. Lives as a single-component helper.

### Edge function referenced but not existing
- **`n8n-webhook-forwarder`** — called from `features/ai-agents/components/TesteRealAgenteIA.tsx`, no folder in `supabase/functions/`. **Broken call site.**

### Potentially underused edge functions (no frontend invoke found)
These are called internally (cron/webhook/other edge fns) and not directly from `src/`:
`agent-orchestrator`, `agentes-ia-api`, `auto-followup`, `chat-completion`, `cleanup-agent-memory`, `data-retention-cleanup`, `extract-document-text`, `generate-document`, `generate-embedding`, `ingest-document`, `ingest-document-from-file`, `media-processor`, `process-followup-queue`, `process-prazos-alerts`, `send-push-notification`, `vector-search`, `weekly-report`.

Most are legitimately cron-driven or webhook-chained; `agent-orchestrator` and `chat-completion` deserve review since they mirror functionality available through other paths.

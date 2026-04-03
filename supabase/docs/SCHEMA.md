# Jurify Database Schema

> Generated: 2026-04-03 | Source: `src/integrations/supabase/types.ts` (5796 lines) + 90+ migrations
> Database: Supabase PostgreSQL with RLS | Multi-tenant via `tenant_id`

---

## Overview

| Metric | Value |
|--------|-------|
| **Tables** | 55 |
| **Views** | 8 (3 materialized) |
| **Functions** | 30+ |
| **Enums** | 6 |
| **Composite Types** | 0 |
| **Migrations** | 90+ |
| **Latest Migration** | `20260402000004_user_roles_tenant_id.sql` |

---

## Entity Groups

### 1. CRM (leads, pipeline, contacts)
| Table | Description |
|-------|-------------|
| `leads` | Core CRM entity -- clients/prospects |
| `lead_historico` | Change history/audit trail per lead |
| `lead_interactions` | Communication log (calls, emails, messages) |
| `lead_notas` | Notes attached to leads |
| `lead_tags` | Junction: leads <-> tags |
| `crm_activities` | CRM activities (calls, meetings, tasks) |
| `crm_custom_fields` | Tenant-configurable custom fields |
| `crm_lead_custom_values` | Values for custom fields per lead |
| `crm_lead_scores` | Lead scoring records |
| `crm_lead_tags` | Junction: leads <-> crm_tags |
| `crm_pipeline_stages` | Configurable pipeline stages per tenant |
| `crm_tags` | CRM-specific tag definitions |
| `crm_followups` | Follow-up scheduling and tracking |
| `tags` | General tag definitions |
| `tarefas` | Tasks linked to leads |

### 2. Legal (processos, prazos, documentos)
| Table | Description |
|-------|-------------|
| `processos` | Legal cases/lawsuits |
| `prazos_processuais` | Legal deadlines with alert schedules |
| `documentos_juridicos` | Legal documents with storage paths |
| `contratos` | Contracts with digital signature integration |
| `honorarios` | Attorney fees and billing records |
| `legal_knowledge` | Vector-indexed legal knowledge base |
| `knowledge_base` | General knowledge base with embeddings |
| `documents` | Vector-indexed document chunks |
| `document_hashes` | Document integrity verification (blockchain-ready) |

### 3. Billing & Subscriptions
| Table | Description |
|-------|-------------|
| `subscription_plans` | Available SaaS plans (Stripe-linked) |
| `subscriptions` | Active tenant subscriptions |
| `pagamentos` | Payment records |

### 4. Communication (WhatsApp, Notifications)
| Table | Description |
|-------|-------------|
| `whatsapp_conversations` | WhatsApp conversation threads |
| `whatsapp_messages` | Individual WhatsApp messages |
| `whatsapp_sessions` | WhatsApp connection sessions |
| `conexoes_whatsapp` | WhatsApp connection configurations |
| `conexoes_alertas` | Connection health alerts |
| `conexoes_logs` | Connection event logs |
| `conversation_logs` | Cross-channel conversation logs |
| `notificacoes` | In-app notifications |
| `notification_templates` | Notification templates |
| `reminders` | Scheduled reminders |

### 5. AI & Automation
| Table | Description |
|-------|-------------|
| `agentes_ia` | AI agent definitions and configuration |
| `agent_ai_logs` | AI execution logs with token tracking |
| `agent_executions` | AI orchestration execution records |
| `agent_memory` | Vector-indexed agent memory |
| `agent_training_documents` | Documents for AI training |
| `automation_flows` | Visual automation flow definitions |
| `automation_flow_nodes` | Flow canvas nodes |
| `automation_flow_edges` | Flow canvas edges |
| `automation_rules` | Rule-based automation definitions |
| `automation_rule_conditions` | Rule conditions |
| `automation_rule_actions` | Rule actions |
| `automation_executions` | Automation execution history |
| `automation_tasks` | Scheduled automation tasks |
| `workflow_jobs` | Background job queue |
| `hitl_requests` | Human-in-the-loop AI review requests |

### 6. Scheduling & Calendar
| Table | Description |
|-------|-------------|
| `agendamentos` | Appointments/meetings |
| `recurring_events` | Recurring event definitions (RRULE) |
| `recurring_event_instances` | Generated instances of recurring events |
| `google_calendar_settings` | Per-user Google Calendar config |
| `google_calendar_tokens` | OAuth tokens for Google Calendar |
| `google_calendar_sync_logs` | Calendar sync audit trail |
| `google_calendar_watches` | Google Calendar push notification channels |
| `drive_folders` | Google Drive folder links |

### 7. System & Security
| Table | Description |
|-------|-------------|
| `tenants` | Multi-tenant organizations |
| `profiles` | User profiles (extends auth.users) |
| `user_roles` | User role assignments |
| `user_permissions` | Granular user permissions |
| `role_permissions` | Role-based permission matrix |
| `system_settings` | Global system configuration |
| `audit_log` | Data change audit trail |
| `security_audit` | Security event log |
| `logs_atividades` | User activity logs |
| `logs_execucao_agentes` | Legacy agent execution logs |
| `rate_limits` | API rate limiting counters |
| `api_keys` | API key management |
| `api_rate_limits` | API key rate limits |
| `allowed_columns` | Column-level access control |
| `configuracoes_integracoes` | Integration configurations |
| `webhook_events` | Webhook idempotency tracking |
| `webhook_logs` | Webhook processing logs |
| `zapsign_logs` | ZapSign digital signature logs |
| `tickets_suporte` | Support ticket system |
| `departamentos` | Organizational departments |
| `departamento_membros` | Department membership with permissions |

---

## Table Definitions

### tenants
Central multi-tenant table. All tenant-scoped tables reference this.

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| id | uuid | NO | gen_random_uuid() | PK |
| nome | text | NO | - | - |
| slug | text | NO | - | UNIQUE |
| email | text | YES | - | - |
| telefone | text | YES | - | - |
| plano | text | YES | - | - |
| ativo | boolean | YES | true | - |
| logo_url | text | YES | - | - |
| configuracoes | jsonb | YES | - | - |
| metadata | jsonb | YES | - | - |
| max_agentes | integer | YES | - | - |
| max_leads | integer | YES | - | - |
| max_usuarios | integer | YES | - | - |
| max_whatsapp_sessions | integer | YES | - | - |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

### profiles
Extends Supabase auth.users. Central user identity table.

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| id | uuid | NO | - | PK (auth.users) |
| email | text | NO | - | - |
| nome_completo | text | YES | - | - |
| telefone | text | YES | - | - |
| cargo | text | YES | - | - |
| role | text | YES | - | - |
| ativo | boolean | YES | true | - |
| avatar_url | text | YES | - | - |
| permissions | jsonb | YES | - | - |
| preferences | jsonb | YES | - | - |
| metadata | jsonb | YES | - | - |
| push_token | text | YES | - | - |
| last_login | timestamptz | YES | - | - |
| tenant_id | uuid | YES | - | tenants(id) |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

### leads
Core CRM entity -- the central hub connecting all business data.

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| id | uuid | NO | gen_random_uuid() | PK |
| nome | text | NO | - | - |
| email | text | YES | - | - |
| telefone | text | YES | - | - |
| cpf_cnpj | text | YES | - | - |
| company_name | text | YES | - | - |
| status | text | YES | - | - |
| origem | text | YES | - | - |
| area_juridica | text | YES | - | - |
| descricao | text | YES | - | - |
| prioridade | text | YES | - | - |
| temperature | text | YES | - | - |
| score | integer | YES | - | - |
| lead_score | integer | YES | - | - |
| ativo | boolean | YES | true | - |
| valor_estimado | numeric | YES | - | - |
| valor_causa | numeric | YES | - | - |
| expected_value | numeric | YES | - | - |
| probability | numeric | YES | - | - |
| tags | text[] | YES | - | - |
| custom_fields | jsonb | YES | - | - |
| metadata | jsonb | YES | - | - |
| proxima_acao | text | YES | - | - |
| proxima_acao_data | timestamptz | YES | - | - |
| followup_count | integer | YES | - | - |
| next_followup_at | timestamptz | YES | - | - |
| ultima_interacao | timestamptz | YES | - | - |
| ultimo_contato | timestamptz | YES | - | - |
| last_activity_at | timestamptz | YES | - | - |
| inactive_since | timestamptz | YES | - | - |
| data_reativacao_prevista | timestamptz | YES | - | - |
| assigned_at | timestamptz | YES | - | - |
| won_at | timestamptz | YES | - | - |
| lost_at | timestamptz | YES | - | - |
| lost_reason | text | YES | - | - |
| arquivado_em | timestamptz | YES | - | - |
| motivo_arquivamento | text | YES | - | - |
| tenant_id | uuid | NO | - | tenants(id) |
| responsavel_id | uuid | YES | - | profiles(id) |
| proximo_responsavel_id | uuid | YES | - | profiles(id) |
| arquivado_por | uuid | YES | - | profiles(id) |
| pipeline_stage_id | uuid | YES | - | crm_pipeline_stages(id) |
| departamento_id | uuid | YES | - | departamentos(id) |
| conexao_id | uuid | YES | - | conexoes_whatsapp(id) |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

### processos
Legal cases/lawsuits linked to leads.

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| id | uuid | NO | gen_random_uuid() | PK |
| tipo_acao | text | NO | - | - |
| fase_processual | text | NO | 'inicial' | - |
| posicao | text | NO | 'autor' | - |
| status | text | NO | 'ativo' | - |
| numero_processo | text | YES | - | - |
| area_juridica | text | YES | - | - |
| tribunal | text | YES | - | - |
| comarca | text | YES | - | - |
| vara | text | YES | - | - |
| valor_causa | numeric | YES | - | - |
| valor_honorario_acordado | numeric | YES | - | - |
| tipo_honorario | text | YES | - | - |
| partes_contrarias | text[] | YES | - | - |
| tags | text[] | YES | - | - |
| observacoes | text | YES | - | - |
| metadata | jsonb | YES | - | - |
| data_distribuicao | date | YES | - | - |
| data_encerramento | date | YES | - | - |
| tenant_id | uuid | NO | - | tenants(id) |
| lead_id | uuid | YES | - | leads(id) |
| responsavel_id | uuid | YES | - | profiles(id) |
| created_at | timestamptz | NO | now() | - |
| updated_at | timestamptz | YES | now() | - |

### contratos
Contracts with ZapSign digital signature integration.

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| id | uuid | NO | gen_random_uuid() | PK |
| titulo | text | NO | - | - |
| tipo | text | YES | - | - |
| status | text | YES | 'rascunho' | - |
| status_assinatura | text | YES | - | - |
| numero | text | YES | - | - |
| descricao | text | YES | - | - |
| area_juridica | text | YES | - | - |
| nome_cliente | text | YES | - | - |
| texto_contrato | text | YES | - | - |
| clausulas_customizadas | text | YES | - | - |
| observacoes | text | YES | - | - |
| honorarios | numeric | YES | - | - |
| valor | numeric | YES | - | - |
| valor_causa | numeric | YES | - | - |
| arquivo_url | text | YES | - | - |
| assinatura_digital_url | text | YES | - | - |
| link_assinatura_zapsign | text | YES | - | - |
| zapsign_document_id | text | YES | - | - |
| metadata | jsonb | YES | - | - |
| data_inicio | date | YES | - | - |
| data_fim | date | YES | - | - |
| data_assinatura | date | YES | - | - |
| data_envio | date | YES | - | - |
| data_envio_whatsapp | timestamptz | YES | - | - |
| data_geracao_link | timestamptz | YES | - | - |
| responsavel | text | YES | - | - |
| tenant_id | uuid | NO | - | tenants(id) |
| lead_id | uuid | YES | - | leads(id) |
| cliente_id | uuid | YES | - | leads(id) |
| responsavel_id | uuid | YES | - | profiles(id) |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

### whatsapp_messages
Individual WhatsApp messages with delivery tracking.

| Column | Type | Nullable | Default | FK |
|--------|------|----------|---------|-----|
| id | uuid | NO | gen_random_uuid() | PK |
| content | text | YES | - | - |
| message_text | text | YES | - | - |
| message_type | text | YES | - | - |
| direction | text | YES | - | - |
| sender | text | YES | - | - |
| from_number | text | YES | - | - |
| to_number | text | YES | - | - |
| status | text | YES | - | - |
| send_status | text | YES | - | - |
| send_error | text | YES | - | - |
| read | boolean | YES | false | - |
| processed_by_agent | boolean | YES | false | - |
| media_url | text | YES | - | - |
| message_id | text | YES | - | - |
| provider_message_id | text | YES | - | - |
| session_id | text | YES | - | - |
| metadata | jsonb | YES | - | - |
| timestamp | timestamptz | YES | - | - |
| tenant_id | uuid | YES | - | tenants(id) |
| conversation_id | uuid | YES | - | whatsapp_conversations(id) |
| lead_id | uuid | YES | - | leads(id) |
| created_at | timestamptz | YES | now() | - |

---

## Views

### Regular Views
| View | Description |
|------|-------------|
| `active_executions_view` | Running AI agent executions with lead info |
| `audit_recent` | Recent audit log entries with user names |
| `v_leads_operacional` | Leads enriched with department, pipeline stage, responsavel, and conexao data |

### Materialized Views (Dashboard)
| View | Description | Refresh |
|------|-------------|---------|
| `mv_dashboard` | Unified dashboard metrics per tenant | `refresh_dashboard_views()` |
| `mv_leads_metrics` | Lead count by status per tenant | Auto with dashboard |
| `mv_leads_por_area` | Lead count by area_juridica per tenant | Auto with dashboard |
| `mv_agendamentos_metrics` | Scheduling metrics per tenant | Auto with dashboard |
| `mv_agentes_metrics` | AI agent execution metrics | Auto with dashboard |
| `mv_contratos_metrics` | Contract metrics per tenant | Auto with dashboard |

---

## Enums

```sql
-- Roles
CREATE TYPE app_role AS ENUM (
  'administrador', 'advogado', 'comercial', 'pos_venda', 'suporte'
);

-- Permissions
CREATE TYPE app_permission AS ENUM (
  'create', 'read', 'update', 'delete', 'manage'
);

-- Modules
CREATE TYPE app_module AS ENUM (
  'leads', 'contratos', 'agendamentos', 'relatorios',
  'configuracoes', 'whatsapp_ia', 'usuarios'
);

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'info', 'alerta', 'sucesso', 'erro'
);

-- Integration status
CREATE TYPE status_integracao AS ENUM (
  'ativa', 'inativa', 'erro'
);

-- Activity action types
CREATE TYPE tipo_acao AS ENUM (
  'criacao', 'edicao', 'exclusao', 'login', 'logout', 'erro', 'outro'
);
```

---

## Relationship Diagram (Text-Based)

```
                              tenants
                                |
                +-------+-------+-------+-------+
                |       |       |       |       |
            profiles  leads  contratos  agentes_ia  ...
                |       |       |
                |   +---+---+---+---+
                |   |   |   |   |   |
                | lead_ lead_ crm_  processos
                | hist  notas tags     |
                |                      +---+---+
                |                      |       |
                |                   prazos  honorarios
                |                   proc.
                +--- user_roles
                +--- user_permissions
                +--- departamento_membros
                |
             whatsapp_conversations --- whatsapp_messages
                |
             conexoes_whatsapp --- conexoes_alertas
                                --- conexoes_logs

        automation_flows --- automation_flow_nodes
                         --- automation_flow_edges

        automation_rules --- automation_rule_conditions
                         --- automation_rule_actions

        subscription_plans --- subscriptions --- pagamentos
```

**Central Entities:**
- `tenants` - Root of all tenant-scoped data (referenced by 40+ tables)
- `leads` - Hub entity connecting CRM, Legal, Communication, and Billing
- `profiles` - User identity, referenced by all `responsavel_id`, `user_id`, `created_by` columns

---

## RLS Policy Summary

All tables have RLS enabled. Policy pattern uses `public.get_current_tenant_id()` for O(1) tenant lookup.

### Pattern A: Direct tenant_id (majority of tables)
```sql
FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id = public.get_current_tenant_id())
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND tenant_id = public.get_current_tenant_id())
```

### Pattern B: Permission-gated CRUD (core business tables)
Tables: `leads`, `contratos`, `agendamentos`, `agentes_ia`, `notificacoes`
```sql
FOR INSERT WITH CHECK (... AND public.has_permission(auth.uid(), 'module', 'create'))
FOR UPDATE USING (... AND public.has_permission(auth.uid(), 'module', 'update'))
FOR DELETE USING (... AND public.has_permission(auth.uid(), 'module', 'delete'))
```

### Pattern C: Tenant via JOIN (tables without tenant_id)
Tables: `user_roles` (now has tenant_id after migration 20260402000004), `system_settings`, `notification_templates`, `role_permissions`
- Use `public.get_current_tenant_id() IS NOT NULL` as tenant validation

### Pattern D: User-scoped
Tables: `profiles` (own profile + same-tenant), `google_calendar_*` (per user_id)

### Tables with Service-Role Only Access
- `webhook_events`, `webhook_logs`, `zapsign_logs` -- webhook processing
- `rate_limits` -- managed by RPC `check_rate_limit()`

---

## Indexes

### Single-column tenant indexes (BTREE)
Applied to 13 core tables: `leads`, `contratos`, `agendamentos`, `notificacoes`, `agent_ai_logs`, `agent_executions`, `agentes_ia`, `logs_execucao_agentes`, `whatsapp_conversations`, `lead_interactions`, `automation_tasks`, `reminders`, `recurring_events`

### Composite indexes
| Index | Table | Columns |
|-------|-------|---------|
| `idx_leads_tenant_status` | leads | (tenant_id, status) |
| `idx_leads_tenant_created` | leads | (tenant_id, created_at DESC) |
| `idx_leads_tenant_area` | leads | (tenant_id, area_juridica) |
| `idx_leads_tenant_responsavel` | leads | (tenant_id, responsavel_id) |
| `idx_leads_active` | leads | (tenant_id, created_at DESC) WHERE status NOT IN ('perdido','arquivado') |
| `idx_contratos_tenant_status` | contratos | (tenant_id, status) |
| `idx_contratos_tenant_created` | contratos | (tenant_id, created_at DESC) |
| `idx_contratos_tenant_status_assinatura` | contratos | (tenant_id, status_assinatura) |
| `idx_agendamentos_tenant_data` | agendamentos | (tenant_id, data_hora) |
| `idx_agendamentos_tenant_status` | agendamentos | (tenant_id, status) |
| `idx_agendamentos_responsavel_id` | agendamentos | (responsavel_id) |
| `idx_agent_executions_tenant_created` | agent_executions | (tenant_id, created_at DESC) |
| `idx_profiles_id_tenant` | profiles | (id, tenant_id) |
| `idx_agent_memory_tenant_importance` | agent_memory | (tenant_id, importance DESC) |
| `idx_agent_memory_expires_at` | agent_memory | (expires_at) WHERE NOT NULL |
| `idx_whatsapp_conversations_tenant_updated` | whatsapp_conversations | (tenant_id, updated_at DESC) |
| `idx_whatsapp_conversations_lead_tenant_ia` | whatsapp_conversations | (lead_id, tenant_id, ia_active) |
| `idx_webhook_events_id_source` | webhook_events | (event_id, source) UNIQUE |
| `idx_prazos_lead_status_prazo` | prazos_processuais | (lead_id, status, data_prazo) |
| `idx_user_roles_tenant` | user_roles | (tenant_id) |

---

## Functions & Triggers

### Tenant & Auth
| Function | Returns | Purpose |
|----------|---------|---------|
| `get_current_tenant_id()` | uuid | Cached tenant lookup for RLS (STABLE) |
| `current_tenant_id()` | uuid | Alias for `get_current_tenant_id()` |
| `get_user_tenant_id()` | uuid | Get authenticated user's tenant |
| `is_admin(uuid)` | boolean | Check if user is admin |
| `is_admin_user()` | boolean | Check if current user is admin |
| `has_role(app_role, uuid)` | boolean | Check user role |
| `has_permission(uuid, text, text)` | boolean | Check granular permission (resource/action) |
| `has_permission(uuid, app_module, app_permission)` | boolean | Check module-level permission |

### Business Logic
| Function | Purpose |
|----------|---------|
| `buscar_agente_para_execucao(uuid)` | Fetch AI agent config for execution |
| `buscar_logs_atividades(...)` | Paginated activity log query |
| `get_dashboard_metrics(uuid)` | Aggregate dashboard metrics from materialized views |
| `get_leads_por_area(uuid)` | Lead count by legal area |
| `refresh_dashboard_views()` | Refresh all materialized views |
| `mark_overdue_followups()` | Batch update overdue follow-ups |
| `generate_recurring_instances()` | Generate recurring event instances |
| `increment_unread_count(uuid)` | Atomic unread counter increment |

### Rate Limiting & Security
| Function | Purpose |
|----------|---------|
| `check_rate_limit(...)` | Token bucket rate limiter |
| `validar_api_key(text)` | Validate API key |
| `verify_document_hash(text, uuid)` | Document integrity verification |

### Job Queue
| Function | Purpose |
|----------|---------|
| `claim_next_job(...)` | Atomic job claiming with locking |
| `complete_job(uuid, jsonb)` | Mark job as completed |
| `fail_job(text, uuid)` | Mark job as failed |
| `release_stale_locks()` | Clean up abandoned locks |

### Vector Search
| Function | Purpose |
|----------|---------|
| `match_documents(...)` | Semantic search on documents table |
| `match_legal_documents(...)` | Semantic search on legal_knowledge table |
| `search_agent_memory(...)` | Semantic search on agent_memory table |

### Settings & Notifications
| Function | Purpose |
|----------|---------|
| `get_system_setting(text)` | Read system setting by key |
| `update_system_setting(text, uuid, text)` | Write system setting |
| `contar_nao_lidas(uuid)` | Count unread notifications |
| `marcar_notificacao_lida(uuid, uuid)` | Mark notification read |
| `marcar_todas_lidas(uuid)` | Mark all notifications read |

### Utility
| Function | Purpose |
|----------|---------|
| `apply_rls_defaults(text, text)` | Apply standard RLS policies to a table |
| `ensure_policy(...)` | Idempotent policy creation |
| `exec_sql(text)` | Execute dynamic SQL (admin only) |
| `cleanup_old_webhook_events()` | Prune old webhook events |
| `registrar_log_atividade(...)` | Insert activity log entry |

---

## Edge Functions (32 total)

| Function | JWT | Purpose |
|----------|-----|---------|
| `agentes-ia-api` | Required | AI agent CRUD API |
| `agent-orchestrator` | Service-role | Route messages to correct AI agent |
| `ai-agent-processor` | Required | Process AI agent responses |
| `assistant` | Required | Conversational AI assistant |
| `chat-completion` | Required | General chat completion endpoint |
| `cleanup-agent-memory` | Service-role | Prune expired agent memory |
| `create-checkout-session` | Required | Stripe checkout session |
| `create-portal-session` | Required | Stripe billing portal |
| `create-drive-folder` | Required | Google Drive folder creation |
| `data-retention-cleanup` | Service-role | LGPD data retention enforcement |
| `decrypt-data` | Required | Field-level decryption |
| `encrypt-data` | Required | Field-level encryption |
| `extract-document-text` | Required | Document text extraction |
| `generate-document` | Required | Document generation |
| `generate-embedding` | Required | Vector embedding generation |
| `google-calendar` | Required | Google Calendar sync |
| `health` | Public | Health check (simple) |
| `health-check` | Public | Health check (detailed) |
| `ingest-document` | Required | Document ingestion pipeline |
| `ingest-document-from-file` | Required | File-based document ingestion |
| `kapso-manager` | Required | Kapso WhatsApp API management |
| `media-processor` | Required | Media file processing |
| `process-followup-queue` | Service-role | Follow-up queue processing |
| `process-prazos-alerts` | Service-role | Legal deadline alert processing |
| `send-email` | Required | Email sending (Postmark) |
| `send-push-notification` | Required | Push notification delivery |
| `send-whatsapp-message` | Required | WhatsApp message sending |
| `stripe-webhook` | Public | Stripe webhook handler |
| `vector-search` | Required | Semantic vector search |
| `whatsapp-webhook` | Public | WhatsApp webhook handler |
| `zapsign-integration` | Public | ZapSign webhook handler |
| `admin-create-user` | Required | Admin user creation |

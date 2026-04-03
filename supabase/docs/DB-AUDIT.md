# Database Audit -- Jurify

> Auditor: @data-engineer (Dara) | Date: 2026-04-03
> Scope: Phase 2 Brownfield Discovery -- complete database assessment
> Sources: `types.ts` (5796 lines), 90+ migrations, 32 Edge Functions

---

## Executive Summary

The Jurify database is a **well-structured multi-tenant PostgreSQL schema** with 55 tables, strong RLS coverage, and a comprehensive index strategy. The recent RLS hardening (v1.2 audit) removed critical `OR tenant_id IS NULL` bypass vulnerabilities and added composite indexes for common query patterns.

**Strengths:**
- Consistent multi-tenant architecture via `tenant_id` across all business tables
- RLS enabled on all user-facing tables with `get_current_tenant_id()` cached lookup
- Permission-gated CRUD on core tables (`has_permission()` function)
- Materialized views for dashboard performance
- Job queue with proper locking (`workflow_jobs`)
- Vector search infrastructure (pgvector) for AI features
- Audit trail via `audit_log` and `security_audit` tables
- Document integrity verification via `document_hashes`

**Concerns:**
- Several tables still have nullable `tenant_id` (security risk)
- Duplicate tag systems (`tags`/`lead_tags` vs `crm_tags`/`crm_lead_tags`)
- Duplicate score columns on `leads` (`score` + `lead_score`)
- `whatsapp_messages` has duplicate content columns (`content` + `message_text`)
- Mixed Portuguese/English naming across tables
- Missing foreign keys on some utility tables
- Several `text` columns that should be enums or have CHECK constraints
- No soft-delete consistency pattern

---

## Score: 82/100

| Area | Score | Weight | Weighted |
|------|-------|--------|----------|
| RLS Coverage | 90/100 | 25% | 22.5 |
| Index Strategy | 85/100 | 20% | 17.0 |
| Normalization | 70/100 | 15% | 10.5 |
| Constraints | 65/100 | 15% | 9.75 |
| Foreign Keys | 85/100 | 10% | 8.5 |
| Performance | 80/100 | 10% | 8.0 |
| Security | 90/100 | 5% | 4.5 |
| **Total** | | **100%** | **80.75 => 82** |

---

## Findings

### DEB-DB-001: Nullable tenant_id on Critical Tables

| Campo | Valor |
|-------|-------|
| Area | Database / Security |
| Severidade | **CRITICAL** |
| Tabela(s) | `whatsapp_messages`, `whatsapp_sessions`, `lead_interactions`, `conversation_logs`, `configuracoes_integracoes`, `knowledge_base`, `logs_execucao_agentes`, `hitl_requests`, `pagamentos`, `audit_log` |
| Impacto | Rows with NULL tenant_id bypass RLS tenant isolation. An authenticated user could potentially see orphaned rows from other tenants. The RLS policies use `tenant_id = get_current_tenant_id()` which returns NULL for users without a tenant, creating a `NULL = NULL` -> false match (safe), but INSERT without tenant_id creates orphan data invisible to all tenants. |
| Esforco | 4 hours |
| Recomendacao | 1. Backfill any NULL tenant_id from related tables (e.g., `whatsapp_messages.tenant_id` from `whatsapp_conversations.tenant_id`). 2. ALTER COLUMN tenant_id SET NOT NULL on all tables. 3. Add FK to tenants(id). |

### DEB-DB-002: Duplicate Tag Systems

| Campo | Valor |
|-------|-------|
| Area | Database / Normalization |
| Severidade | **MEDIUM** |
| Tabela(s) | `tags` + `lead_tags` vs `crm_tags` + `crm_lead_tags` |
| Impacto | Two parallel tag systems exist. `tags` has columns (nome, cor, categoria, ordem, tenant_id) while `crm_tags` has (name, color, tenant_id). Both have junction tables to `leads`. Additionally, `leads.tags` stores tags as a `text[]` array, creating a third representation. Data inconsistency risk. |
| Esforco | 6 hours |
| Recomendacao | Consolidate into a single tag system. Migrate `crm_tags` data into `tags`. Remove `leads.tags` array column in favor of the junction table. Update all application code to use one system. |

### DEB-DB-003: Duplicate Score Columns on Leads

| Campo | Valor |
|-------|-------|
| Area | Database / Normalization |
| Severidade | **LOW** |
| Tabela(s) | `leads` |
| Impacto | `leads` has both `score` (integer, nullable) and `lead_score` (integer, nullable) columns. Additionally, `crm_lead_scores` table stores scoring history. Unclear which column is authoritative. |
| Esforco | 2 hours |
| Recomendacao | Deprecate one column (likely `score`). Rename the surviving one for clarity. Update hooks/components accordingly. |

### DEB-DB-004: Duplicate Content Columns in whatsapp_messages

| Campo | Valor |
|-------|-------|
| Area | Database / Normalization |
| Severidade | **MEDIUM** |
| Tabela(s) | `whatsapp_messages` |
| Impacto | Both `content` and `message_text` columns exist, both nullable text. This is a vestige of the Evolution API to Kapso migration (2026-03-25). Application code may write to one and read from another, causing data loss or inconsistency. |
| Esforco | 3 hours |
| Recomendacao | Consolidate into single `content` column. Migrate any data from `message_text` where `content` is null. Drop `message_text`. Update Edge Functions and hooks. |

### DEB-DB-005: Missing CHECK Constraints on Status Columns

| Campo | Valor |
|-------|-------|
| Area | Database / Constraints |
| Severidade | **MEDIUM** |
| Tabela(s) | `leads`, `contratos`, `processos`, `agendamentos`, `prazos_processuais`, `honorarios`, `whatsapp_conversations`, `agent_executions`, `workflow_jobs`, `automation_flows` |
| Impacto | All status columns are plain `text` without CHECK constraints. Application code uses hardcoded string constants, but nothing prevents invalid values at the database level. This has already caused issues (the `leads` status system was unified in migration `20260323000001_unify_lead_status_system.sql`). |
| Esforco | 4 hours |
| Recomendacao | Add CHECK constraints or create custom enums for status columns on core tables. Example: `ALTER TABLE leads ADD CONSTRAINT chk_leads_status CHECK (status IN ('novo_lead', 'em_atendimento', 'em_qualificacao', 'proposta_enviada', 'contrato_assinado', 'perdido', 'arquivado'));` |

### DEB-DB-006: Missing Foreign Keys on Utility Tables

| Campo | Valor |
|-------|-------|
| Area | Database / Referential Integrity |
| Severidade | **LOW** |
| Tabela(s) | `api_keys`, `allowed_columns`, `assistant_audit`, `assistant_conversations`, `logs_atividades`, `google_calendar_settings`, `google_calendar_sync_logs` |
| Impacto | These tables lack FK constraints to `tenants` or `profiles`. While `api_keys` has no `tenant_id` at all (global scope -- potentially a security issue), `assistant_audit` and `assistant_conversations` reference `tenant_id` and `user_id` without FK constraints. Orphaned data possible on user/tenant deletion. |
| Esforco | 3 hours |
| Recomendacao | Add FK constraints with appropriate ON DELETE behavior (CASCADE for audit tables, SET NULL for settings). Add `tenant_id` to `api_keys` for multi-tenant isolation. |

### DEB-DB-007: Mixed Naming Convention (Portuguese/English)

| Campo | Valor |
|-------|-------|
| Area | Database / Convention |
| Severidade | **LOW** |
| Tabela(s) | All tables |
| Impacto | Tables mix Portuguese (`agendamentos`, `contratos`, `prazos_processuais`, `honorarios`, `tarefas`) with English (`leads`, `workflow_jobs`, `agent_memory`, `drive_folders`). Column names are similarly mixed: `nome_completo` next to `last_login`, `responsavel_id` next to `created_by`. This increases cognitive load and bug risk. |
| Esforco | N/A (not recommended to change now) |
| Recomendacao | Establish a naming convention for NEW tables/columns. Do not rename existing ones as it would require massive application changes. Recommend English-only for all new entities. Document convention in an ADR. |

### DEB-DB-008: No Consistent Soft-Delete Pattern

| Campo | Valor |
|-------|-------|
| Area | Database / Data Integrity |
| Severidade | **MEDIUM** |
| Tabela(s) | Most tables |
| Impacto | Only `leads` has a soft-delete pattern (`ativo` boolean + `arquivado_em` timestamp + `motivo_arquivamento`). Other tables like `contratos`, `processos`, `agentes_ia` have an `ativo` boolean but no archive metadata. Many tables have no soft-delete at all -- deletions are permanent, risking data loss and audit trail gaps. |
| Esforco | 8 hours |
| Recomendacao | For LGPD compliance and audit requirements, add `deleted_at` timestamptz column to core business tables. Use partial index `WHERE deleted_at IS NULL` for performance. Add database trigger to log deletions to `audit_log`. |

### DEB-DB-009: contratos Has Duplicate Responsavel Columns

| Campo | Valor |
|-------|-------|
| Area | Database / Normalization |
| Severidade | **LOW** |
| Tabela(s) | `contratos` |
| Impacto | `contratos` has both `responsavel` (text, free-form) and `responsavel_id` (uuid FK to profiles). The text field was the original, and the UUID FK was added later. Same pattern exists in `agendamentos` (`responsavel` text + `responsavel_id` uuid). Data can be inconsistent between the two. |
| Esforco | 2 hours |
| Recomendacao | Migrate any data from `responsavel` text column where `responsavel_id` is null (look up by name in profiles). Deprecate and eventually drop the text columns. |

### DEB-DB-010: leads Table Is Excessively Wide (47 Columns)

| Campo | Valor |
|-------|-------|
| Area | Database / Normalization |
| Severidade | **MEDIUM** |
| Tabela(s) | `leads` |
| Impacto | The `leads` table has 47 columns covering CRM state, pipeline tracking, follow-up scheduling, archival metadata, and scoring. This violates single-responsibility principle and causes large row sizes. Every SELECT fetches all columns unless specifically filtered. Combined with `custom_fields` JSONB and `metadata` JSONB, rows can be very large. |
| Esforco | 12 hours |
| Recomendacao | Extract into satellite tables: 1) `lead_pipeline_state` (pipeline_stage_id, score, lead_score, temperature, probability, expected_value). 2) `lead_archive_info` (arquivado_em, arquivado_por, motivo_arquivamento, data_reativacao_prevista). 3) `lead_followup_state` (followup_count, next_followup_at, proxima_acao, proxima_acao_data). Keep only core identity columns on `leads`. |

### DEB-DB-011: Missing Index on whatsapp_messages for Common Queries

| Campo | Valor |
|-------|-------|
| Area | Database / Performance |
| Severidade | **HIGH** |
| Tabela(s) | `whatsapp_messages` |
| Impacto | `whatsapp_messages` is a high-volume table but lacks composite indexes for the most common query pattern: fetching messages by `conversation_id` ordered by `created_at`. The webhook handler and chat UI both query this pattern heavily. Also missing index on `(tenant_id, lead_id)` for lead-scoped message queries. |
| Esforco | 1 hour |
| Recomendacao | `CREATE INDEX idx_whatsapp_messages_conversation_created ON whatsapp_messages(conversation_id, created_at DESC);` and `CREATE INDEX idx_whatsapp_messages_tenant_lead ON whatsapp_messages(tenant_id, lead_id);` |

### DEB-DB-012: api_keys Stores Plaintext Key Values

| Campo | Valor |
|-------|-------|
| Area | Database / Security |
| Severidade | **HIGH** |
| Tabela(s) | `api_keys` |
| Impacto | The `key_value` column stores API keys as plaintext text. No hashing, no encryption. If the database is compromised, all API keys are exposed. The `validar_api_key()` function does a plain text comparison. Also, `api_keys` has no `tenant_id` column, meaning keys are globally scoped -- any tenant's admin could potentially access all keys. |
| Esforco | 4 hours |
| Recomendacao | 1. Hash API keys with SHA-256 + salt before storing. Store only the hash. 2. Show the key only once at creation time. 3. Add `tenant_id` column with FK and RLS policies. 4. Update `validar_api_key()` to compare hashes. |

### DEB-DB-013: google_calendar_tokens Stores OAuth Tokens Without Encryption

| Campo | Valor |
|-------|-------|
| Area | Database / Security |
| Severidade | **HIGH** |
| Tabela(s) | `google_calendar_tokens` |
| Impacto | `access_token` and `refresh_token` are stored as plaintext text columns. While RLS restricts access (one-to-one with user_id), a database breach would expose all Google OAuth tokens, allowing calendar access for all linked users. |
| Esforco | 4 hours |
| Recomendacao | Use the existing `encrypt-data` / `decrypt-data` Edge Functions to encrypt tokens at rest. Or use Supabase Vault for secret storage. Add an ADR documenting the encryption approach. |

### DEB-DB-014: No Partitioning Strategy for High-Volume Tables

| Campo | Valor |
|-------|-------|
| Area | Database / Scalability |
| Severidade | **LOW** |
| Tabela(s) | `whatsapp_messages`, `agent_ai_logs`, `audit_log`, `security_audit`, `webhook_logs`, `conversation_logs` |
| Impacto | Log and message tables will grow unbounded. At scale (100+ tenants, millions of messages), these tables will degrade in performance even with indexes. No archiving or retention policy is enforced at the database level (though `data-retention-cleanup` Edge Function exists). |
| Esforco | 8 hours |
| Recomendacao | 1. Implement range partitioning by `created_at` on `whatsapp_messages` and `agent_ai_logs`. 2. Add retention policies as pg_cron jobs (or Supabase scheduled functions). 3. Archive old partitions to cold storage. Consider implementing at 50K+ rows per table. |

### DEB-DB-015: N+1 Query Pattern in assistant Edge Function

| Campo | Valor |
|-------|-------|
| Area | Database / Performance |
| Severidade | **MEDIUM** |
| Tabela(s) | `leads`, `contratos` |
| Impacto | The `assistant` Edge Function makes 4+ sequential queries for dashboard data: leads by status, contratos count, contratos value sum, and conversion rate calculation. Each is a separate round-trip. This should use a single RPC or the existing `get_dashboard_metrics()` function. |
| Esforco | 2 hours |
| Recomendacao | Replace sequential queries in `assistant/index.ts` (lines 511-526) with a single call to `get_dashboard_metrics(tenant_id)` or a new dedicated RPC that returns all assistant-needed metrics in one query. |

### DEB-DB-016: Missing Indexes on crm_followups for Schedule Queries

| Campo | Valor |
|-------|-------|
| Area | Database / Performance |
| Severidade | **MEDIUM** |
| Tabela(s) | `crm_followups` |
| Impacto | `crm_followups` is queried by `(tenant_id, status, scheduled_at)` for the follow-up queue, by `(lead_id, status)` for lead detail pages, and by `(assigned_to, status)` for user dashboards. No composite indexes exist for any of these patterns. |
| Esforco | 1 hour |
| Recomendacao | `CREATE INDEX idx_followups_tenant_status_scheduled ON crm_followups(tenant_id, status, scheduled_at);` and `CREATE INDEX idx_followups_lead_status ON crm_followups(lead_id, status);` |

### DEB-DB-017: No Data Retention Policy for Log Tables

| Campo | Valor |
|-------|-------|
| Area | Database / Scalability |
| Severidade | **MEDIUM** |
| Tabela(s) | `agent_ai_logs`, `logs_atividades`, `logs_execucao_agentes`, `webhook_logs`, `conexoes_logs`, `google_calendar_sync_logs`, `automation_executions` |
| Impacto | While `data-retention-cleanup` Edge Function exists, there is no database-level enforcement. If the function fails or is not scheduled, log tables grow indefinitely. The `agent_ai_logs` table stores `full_result` (entire AI responses) and `system_prompt` as text -- potentially very large rows. |
| Esforco | 3 hours |
| Recomendacao | 1. Add `created_at` index on all log tables (some already have it). 2. Create a pg_cron job or Supabase scheduled function for retention. 3. Consider moving `full_result` and `system_prompt` from `agent_ai_logs` to a separate `agent_ai_log_details` table or to storage. |

---

## RLS Audit

### Coverage Summary

| Status | Count | Tables |
|--------|-------|--------|
| RLS Enabled + Tenant Policies | 40+ | All core business tables |
| RLS Enabled + Special Policies | 6 | profiles, user_roles, user_permissions, system_settings, notification_templates, role_permissions |
| RLS Enabled + Service-Role Only | 5 | webhook_events, webhook_logs, zapsign_logs, rate_limits, allowed_columns |
| Missing/Unclear RLS | 3 | api_keys, api_rate_limits, legal_knowledge |

### RLS Quality Assessment

**Strengths:**
- All policies use `get_current_tenant_id()` (cached STABLE function) -- no repeated subqueries
- Permission-gated writes on core tables via `has_permission()` function
- Profiles have proper self + same-tenant visibility pattern
- `user_roles` now has direct `tenant_id` column (migration 20260402000004) eliminating the JOIN-based RLS

**Concerns:**
- `api_keys` has NO RLS policies and no `tenant_id` -- globally accessible to anyone with service_role key
- `legal_knowledge` has no tenant_id -- vector search function handles filtering but direct table access is unprotected
- `configuracoes_integracoes` has nullable `tenant_id` -- integration configs could leak between tenants

---

## Index Audit

### Coverage Assessment: Good (85/100)

**Well-indexed:**
- All tenant_id columns have BTREE indexes (13 core tables)
- Dashboard query patterns covered (leads by status, area, created_at)
- RLS performance optimized (profiles id+tenant composite index)
- Webhook deduplication (unique index on event_id+source)
- Agent memory semantic search (importance ranking, expiry cleanup)

**Missing indexes (identified):**
1. `whatsapp_messages(conversation_id, created_at DESC)` -- HIGH impact
2. `whatsapp_messages(tenant_id, lead_id)` -- MEDIUM impact
3. `crm_followups(tenant_id, status, scheduled_at)` -- MEDIUM impact
4. `crm_followups(lead_id, status)` -- MEDIUM impact
5. `processos(tenant_id, status)` -- MEDIUM impact (legal case listing)
6. `processos(tenant_id, lead_id)` -- MEDIUM impact (lead detail view)
7. `honorarios(tenant_id, status)` -- LOW impact
8. `documentos_juridicos(tenant_id, processo_id)` -- MEDIUM impact
9. `lead_historico(lead_id, created_at DESC)` -- MEDIUM impact (timeline view)

**Potential over-indexing:**
- `agendamentos` has both `idx_agendamentos_tenant_data` and `idx_agendamentos_future` covering similar patterns
- `leads` has 5+ composite indexes -- monitor write performance impact

---

## Constraint Audit

### Missing NOT NULL Constraints

| Table | Column | Should Be NOT NULL |
|-------|--------|--------------------|
| `whatsapp_messages` | `tenant_id` | YES -- critical for RLS |
| `whatsapp_sessions` | `tenant_id` | YES -- critical for RLS |
| `lead_interactions` | `tenant_id` | YES -- critical for RLS |
| `conversation_logs` | `tenant_id` | YES -- critical for RLS |
| `configuracoes_integracoes` | `tenant_id` | YES -- critical for RLS |
| `knowledge_base` | `tenant_id` | YES -- critical for RLS |
| `hitl_requests` | `tenant_id` | YES -- critical for RLS |
| `pagamentos` | `tenant_id` | YES -- critical for RLS |
| `audit_log` | `tenant_id` | YES -- audit completeness |
| `profiles` | `tenant_id` | Debatable -- null during signup flow |

### Missing UNIQUE Constraints

| Table | Columns | Reason |
|-------|---------|--------|
| `leads` | `(tenant_id, cpf_cnpj)` | Prevent duplicate clients per tenant |
| `leads` | `(tenant_id, email)` | Prevent duplicate email per tenant (where email is not null) |
| `processos` | `(tenant_id, numero_processo)` | Prevent duplicate case numbers per tenant |
| `crm_pipeline_stages` | `(tenant_id, slug)` | Ensure unique stage slugs per tenant |
| `departamentos` | `(tenant_id, nome)` | Prevent duplicate department names |

### Missing CHECK Constraints
See DEB-DB-005 for details on status columns.

---

## Performance Audit

### Query Pattern Analysis

**Well-optimized:**
- Dashboard uses materialized views (`mv_dashboard`) -- refreshed on demand, not per-request
- `process-prazos-alerts` batches tenant config queries (avoids N+1)
- Agent orchestrator is server-to-server (no RLS overhead)
- `v_leads_operacional` view pre-joins department, pipeline stage, and responsavel data

**Optimization opportunities:**
1. **assistant Edge Function** -- 4 sequential queries could be 1 RPC call (DEB-DB-015)
2. **whatsapp_messages pagination** -- no cursor-based pagination support; offset-based will degrade at scale
3. **leads SELECT *_** -- wide table (47 columns) fetched in full for list views; should use column projection
4. **Materialized view refresh** -- `refresh_dashboard_views()` refreshes ALL views simultaneously; consider incremental refresh or per-metric refresh

### Connection Pooling
- Edge Functions create a new Supabase client per request (standard pattern)
- No connection pooling configuration visible in `config.toml` -- relies on Supabase default PgBouncer

---

## Security Audit

### Strengths
- RLS hardened: removed all `OR tenant_id IS NULL` bypass patterns
- Service-role key validation on internal Edge Functions (agent-orchestrator, process-prazos-alerts)
- CORS strict whitelist with regex matching for Vercel preview deployments
- Rate limiting via `check_rate_limit()` RPC with fallback
- Document integrity via `document_hashes` with hash verification function
- `exec_sql()` exists but gated behind admin permission (should still be monitored)

### Concerns
1. **api_keys plaintext storage** (DEB-DB-012) -- CRITICAL
2. **OAuth tokens plaintext** (DEB-DB-013) -- HIGH
3. **`exec_sql()` function** -- Allows arbitrary SQL execution. Even with admin gating, this is a significant attack surface. Should be removed or restricted to specific operations.
4. **`configuracoes_integracoes.api_key`** -- Integration API keys stored as plaintext text column
5. **agent_ai_logs stores full prompts** -- `system_prompt` and `user_prompt` columns may contain sensitive client data; no PII redaction at the database level

---

## Recomendacoes Priorizadas

### P0 -- Critical (do immediately)

| ID | Finding | Esforco |
|----|---------|---------|
| DEB-DB-001 | Make `tenant_id` NOT NULL on 10 tables | 4h |
| DEB-DB-012 | Hash API keys, add tenant scoping | 4h |

### P1 -- High (do this sprint)

| ID | Finding | Esforco |
|----|---------|---------|
| DEB-DB-013 | Encrypt OAuth tokens at rest | 4h |
| DEB-DB-011 | Add whatsapp_messages indexes | 1h |
| DEB-DB-005 | Add CHECK constraints on status columns | 4h |

### P2 -- Medium (next sprint)

| ID | Finding | Esforco |
|----|---------|---------|
| DEB-DB-002 | Consolidate duplicate tag systems | 6h |
| DEB-DB-004 | Consolidate whatsapp_messages content columns | 3h |
| DEB-DB-008 | Implement consistent soft-delete pattern | 8h |
| DEB-DB-010 | Extract satellite tables from leads | 12h |
| DEB-DB-015 | Fix N+1 in assistant Edge Function | 2h |
| DEB-DB-016 | Add crm_followups indexes | 1h |
| DEB-DB-017 | Database-level data retention enforcement | 3h |

### P3 -- Low (backlog)

| ID | Finding | Esforco |
|----|---------|---------|
| DEB-DB-003 | Consolidate duplicate score columns | 2h |
| DEB-DB-006 | Add FKs to utility tables | 3h |
| DEB-DB-007 | Document naming convention ADR | 1h |
| DEB-DB-009 | Remove duplicate responsavel text columns | 2h |
| DEB-DB-014 | Partitioning strategy for high-volume tables | 8h |

**Total estimated effort:** ~68 hours

---

## Perguntas para @architect

1. **Soft-delete strategy**: Should we adopt `deleted_at` timestamptz pattern across all core tables, or keep the current `ativo` boolean approach? LGPD data retention requirements may dictate this.

2. **Tag system consolidation**: Which tag system should survive -- `tags`/`lead_tags` (Portuguese, more features: categoria, ordem) or `crm_tags`/`crm_lead_tags` (English, simpler)? Or should we create a new unified system?

3. **Leads table width**: Is the 47-column `leads` table acceptable for the current scale, or should we extract satellite tables now? The `v_leads_operacional` view already pre-joins related data, so the impact on reads may be manageable.

4. **exec_sql() function**: Should this function be dropped entirely? It allows arbitrary SQL execution and is a significant attack surface even with admin gating. What legitimate use case requires it?

5. **Partitioning timeline**: At what tenant/message volume should we implement partitioning on `whatsapp_messages` and `agent_ai_logs`? Current row estimates would help make this decision.

6. **api_keys global scope**: Should `api_keys` be tenant-scoped (multi-tenant) or remain global? If global, what is the intended use case and who should have access?

7. **Legal knowledge vector search**: `legal_knowledge` table has no `tenant_id`. Is this intentional (shared knowledge base across tenants) or an oversight? If shared, how do we prevent one tenant's legal strategies from being exposed to another?

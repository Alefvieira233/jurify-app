# Jurify — Migration Squash Reference

## Status
- **Total migrations**: 55 files
- **Date range**: 2025-06-14 → 2025-12-17+
- **Placeholders**: 11 files (empty `remote_placeholder`)
- **Substantive migrations**: 44 files

## Consolidated Schema Groups

### Group 1: Core Tables (leads, contratos, agendamentos, profiles, agentes_ia)
- `20250614202756` — leads table + seed data
- `20250614204153` → `20250614234607` — contratos, agendamentos, agentes_ia, profiles, notificacoes, logs_execucao_agentes, configuracoes_integracoes
- `20250615001153` → `20250615134623` — user_permissions, api_keys, lead_interactions, contratos_uploads

### Group 2: Security & RLS
- `20250615170000` — enable_rls_all_tables (leads, contratos, agendamentos, agentes_ia, logs, notificacoes)
- `20250615180000` — fix_tenant_id_columns
- `20250618000000` — fix_all_rls_policies
- `20250618000001` — safe_rls_policies
- `20250727000001` — cleanup_dangerous_policies

### Group 3: Performance & Subscriptions
- `20250727000000` — performance_indexes + materialized views + log partitioning
- `20250728000000` — plans + subscriptions tables

### Group 4: AI Agents & Mission Control
- `20251210000000` — agent_ai_logs + materialized stats view + LGPD cleanup
- `20251210000001` — agent_executions + realtime + views + cost calculation

### Group 5: WhatsApp & Dashboard
- `20251211000000` — whatsapp_conversations + whatsapp_messages + realtime
- `20251211000001` — dashboard_optimization

### Group 6: Fixes & Patches
- `20251217000000` — fix_service_role_logs
- `20251217000001` — fix_service_role_executions
- `20251217000002` — populate_missing_tenant_ids
- Remaining 5 files — additional patches

## ⚠️ Important Notes

1. **DO NOT delete existing migrations** — they are already applied to production Supabase.
2. **Squashing requires `supabase db reset`** on a fresh database — never on production.
3. The consolidated migration below is for **new environments only** (dev, staging, CI).
4. To squash for real: `supabase migration squash --linked` (requires Supabase CLI v2+).

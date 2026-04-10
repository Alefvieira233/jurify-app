# Database Audit — Jurify Supabase

**Auditor:** @data-engineer (Dara)
**Date:** 2026-04-10
**Scope:** `supabase/migrations/` (152 files) + `supabase/functions/` + frontend DB access
**Mode:** Static analysis only (read-only, no live DB connection)

---

## Schema Health Score: **78 / 100**

**Verdict:** Healthy, multi-tenant posture is mostly solid. The recent audit sprint (2026-04-05 through 2026-04-09) closed the worst RLS liberal-policy holes. Remaining issues cluster around (a) one lingering RLS bypass on `google_calendar_tokens`, (b) a dead-but-still-queried materialized view with stale status values, (c) Edge Function code that writes to plaintext columns that a later migration may have dropped, and (d) a hardcoded anon-JWT embedded in a pg_cron migration.

### Metrics

| Metric | Value |
|---|---|
| Migration files | 152 |
| `CREATE TABLE` statements | 87 (across 50 files) |
| `CREATE INDEX` statements | 335 (across 69 files) |
| `CREATE POLICY` statements | 475 (across 79 files) |
| RPCs with `SECURITY DEFINER` | 118 occurrences across 53 files |
| Edge Functions | 36 |
| `select('*')` in edge functions | 3 (agentes-ia-api, ai-agent-processor with count-head, google-oauth) |
| `select('*')` in `src/` | 6 (all in admin/security/backup/seed paths, acceptable) |
| Timestamptz compliance | 100% (no `TIMESTAMP WITHOUT TIME ZONE` found) |
| Money types | All `NUMERIC(n,2)` (correct, no `FLOAT`/`MONEY`) |
| ID types | All `UUID` |

---

## Findings

### P0 — Critical (fix immediately)

#### P0-1 — `google_calendar_tokens` RLS bypass for all authenticated users
**File:** `supabase/migrations/20260227000000_google_calendar_tokens_profile_fields.sql:12-16`

```sql
CREATE POLICY IF NOT EXISTS "Service role manages tokens"
  ON public.google_calendar_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

**Why it's a P0:** No `TO service_role` clause. Postgres applies policies without a role specifier to **all roles**, including `authenticated`. Combined with the OR-semantic stacking, any authenticated user can read, update, or delete *all* Google Calendar tokens (access + refresh tokens) across every tenant. This is a direct multi-tenant breach of secrets. Comment says "Allow service role to upsert" but the code does the opposite. Prior liberal policy was dropped in `20260407000003_fix_remaining_liberal_rls.sql:48`, but this 2026-02-27 policy re-opened it and was never re-hardened.

**Fix:**
```sql
DROP POLICY IF EXISTS "Service role manages tokens" ON public.google_calendar_tokens;
CREATE POLICY "gct_service_role" ON public.google_calendar_tokens
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
-- User self-access remains via apply_rls_defaults('google_calendar_tokens', 'user')
-- applied earlier in 20260301000000_rls_hardening_unrestricted.sql:279.
```

---

#### P0-2 — Google OAuth Edge Functions write to plaintext columns that may no longer exist
**Files:**
- `supabase/functions/google-calendar/oauth.ts:117-129` — upserts `access_token` and `refresh_token` as plaintext
- `supabase/functions/google-calendar/google-oauth.ts:31-50` — reads `token.access_token` / `token.refresh_token` directly
- Migration 20260403000006 added `_encrypted` columns (dual-read prep)
- Migration `20260406000002_drop_plaintext_secrets.sql:50-78` drops `access_token` and `refresh_token` if `_encrypted` twins exist

**Why it's a P0:** If migration 20260406000002 actually dropped the plaintext columns (the guarded `DO $$ ... IF EXISTS (_encrypted) ...` block fires when encrypted columns are present and 20260403000006 adds them unconditionally), then every Google OAuth `exchangeCode` call throws a column-not-found error, silently breaking the Google Calendar integration. Conversely, if the drop did NOT fire, then the encrypted columns are there but never populated — encryption is security theater while plaintext tokens are still being written. Either way, **this is broken by contract**.

**Fix:** 
1. Inspect live DB: confirm if `access_token` column still exists.
2. Update both edge function files to write `access_token_encrypted` via the `encrypt-data` function, and read via `decrypt-data`.
3. Drop the guard in 20260406000002 once migration is confirmed stable.

---

#### P0-3 — Stale materialized view with obsolete status values, still referenced by RPCs
**File:** `supabase/migrations/20260225000002_materialized_views_dashboard.sql:10-24`

```sql
CREATE MATERIALIZED VIEW mv_leads_metrics AS SELECT
  COUNT(*) FILTER (WHERE status = 'novo_lead') AS status_novo_lead,
  COUNT(*) FILTER (WHERE status = 'em_qualificacao') AS status_em_qualificacao,
  COUNT(*) FILTER (WHERE status = 'proposta_enviada') AS status_proposta_enviada,
  COUNT(*) FILTER (WHERE status = 'contrato_assinado') AS status_contrato_assinado,
  ...
```

**Why it's a P0:** Migration `20260323000001_unify_lead_status_system.sql:7-14` renamed all lead status values (`novo_lead` → `novo`, `em_qualificacao` → `qualificado`, `proposta_enviada` → `proposta`, `contrato_assinado` → `ganho`, etc.). The materialized view was **never updated**. Its FILTER clauses now match zero rows. The view is consumed by `get_leads_metrics()` in `supabase/migrations/20260405000001_p0_secure_views_and_legal_knowledge.sql:130-138`, which is still a callable RPC returning all-zero counts. The frontend currently calls the newer `get_dashboard_metrics` RPC (`src/hooks/useDashboardMetricsFast.ts:105`), so users don't see the zeroes — but any dashboard component or integration using the older `get_leads_metrics()` gets silently wrong data. Dead RPC returning plausible-but-wrong data is worse than a deleted RPC.

**Fix:** Either (a) `DROP MATERIALIZED VIEW mv_leads_metrics CASCADE` and delete `get_leads_metrics()`, or (b) rewrite the MV with the unified status values and the same `REFRESH CONCURRENTLY` cadence. Recommend (a) since `get_dashboard_metrics` now serves the same purpose with fresher data.

---

### P1 — High (fix this sprint)

#### P1-1 — Hardcoded anon JWT inside pg_cron migration
**File:** `supabase/migrations/20260307000007_prazos_alerts_scheduler.sql:18`

The migration embeds a production anon JWT directly in the SQL:
```sql
'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIs...'
```

**Why P1:** (a) the key is now permanently committed to git history for anyone with repo read access; (b) if/when the anon key is rotated (memory says it must be rotated by 2026-04-08), the cron job silently breaks with no deploy trigger; (c) coupling secret rotation to migration replay is a footgun.

**Fix:** Use `vault.secrets` or `GUC settings` (`current_setting('app.supabase_anon_key')`) read at schedule time. Or switch to external cron (Vercel cron / GitHub Actions) that uses secrets from the platform. Delete this line of the migration history via a forward-fixing migration that `cron.unschedule`s and re-schedules with a `vault`-based secret.

---

#### P1-2 — `pg_cron` migrations assume unavailable extension
**Files:**
- `supabase/migrations/20260307000007_prazos_alerts_scheduler.sql:5-23` — `CREATE EXTENSION IF NOT EXISTS pg_cron`, then unconditional `cron.schedule(...)`
- `supabase/migrations/20260408000004_prazo_vencido_alert_function.sql:92-104` — correctly guarded with `IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')`
- `supabase/migrations/20260307000007` has NO such guard

Per memory/project notes, `pg_cron` is **not available** on the Supabase project. The first file will fail on replay; the second one degrades gracefully.

**Fix:** Wrap the `cron.schedule` call in 20260307000007 with the same `IF EXISTS` guard used in 20260408000004. Alternatively, move both to a dedicated `infra/cron/` directory applied only to environments that enable the extension.

---

#### P1-3 — `get_dashboard_metrics` RPC executes 19 scalar subqueries per call (no real N+1, but inefficient)
**File:** `supabase/migrations/20260408000003_create_dashboard_metrics_rpc.sql:40-71`

Each metric is an independent `SELECT count(*) FROM ... WHERE tenant_id = _tenant_id` — 19 table scans per invocation. Postgres may partially parallelize, but at scale (many tenants × dashboard polling every 5 min via realtime) this becomes a hotspot. The `idx_leads_tenant_status` index added in 20260408000005 helps the 7 `leads` scans but `agent_executions` still has 4 scans that could be a single grouped query.

**Fix:** Collapse into a single CTE per source table:
```sql
WITH lead_counts AS (
  SELECT status, count(*) AS n
  FROM leads WHERE tenant_id = _tenant_id
  GROUP BY status
),
...
```
Cuts table scans from 19 → 5. Alternatively, return a `jsonb` payload computed in one pass.

---

#### P1-4 — `check_prazos_vencendo` loops with per-row INSERTs, no transaction batching
**File:** `supabase/migrations/20260408000004_prazo_vencido_alert_function.sql:17-75`

Classic row-by-row cursor over `prazos_processuais`. For each pending deadline, a separate `INSERT` into `notificacoes`. With N tenants × M deadlines, performance is O(N*M) round trips inside the function. Should be a single `INSERT ... SELECT FROM prazos_processuais LEFT JOIN notificacoes WHERE ...` with the dedup check inlined. Also no explicit transaction control — whole thing runs in the caller's transaction and can lock `notificacoes` for long runs.

**Fix:** Replace the `FOR rec IN ... LOOP ... INSERT` with a single set-based `INSERT ... SELECT` that computes the CASE expressions inline. Add `LIMIT 10000` safety cap per run.

---

#### P1-5 — `sync_conversation_from_lead` trigger runs UPDATE on every status change, including no-op cases
**File:** `supabase/migrations/20260409000002_sync_lead_conversation_status.sql:43-49`

The `UPDATE whatsapp_conversations SET status = new_conv_status` runs on every lead status change, even when no conversations exist for the lead. With large tenants this acquires a row-level lock loop even when it has nothing to do. The guard `status <> new_conv_status` helps on the row level but the UPDATE itself runs an index scan. Also, the `updated_at = now()` cascade bumps `updated_at` for the conversation every time, which triggers realtime subscribers unnecessarily (the `useWhatsAppConversations` hook will refetch).

**Fix:** Short-circuit by checking `EXISTS (SELECT 1 FROM whatsapp_conversations WHERE lead_id = NEW.id)` before the UPDATE. Also only set `updated_at` if the new conv status actually differs.

---

#### P1-6 — Migration naming inconsistency + legacy Lovable cryptic names
**Files:** 20+ migrations from 2025-06-14/15 use Lovable-generated UUIDs (`20250614202756-1d6b4f53-2086-4367-9a37-1f57b5c532aa.sql`)

These don't describe intent, making `git blame` archaeology painful. Not a runtime risk, but an ongoing maintainability debt and slows down rollback reasoning.

**Fix:** `SQUASH_REFERENCE.md` is already in the migrations directory, implying a squash is planned. Execute it before the next migration wave, or at minimum prefix each legacy file with a description suffix (requires a `supabase migration repair` for each, or just a doc index).

---

#### P1-7 — `auto_generate_contract_on_won` trigger has no error handling
**File:** `supabase/migrations/20260409000007_auto_contract_on_lead_won.sql:7-70`

If any INSERT INTO contratos fails (e.g., FK violation, schema drift), the entire lead status update rolls back because the trigger is `AFTER UPDATE` in the same transaction. A lead can't be marked `ganho` if contract generation fails. Worse, the trigger is `SECURITY DEFINER` and executes unconditionally — no tenant-level config to disable it.

**Fix:** Wrap the INSERT in a `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END` sub-block that logs to `notificacoes` on failure but does not propagate the error. Add a `tenant_settings.auto_contract_on_won BOOLEAN DEFAULT true` flag to allow opt-out.

---

### P2 — Medium (next sprint)

#### P2-1 — `is_admin_or_manager()` is `SECURITY DEFINER` but not marked `STABLE` parallel-safe
**File:** `supabase/migrations/20260409000001_rls_leads_department_visibility.sql:12-26`

The function is `STABLE` but lacks `PARALLEL SAFE`, so it disables parallel query plans on `leads` SELECT — which is exactly the hot path it was designed to optimize. Since it reads `user_roles` table only by `auth.uid()` and `get_current_tenant_id()`, it is parallel-safe.

**Fix:** `CREATE OR REPLACE FUNCTION ... LANGUAGE sql STABLE PARALLEL SAFE SECURITY DEFINER ...`

---

#### P2-2 — `apply_rls_defaults(..., 'user')` creates unclear policy names
**File:** `supabase/migrations/20260301000000_rls_hardening_unrestricted.sql:259-262`

Generated policies like `google_calendar_tokens_select`, `google_calendar_tokens_insert`, etc. conflict with hand-written policies named similarly. When debugging `pg_policies`, operators see duplicates and can't tell which one is the authoritative source.

**Fix:** Use prefixed names: `ensure_policy(_table, 'gen_' || _table || '_select', ...)` so generated vs. hand-written are visually distinct.

---

#### P2-3 — `validate_lead_status_transition` uses `current_setting('role', true)` bypass
**File:** `supabase/migrations/20260408000002_lead_status_state_machine.sql:28-30`

```sql
IF current_setting('role', true) = 'service_role' THEN
  RETURN NEW;
END IF;
```

This works but `current_setting('role')` returns the session role, which may be `authenticator` even for service-role calls in newer Supabase auth. Better to use `auth.role()` which is the canonical Supabase helper.

**Fix:** `IF auth.role() = 'service_role' THEN RETURN NEW; END IF;`

---

#### P2-4 — `get_dashboard_metrics` and `get_leads_por_area` are `SECURITY DEFINER` with no `_tenant_id` verification
**File:** `supabase/migrations/20260408000003_create_dashboard_metrics_rpc.sql:31-93`

Both RPCs accept `_tenant_id uuid` as a parameter and trust it blindly. Because they're `SECURITY DEFINER`, they bypass RLS. Any authenticated user in any tenant can call `rpc('get_dashboard_metrics', { _tenant_id: 'any-other-tenant-uuid' })` and see another tenant's entire aggregate metrics.

**Fix:** At the start of each function:
```sql
IF _tenant_id <> public.get_current_tenant_id() AND NOT public.is_admin(auth.uid()) THEN
  RAISE EXCEPTION 'Access denied: tenant mismatch';
END IF;
```
Or switch to `SECURITY INVOKER` and let RLS filter, since the aggregates are computed over tenant-scoped queries anyway.

**Severity:** Borderline P1 — call it P2 because the data is aggregate counts (not PII), but the tenant-boundary violation is real.

---

#### P2-5 — `legal_knowledge` still has a permissive `SELECT` policy for all authenticated users
**File:** `supabase/migrations/20260125000000_enable_vector_search.sql:44-48`

```sql
CREATE POLICY "Authenticated users can read legal knowledge"
  ON public.legal_knowledge FOR SELECT
  TO authenticated USING (true);
```

Migration 20260405000001 added a tenant-scoped SELECT policy on top, but **did not drop the liberal one**. RLS OR-semantics means the liberal one still applies. Any user can read any tenant's legal_knowledge embeddings (which may leak case facts embedded as vectors).

**Fix:** `DROP POLICY "Authenticated users can read legal knowledge" ON public.legal_knowledge;`

---

#### P2-6 — Destructive `DROP TABLE CASCADE` batch without documentation of downstream dependencies
**File:** `supabase/migrations/20260405000002_p1_cleanup_dead_tables_and_redundancy.sql:22-134`

14 `DROP TABLE ... CASCADE` calls in one migration. CASCADE auto-drops all dependent objects (views, foreign keys, triggers, indexes). No pre-check of `pg_depend` to log what was actually dropped. If any production system still references these tables (e.g., an external BI tool, a forgotten Grafana dashboard, or a Postgres logical replication slot), it breaks silently.

**Fix:** Future destructive migrations should `SELECT * FROM pg_depend WHERE refobjid = '<table>'::regclass` first, RAISE NOTICE the count, then DROP. For this specific file, add a forward-fixing migration that recreates any accidentally dropped permissioned views if discovered.

---

#### P2-7 — FK additions lack composite indexes
**File:** `supabase/migrations/20260404000007_add_missing_fks.sql` (entire file)

15 new FK constraints added. Postgres does **not** automatically index the FK side. For high-churn FKs (e.g., `agent_executions.agente_id`, `contratos.lead_id`), missing indexes cause `DELETE CASCADE` scans and slow JOIN plans. Migration 20260309000001 and 20260409000006 add *some* indexes, but not a complete mapping to the FKs from 20260404000007.

**Fix:** For each `ADD CONSTRAINT ... FOREIGN KEY (col) REFERENCES ...`, add `CREATE INDEX IF NOT EXISTS idx_<table>_<col> ON <table>(<col>);` in the same migration.

---

#### P2-8 — `mv_leads_por_area` materialized view — orphaned but not dead
**File:** `supabase/migrations/20260225000002_materialized_views_dashboard.sql:30-40`

Unlike `mv_leads_metrics`, this view uses a `GROUP BY area_juridica` query, so status changes don't affect it. However, it is no longer queried by the frontend (which uses `get_leads_por_area` RPC directly). It refreshes as dead weight. Should be dropped alongside P0-3 cleanup.

---

#### P2-9 — `cleanup_expired_data` deletes from tables some of which were `DROP TABLE CASCADE`d
**File:** `supabase/migrations/20260408000001_add_automation_tasks_cleanup.sql:65-69` (ref `zapsign_logs`)

Migration 20260408000001 DELETEs from `webhook_events`, `google_calendar_sync_logs`, `assistant_audit`, `zapsign_logs`, etc. Migration `20260405000002_p1_cleanup_dead_tables_and_redundancy.sql:52` drops `webhook_logs CASCADE` — which is similar to but NOT the same as `webhook_events`. Cross-check that all tables referenced in the cleanup function still exist. If any were dropped, the function raises on first invocation.

**Fix:** Add a pre-check in the cleanup function: `IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '<table>') THEN DELETE ... END IF;` per block.

---

#### P2-10 — `apply_rls_defaults` helper uses `FORCE ROW LEVEL SECURITY` which may break legitimate service_role queries
**File:** `supabase/migrations/20260301000000_rls_hardening_unrestricted.sql:111`

```sql
EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', _table);
```

`FORCE RLS` applies RLS even to table owner / `BYPASSRLS` roles — which can break Supabase's internal `postgres` role operations (migrations, partitioning, VACUUM analysis). Usually harmless in cloud Supabase, but on self-hosted or during migration replay this can cause mysterious permission denials.

**Fix:** Only apply `FORCE RLS` to tables that do not need service_role access. Or use `ALTER ROLE service_role BYPASSRLS` explicitly and drop FORCE.

---

## Checklist Coverage

| # | Item | Status |
|---|---|---|
| 1 | Migrations naming & destructive ops | Covered (P1-6, P2-6, P2-9) |
| 2 | RLS policies `USING (true)` audit | Covered (P0-1, P2-5) |
| 3 | Indexes & FK coverage | Covered (P2-7, metrics block) |
| 4 | Trigger loop analysis (sync + state machine) | Covered (P1-5, triggers verified safe) |
| 5 | RPCs scalability & SECURITY DEFINER | Covered (P1-3, P1-4, P2-4) |
| 6 | Dead schema | Covered (P0-3, P2-8) |
| 7 | Data types (timestamptz / UUID / NUMERIC) | Covered (metrics, 100% compliant) |
| 8 | Edge function DB access | Covered (P0-2, 3 select('*') found — 2 with tenant filter, 1 broken) |
| 9 | RLS × frontend belt-and-suspenders | Covered — verified in `useLeadsQuery.ts:146-170` |
| 10 | pg_cron availability | Covered (P1-1, P1-2) |

---

## Trigger Loop Analysis (deep dive)

The bidirectional `leads ↔ whatsapp_conversations` status sync was reviewed against the state machine:

1. **Lead `novo → em_contato`** (user action)
   - `validate_lead_status_transition` passes (`em_contato` in allowed list)
   - `sync_conversation_from_lead` fires → sets conv to `ativo`
   - Conv status change triggers `sync_lead_from_conversation`
   - Guard: `IF NEW.status <> 'finalizado' THEN RETURN NEW` — short-circuits immediately. **No loop.**

2. **Lead `proposta → ganho`** (user action)
   - State machine allows.
   - `sync_conversation_from_lead` → conv becomes `finalizado`
   - `sync_lead_from_conversation` fires: NEW.status = `finalizado` passes guard, reads current lead status (`ganho`), guard `IF current_lead_status IN ('novo', 'em_contato')` fails, no update. **No loop.**

3. **Manual conversation `ativo → finalizado`** (user closes chat)
   - `sync_lead_from_conversation` fires, gets current lead status
   - If lead in (`novo`, `em_contato`), sets to `perdido`
   - `sync_conversation_from_lead` fires on lead update: new_conv_status would be `finalizado` (from `perdido`), matches current, `WHERE status <> new_conv_status` filter prevents UPDATE. **No loop.**

**Verdict:** Loop-safe, but inefficient (P1-5). No additional lock is used — relies on the value-equality guards. If two concurrent transactions update lead and conv simultaneously, there's a theoretical race where both triggers fire but end state is still correct due to idempotency of the mappings.

---

## What's Healthy

1. **Timestamptz everywhere** — no naive timestamps found.
2. **Money uses NUMERIC(n,2)** — no FLOAT/MONEY contamination.
3. **UUID IDs throughout** — no SERIAL/BIGSERIAL leaks.
4. **RLS coverage** — all tenant-scoped tables have RLS enabled (mostly via `apply_rls_defaults` helper).
5. **Belt-and-suspenders in frontend** — every tenant-scoped query in `src/` adds `.eq('tenant_id', ...)` even though RLS is the primary guard. 209 such occurrences.
6. **Service role bypass is audited** — most policies are correctly scoped `TO service_role` (rate_limits, legal_knowledge, agent_training_documents, vector_search).
7. **Recent migrations (2026-04) demonstrate senior discipline** — idempotent `DO $$ BEGIN ... EXCEPTION ... END $$` blocks, defense-in-depth RLS, documented intent in migration headers.
8. **State machine trigger** — correct forward-progression validation, terminal `ganho` state, service_role bypass, legacy status tolerance.
9. **Dead table cleanup was performed** (20260405000002) — only minor follow-ups remain.
10. **FK additions migration** (20260404000007) proves the schema is becoming referential-integrity-complete.

---

## Priority Queue

1. **P0-1** — Fix `google_calendar_tokens` RLS (10 minutes, one migration)
2. **P0-2** — Verify and fix Google OAuth token write path (1 hour, includes live DB check)
3. **P0-3** — Drop or rewrite `mv_leads_metrics` (30 min)
4. **P1-1** — Vault-ify the hardcoded anon JWT (1 hour)
5. **P1-2** — Guard `pg_cron` calls (15 min)
6. **P1-3** — Optimize `get_dashboard_metrics` CTE rewrite (2 hours)
7. **P1-4** — Set-based `check_prazos_vencendo` (1 hour)
8. **P1-5** — Short-circuit `sync_conversation_from_lead` (15 min)
9. **P2-4** — Tenant verification in dashboard RPCs (30 min)
10. **P2-5** — Drop liberal `legal_knowledge` SELECT (5 min)

**Estimated total to close P0+P1:** ~7 hours engineering, plus a live DB inspection window.

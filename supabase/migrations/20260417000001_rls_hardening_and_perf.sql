-- ============================================================================
-- RLS Hardening + Index Consolidation (Onda 1, P0/P1/P2)
--
-- Date:        2026-04-17
-- Based on:    docs/audit/2026-04-17/00-EXECUTIVE-SUMMARY.md
-- Affects:
--   - audit_log_archive  (ENABLE + FORCE RLS, service-only policy)
--   - legal_knowledge    (drop liberal policy, NOT NULL tenant_id, scoped policy)
--   - webhook_events     (explicit service-only policy; was RLS-on-no-policies)
--   - 42 tables          (FORCE ROW LEVEL SECURITY across public schema, except whitelist)
--   - audit_log, user_roles (best-effort tenant_id NOT NULL — defensive, only if no nulls)
--   - leads              (drop redundant indexes — IF EXISTS, idempotent)
--
-- Reversible:  Partial.
--   - FORCE ROW LEVEL SECURITY can be reverted with `NO FORCE ROW LEVEL SECURITY`.
--   - DROP POLICY can be reverted by recreating the previous policy (see migration
--     20260225100000_trust_engine_vector.sql for legal_knowledge legacy SELECT policy).
--   - DROP INDEX is reversible only by re-creating the index manually.
--   - ALTER COLUMN ... SET NOT NULL is reversible with DROP NOT NULL.
--
-- Safety:
--   - Zero destructive DDL (no DROP TABLE / DROP COLUMN).
--   - Zero massive UPDATE: legal_knowledge backfill is a no-op in prod (0 rows
--     confirmed by 2026-04-17 audit).
--   - tenant_id NOT NULL is gated by a runtime null-count check; if any NULLs
--     remain, the constraint is NOT applied — only a WARNING is raised.
--   - All operations are wrapped in IF EXISTS / DO blocks for idempotency.
-- ============================================================================


-- ============================================================
-- SECTION 1 — audit_log_archive (P0)
--
-- Audit live 2026-04-17: rls_enabled=false, 0 policies. The archive table
-- mirrors audit_log content (tenant-scoped sensitive logs); leaving it
-- without RLS exposes archived records to any role with anon/authenticated
-- key via PostgREST. Archive is written by partition pruning function
-- (cleanup_old_records) running as service role only — so service_role-only
-- policy is sufficient.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'audit_log_archive' AND relkind = 'r') THEN
    EXECUTE 'ALTER TABLE public.audit_log_archive ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.audit_log_archive FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS audit_archive_service_only ON public.audit_log_archive';
    EXECUTE $POLICY$
      CREATE POLICY audit_archive_service_only ON public.audit_log_archive
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $POLICY$;

    EXECUTE $C$COMMENT ON TABLE public.audit_log_archive IS
      'Archive of audit_log records (>90 days). RLS forced; service_role-only. Written by cleanup_old_records(); never read from PostgREST. Hardened by 20260417000001.'$C$;

    RAISE NOTICE 'Section 1: audit_log_archive RLS forced + service_only policy applied';
  ELSE
    RAISE NOTICE 'Section 1: audit_log_archive does not exist — skipped';
  END IF;
END $$;


-- ============================================================
-- SECTION 2 — legal_knowledge (P1)
--
-- The original 20260225100000 created policy "Authenticated users can read
-- legal knowledge" with USING (true) — any authenticated user can read all
-- legal docs cross-tenant. Migration 20260405000001 added tenant_id and
-- created tenant-scoped policies but FAILED to drop the legacy liberal
-- policy. PostgreSQL OR-merges policies, so the liberal one still grants
-- cross-tenant SELECT.
--
-- This section:
--   1. Drops the legacy liberal SELECT policy by exact name.
--   2. Best-effort backfill of tenant_id (no-op in prod: 0 rows confirmed
--      2026-04-17). Commented; uncomment only if data exists.
--   3. Enforces tenant_id NOT NULL (only if zero nulls — defensive).
--   4. Recreates a clean tenant-scoped SELECT policy + service_role policy.
-- ============================================================

-- 2.1 Drop the legacy liberal policy (exact name from 20260225100000)
DROP POLICY IF EXISTS "Authenticated users can read legal knowledge" ON public.legal_knowledge;

-- 2.2 Backfill tenant_id (commented — prod has 0 rows; uncomment only if needed)
-- WARNING: This UPDATE is destructive in environments where legal_knowledge
-- has data spanning multiple tenants. The fallback below assigns ALL existing
-- rows to the first tenant in the table — appropriate ONLY if the table is
-- empty or has been used as a global catalog by a single tenant.
-- UPDATE public.legal_knowledge
--   SET tenant_id = (SELECT id FROM public.tenants ORDER BY created_at LIMIT 1)
--   WHERE tenant_id IS NULL;

-- 2.3 Enforce NOT NULL only when safe
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'legal_knowledge' AND relkind = 'r') THEN
    RAISE NOTICE 'Section 2: legal_knowledge does not exist — skipped';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'legal_knowledge' AND column_name = 'tenant_id'
  ) THEN
    RAISE WARNING 'Section 2: legal_knowledge.tenant_id column missing — run 20260405000001 first';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO null_count FROM public.legal_knowledge WHERE tenant_id IS NULL;
  IF null_count = 0 THEN
    EXECUTE 'ALTER TABLE public.legal_knowledge ALTER COLUMN tenant_id SET NOT NULL';
    RAISE NOTICE 'Section 2: legal_knowledge.tenant_id -> NOT NULL applied';
  ELSE
    RAISE WARNING 'Section 2: legal_knowledge has % rows with NULL tenant_id — NOT NULL NOT applied. Backfill manually then re-run.', null_count;
  END IF;
END $$;

-- 2.4 Recreate canonical tenant-scoped SELECT + service_role ALL policies
--     (idempotent: drops by canonical names from 20260417000001)
DROP POLICY IF EXISTS legal_knowledge_tenant_scoped ON public.legal_knowledge;
DROP POLICY IF EXISTS legal_knowledge_service_role_all ON public.legal_knowledge;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'legal_knowledge' AND relkind = 'r') THEN
    EXECUTE $POLICY$
      CREATE POLICY legal_knowledge_tenant_scoped ON public.legal_knowledge
        FOR SELECT
        TO authenticated
        USING (tenant_id = public.get_current_tenant_id())
    $POLICY$;

    EXECUTE $POLICY$
      CREATE POLICY legal_knowledge_service_role_all ON public.legal_knowledge
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $POLICY$;

    RAISE NOTICE 'Section 2: legal_knowledge tenant_scoped + service_role policies applied';
  END IF;
END $$;


-- ============================================================
-- SECTION 3 — webhook_events (P1)
--
-- Audit live 2026-04-17: RLS enabled, 0 policies. By default RLS-on-no-policies
-- denies ALL access including service_role unless FORCE is OFF. Currently
-- service_role has access only because RLS is not forced. This section adds
-- an explicit service-only policy so future FORCE RLS doesn't break Stripe /
-- Kapso edge functions, and documents the access pattern.
--
-- webhook_events is written exclusively by edge functions (stripe-webhook,
-- whatsapp-webhook, kapso-webhook) running as service_role. No tenant-level
-- access required.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'webhook_events' AND relkind = 'r') THEN
    EXECUTE 'ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS webhook_events_service_only ON public.webhook_events';
    EXECUTE $POLICY$
      CREATE POLICY webhook_events_service_only ON public.webhook_events
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $POLICY$;

    EXECUTE $C$COMMENT ON TABLE public.webhook_events IS
      'Idempotency ledger for inbound webhooks (Stripe/Kapso/WhatsApp). Written exclusively by service_role edge functions; never accessed by authenticated users. Hardened by 20260417000001.'$C$;

    RAISE NOTICE 'Section 3: webhook_events service_only policy applied';
  ELSE
    RAISE NOTICE 'Section 3: webhook_events does not exist — skipped';
  END IF;
END $$;


-- ============================================================
-- SECTION 4 — FORCE ROW LEVEL SECURITY (P2)
--
-- 45 tables in public schema have RLS ENABLED but not FORCED. By default,
-- ENABLE RLS does not apply to the table OWNER (typically `postgres`) — so
-- migrations / manual SQL run as the owner bypass all policies. FORCE RLS
-- ensures tenant isolation holds even for the owner role.
--
-- WHITELIST (excluded from FORCE — these are global public catalogs with no
-- per-tenant data):
--   - features              (feature catalog used by useFeatureFlag hook)
--   - plans                 (subscription plan catalog)
--   - subscription_plans    (alias / legacy of plans)
-- ============================================================

DO $$
DECLARE
  r RECORD;
  whitelist TEXT[] := ARRAY['features', 'plans', 'subscription_plans'];
  affected INTEGER := 0;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND c.relforcerowsecurity = false
      AND NOT (c.relname = ANY (whitelist))
  LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.tablename);
    affected := affected + 1;
    RAISE NOTICE 'Section 4: forced RLS on public.%', r.tablename;
  END LOOP;

  RAISE NOTICE 'Section 4: FORCE ROW LEVEL SECURITY applied to % tables (whitelist: %)', affected, whitelist;
END $$;


-- ============================================================
-- SECTION 5 — tenant_id NOT NULL (P2)
--
-- audit_log.tenant_id and user_roles.tenant_id are nullable, allowing inserts
-- without a tenant scope — which then bypass tenant-scoped RLS. We attempt
-- to enforce NOT NULL only if the column has zero NULL rows (defensive).
--
-- IMPORTANT: user_roles may legitimately have NULL tenant_id for super-admin
-- users (global role). The check below WILL NOT force NOT NULL if any nulls
-- exist — only a WARNING is emitted. Operator must manually decide whether
-- to backfill or leave nullable.
-- ============================================================

-- 5.1 audit_log.tenant_id
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'audit_log' AND relkind = 'r') THEN
    RAISE NOTICE 'Section 5.1: audit_log does not exist — skipped';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'tenant_id'
  ) THEN
    RAISE NOTICE 'Section 5.1: audit_log.tenant_id column missing — skipped';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO null_count FROM public.audit_log WHERE tenant_id IS NULL;
  IF null_count = 0 THEN
    EXECUTE 'ALTER TABLE public.audit_log ALTER COLUMN tenant_id SET NOT NULL';
    RAISE NOTICE 'Section 5.1: audit_log.tenant_id -> NOT NULL applied';
  ELSE
    RAISE WARNING 'Section 5.1: audit_log has % rows with NULL tenant_id — NOT NULL NOT applied. Backfill manually then re-run.', null_count;
  END IF;
END $$;

-- 5.2 user_roles.tenant_id (CAUTION: super_admin may have NULL tenant)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_roles' AND relkind = 'r') THEN
    RAISE NOTICE 'Section 5.2: user_roles does not exist — skipped';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'tenant_id'
  ) THEN
    RAISE NOTICE 'Section 5.2: user_roles.tenant_id column missing — skipped';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO null_count FROM public.user_roles WHERE tenant_id IS NULL;
  IF null_count = 0 THEN
    EXECUTE 'ALTER TABLE public.user_roles ALTER COLUMN tenant_id SET NOT NULL';
    RAISE NOTICE 'Section 5.2: user_roles.tenant_id -> NOT NULL applied';
  ELSE
    RAISE WARNING 'Section 5.2: user_roles has % rows with NULL tenant_id (likely super_admin) — NOT NULL NOT applied. Review manually before forcing.', null_count;
  END IF;
END $$;


-- ============================================================
-- SECTION 6 — leads index consolidation (P2)
--
-- leads has 33 indexes for ~76 rows in prod (audit 2026-04-17). Drop redundant
-- indexes whose query patterns are covered by composite indexes already in
-- place. All DROPs are IF EXISTS — silent no-op if the name does not match
-- the production schema.
--
-- Coverage rationale:
--   - idx_leads_tenant_btree    redundant: idx_leads_tenant_id covers tenant_id queries
--   - idx_leads_telefone_tenant redundant: idx_leads_telefone (created later) + tenant
--                               filter via RLS handles dedup queries; phone-only
--                               lookups don't need tenant in the key
--   - idx_leads_responsavel     redundant: idx_leads_responsavel_id is the canonical
--                               name; both target the same column
--   - idx_leads_departamento    redundant: idx_leads_departamento_id is the canonical
--                               single-column index; idx_leads_departamento was a
--                               (tenant_id, departamento_id) composite that overlaps
--                               with idx_leads_tenant_id + idx_leads_departamento_id
--
-- Reversibility: re-create via the original CREATE INDEX statements from the
-- referenced source migrations. See `documentation` comments in each DROP.
-- ============================================================

-- (For audit/discovery, run this query against prod:
--   SELECT indexname FROM pg_indexes
--   WHERE tablename = 'leads' AND schemaname = 'public'
--   ORDER BY indexname;
-- )

-- Redundant: covered by idx_leads_tenant_id (created in 20250615180000)
DROP INDEX IF EXISTS public.idx_leads_tenant_btree;

-- Redundant: created in 20260207000000_add_missing_indexes.sql; phone dedup
-- now uses ux_leads_tenant_phone_norm (UNIQUE) from 20260413000002
DROP INDEX IF EXISTS public.idx_leads_telefone_tenant;

-- Redundant: idx_leads_responsavel_id (created in 20260321000001) is canonical
DROP INDEX IF EXISTS public.idx_leads_responsavel;

-- Redundant composite: prefer single-col idx_leads_departamento_id
-- (20260317200001) + idx_leads_tenant_id (20250615180000) — planner can
-- combine via bitmap when needed
DROP INDEX IF EXISTS public.idx_leads_departamento;


-- ============================================================
-- VALIDATION — count tables still RLS-enabled-but-not-forced
-- (excluding the documented whitelist).
-- ============================================================

DO $$
DECLARE
  v INTEGER;
BEGIN
  SELECT COUNT(*) INTO v
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity
    AND NOT c.relforcerowsecurity
    AND c.relname NOT IN ('features', 'plans', 'subscription_plans');

  RAISE NOTICE 'VALIDATION: tables with RLS enabled but NOT forced (excl. whitelist): %', v;

  IF v > 0 THEN
    RAISE WARNING 'VALIDATION: % tables still without FORCE RLS — investigate before next deploy', v;
  END IF;
END $$;

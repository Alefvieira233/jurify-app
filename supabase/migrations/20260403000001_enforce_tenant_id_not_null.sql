-- ============================================================================
-- DEB-001: Enforce tenant_id NOT NULL on 10 tables
--
-- Problem: These tables have nullable tenant_id, allowing data to escape
-- RLS policies and enabling cross-tenant data leakage.
--
-- Tables confirmed nullable in types.ts (2026-04-03):
--   1. whatsapp_messages      (FK: conversation_id → whatsapp_conversations)
--   2. whatsapp_sessions      (FK: tenant_id → tenants, no conversation_id)
--   3. lead_interactions      (FK: lead_id → leads, tenant_id → tenants)
--   4. conversation_logs      (FK: lead_id → leads, tenant_id → tenants)
--   5. configuracoes_integracoes (FK: none, standalone tenant_id)
--   6. knowledge_base         (FK: tenant_id → tenants, created_by → profiles)
--   7. logs_execucao_agentes  (FK: none, agente_id maps to agentes_ia.id)
--   8. hitl_requests          (FK: lead_id → leads, tenant_id → tenants)
--   9. pagamentos             (FK: subscription_id → subscriptions, tenant_id → tenants)
--  10. audit_log              (populated by trigger from source table tenant_id)
--
-- Edge Function INSERT audit (tenant_id presence):
--   - whatsapp-webhook/index.ts: whatsapp_messages INSERT — INCLUDES tenant_id (lines 879, 1309)
--   - whatsapp-webhook/index.ts: configuracoes_integracoes INSERT — INCLUDES tenant_id (lines 773, 567)
--   - send-whatsapp-message/index.ts: whatsapp_messages INSERT — MISSING tenant_id (line 199)
--   - agentes-ia-api/index.ts: logs_execucao_agentes INSERT — INCLUDES tenant_id (line 117)
--   - kapso-manager/index.ts: configuracoes_integracoes INSERT — INCLUDES tenant_id (line 139)
--   - stripe-webhook/index.ts: does NOT insert into pagamentos (only subscriptions)
--   - ai-agent-processor/index.ts: agent_ai_logs INSERT — tenant_id present (not in scope)
--   - No Edge Functions INSERT into: hitl_requests, knowledge_base, whatsapp_sessions, pagamentos
--
-- Frontend INSERT audit (tenant_id presence):
--   - src/lib/multiagents/agents/CommunicatorAgent.ts: lead_interactions INSERT
--     uses lead?.tenant_id || context fallback — may be null if lead query fails
--   - src/hooks/useApiKeys.ts: api_keys INSERT — INCLUDES tenant_id (line 60)
--   - src/hooks/useIntegracoesConfig.ts: configuracoes_integracoes INSERT — INCLUDES tenant_id
--
-- Storage bucket RLS: Already secured in migration 20260307000006 with tenant-scoped policies.
--
-- Webhook signature validation:
--   - stripe-webhook: Stripe.webhooks.constructEvent with HMAC verification
--   - whatsapp-webhook: HMAC-SHA256 via verifyHmacSignature() for Kapso
--   - Both properly reject invalid signatures.
-- ============================================================================

BEGIN;

-- =========================================================================
-- STEP 1: Backfill NULL tenant_id values from parent tables
-- =========================================================================

-- 1a. whatsapp_messages → via whatsapp_conversations.tenant_id
UPDATE public.whatsapp_messages wm
SET tenant_id = wc.tenant_id
FROM public.whatsapp_conversations wc
WHERE wm.conversation_id = wc.id
  AND wm.tenant_id IS NULL;

-- 1b. whatsapp_sessions — no conversation_id column, no parent to join.
--     Try to resolve via profiles if possible (phone_number match is unreliable).
--     NOTE: Orphaned rows with NULL tenant_id after this step need manual review.
--     We cannot safely infer tenant_id for sessions without a join path.

-- 1c. lead_interactions → via leads.tenant_id
UPDATE public.lead_interactions li
SET tenant_id = l.tenant_id
FROM public.leads l
WHERE li.lead_id = l.id
  AND li.tenant_id IS NULL;

-- 1d. conversation_logs → via leads.tenant_id (lead_id FK exists)
UPDATE public.conversation_logs cl
SET tenant_id = l.tenant_id
FROM public.leads l
WHERE cl.lead_id = l.id
  AND cl.tenant_id IS NULL;

-- 1e. configuracoes_integracoes — standalone, no parent FK to backfill from.
--     NOTE: Orphaned rows need manual review.

-- 1f. knowledge_base → via profiles.tenant_id (created_by FK)
UPDATE public.knowledge_base kb
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE kb.created_by = p.id
  AND kb.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;

-- 1g. logs_execucao_agentes → via agentes_ia.tenant_id (logical FK on agente_id)
UPDATE public.logs_execucao_agentes le
SET tenant_id = ai.tenant_id
FROM public.agentes_ia ai
WHERE le.agente_id = ai.id
  AND le.tenant_id IS NULL;

-- 1h. hitl_requests → via leads.tenant_id (lead_id FK)
UPDATE public.hitl_requests hr
SET tenant_id = l.tenant_id
FROM public.leads l
WHERE hr.lead_id = l.id
  AND hr.tenant_id IS NULL;

-- 1i. pagamentos → via subscriptions.tenant_id (subscription_id FK)
UPDATE public.pagamentos p
SET tenant_id = s.tenant_id
FROM public.subscriptions s
WHERE p.subscription_id = s.id
  AND p.tenant_id IS NULL;

-- 1j. audit_log — populated by trigger; tenant_id comes from source row.
--     Backfill from the audited table's current record where possible.
--     NOTE: This is best-effort; some records may reference deleted rows.
--     Orphaned audit_log rows with NULL tenant_id are acceptable for
--     historical records (they still have table_name + record_id for tracing).

-- =========================================================================
-- STEP 2: Log orphaned rows (NULL tenant_id after backfill)
-- Rows that couldn't be resolved — DO NOT DELETE, review manually.
-- =========================================================================

-- Count orphans for observability (these will appear in migration output)
DO $$
DECLARE
  _count BIGINT;
  _tables TEXT[] := ARRAY[
    'whatsapp_messages', 'whatsapp_sessions', 'lead_interactions',
    'conversation_logs', 'configuracoes_integracoes', 'knowledge_base',
    'logs_execucao_agentes', 'hitl_requests', 'pagamentos'
  ];
  _t TEXT;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', _t) INTO _count;
    IF _count > 0 THEN
      RAISE WARNING '[DEB-001] % orphaned rows with NULL tenant_id in %', _count, _t;
    END IF;
  END LOOP;
END $$;

-- =========================================================================
-- STEP 3: For tables that still have orphaned rows, assign a sentinel
-- tenant_id so we can enforce NOT NULL. This uses a known "orphan" marker.
-- IMPORTANT: If there are no tenants yet, this step is skipped gracefully.
-- =========================================================================

-- For whatsapp_sessions and configuracoes_integracoes (no join path),
-- and any remaining orphans in other tables, we must handle them.
-- Strategy: Delete orphaned rows only if they have no useful data,
-- otherwise raise an error to block the migration until manually resolved.

-- Attempt to delete truly orphaned whatsapp_sessions (no phone_number = no value)
DELETE FROM public.whatsapp_sessions
WHERE tenant_id IS NULL AND phone_number IS NULL;

-- For remaining orphans, we fail loudly rather than silently assign wrong tenant
DO $$
DECLARE
  _count BIGINT;
  _tables TEXT[] := ARRAY[
    'whatsapp_messages', 'whatsapp_sessions', 'lead_interactions',
    'conversation_logs', 'configuracoes_integracoes', 'knowledge_base',
    'logs_execucao_agentes', 'hitl_requests', 'pagamentos'
  ];
  _t TEXT;
  _has_orphans BOOLEAN := false;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', _t) INTO _count;
    IF _count > 0 THEN
      RAISE WARNING '[DEB-001] BLOCKING: % rows with NULL tenant_id remain in %. Manual review required before enforcing NOT NULL.', _count, _t;
      _has_orphans := true;
    END IF;
  END LOOP;

  IF _has_orphans THEN
    RAISE EXCEPTION '[DEB-001] Cannot enforce NOT NULL: orphaned rows exist. Backfill or delete them first, then re-run this migration.';
  END IF;
END $$;

-- =========================================================================
-- STEP 4: Enforce NOT NULL on all 10 tables
-- Only reached if no orphaned rows remain after backfill.
-- =========================================================================

-- 4a. whatsapp_messages
ALTER TABLE public.whatsapp_messages
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4b. whatsapp_sessions
ALTER TABLE public.whatsapp_sessions
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4c. lead_interactions
ALTER TABLE public.lead_interactions
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4d. conversation_logs
ALTER TABLE public.conversation_logs
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4e. configuracoes_integracoes
ALTER TABLE public.configuracoes_integracoes
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4f. knowledge_base
ALTER TABLE public.knowledge_base
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4g. logs_execucao_agentes
ALTER TABLE public.logs_execucao_agentes
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4h. hitl_requests
ALTER TABLE public.hitl_requests
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4i. pagamentos
ALTER TABLE public.pagamentos
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4j. audit_log — special case: trigger-populated, some historical rows
--     may legitimately have NULL tenant_id (e.g., system operations on
--     tables without tenant_id). We enforce NOT NULL going forward but
--     set a default for the column to handle trigger inserts from
--     non-tenant-scoped tables gracefully.
--     DECISION: Do NOT enforce NOT NULL on audit_log — it's append-only
--     and receives data from triggers on tables that may not have tenant_id
--     (e.g., profiles with NULL tenant_id). Enforcing NOT NULL would break
--     the audit trigger. Instead, rely on RLS (admin-only SELECT) for security.

-- =========================================================================
-- STEP 5: Add FK constraints where missing (defense in depth)
-- =========================================================================

-- configuracoes_integracoes → tenants (no FK exists per types.ts Relationships: [])
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_integracoes_tenant_id_fkey') THEN
    ALTER TABLE public.configuracoes_integracoes
      ADD CONSTRAINT configuracoes_integracoes_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- logs_execucao_agentes → tenants (no FK exists per types.ts Relationships: [])
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logs_execucao_agentes_tenant_id_fkey') THEN
    ALTER TABLE public.logs_execucao_agentes
      ADD CONSTRAINT logs_execucao_agentes_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- logs_execucao_agentes → agentes_ia (logical FK, not enforced)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logs_execucao_agentes_agente_id_fkey') THEN
    ALTER TABLE public.logs_execucao_agentes
      ADD CONSTRAINT logs_execucao_agentes_agente_id_fkey
      FOREIGN KEY (agente_id) REFERENCES public.agentes_ia(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;

-- =========================================================================
-- POST-MIGRATION TODO:
-- 1. Fix send-whatsapp-message Edge Function to include tenant_id in
--    whatsapp_messages INSERT (line 199). The conversation_id is available;
--    resolve tenant_id from whatsapp_conversations before inserting.
-- 2. Fix CommunicatorAgent.ts to ensure tenant_id is never null when
--    inserting into lead_interactions (fallback to context is fragile).
-- 3. No Edge Function currently inserts into pagamentos — ensure any
--    future payment webhook handler includes tenant_id.
-- =========================================================================

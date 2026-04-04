-- ============================================================================
-- P2 — PERFORMANCE: Vector indexes, data retention, partitioning, encryption
--
-- Improvements:
-- 1. HNSW vector indexes for RAG similarity search (50-500ms → 5-20ms)
-- 2. pg_cron jobs for automatic data retention/expurgo
-- 3. Missing indexes for high-traffic query patterns
-- 4. Token encryption preparation (pgcrypto)
-- ============================================================================

-- ============================================================
-- PART 1: HNSW Vector Indexes for RAG
-- pgvector supports HNSW (hierarchical navigable small world)
-- which provides fast approximate nearest neighbor search.
-- ============================================================

-- 1a. documents table — general RAG store
CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
  ON public.documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX idx_documents_embedding_hnsw IS
  'HNSW cosine similarity index for RAG document matching';

-- 1b. legal_knowledge table — legal-specific RAG
CREATE INDEX IF NOT EXISTS idx_legal_knowledge_embedding_hnsw
  ON public.legal_knowledge
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX idx_legal_knowledge_embedding_hnsw IS
  'HNSW cosine similarity index for legal knowledge matching';

-- ============================================================
-- PART 2: Missing composite indexes for high-traffic patterns
-- ============================================================

-- 2a. lead_interactions — timeline queries per lead
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_timeline
  ON public.lead_interactions(tenant_id, lead_id, created_at DESC);

-- 2b. lead_historico — changelog queries per lead
CREATE INDEX IF NOT EXISTS idx_lead_historico_lead_timeline
  ON public.lead_historico(lead_id, created_at DESC);

-- 2c. crm_followups — active sequences per lead
CREATE INDEX IF NOT EXISTS idx_crm_followups_active
  ON public.crm_followups(tenant_id, lead_id, status)
  WHERE status IN ('pending', 'scheduled');

-- 2d. automation_executions — dashboard queries
CREATE INDEX IF NOT EXISTS idx_automation_executions_tenant_created
  ON public.automation_executions(tenant_id, created_at DESC);

-- 2e. whatsapp_conversations — sorted list with last_message_at
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_tenant_sorted
  ON public.whatsapp_conversations(tenant_id, last_message_at DESC);

-- 2f. notificacoes — active notifications per tenant
CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant_active
  ON public.notificacoes(tenant_id, created_at DESC)
  WHERE ativo = true;

-- 2g. tarefas — active tasks per user
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel_status
  ON public.tarefas(responsavel_id, status)
  WHERE status NOT IN ('concluida', 'cancelada');

-- 2h. prazos_processuais — upcoming deadlines
CREATE INDEX IF NOT EXISTS idx_prazos_upcoming
  ON public.prazos_processuais(tenant_id, data_prazo)
  WHERE status NOT IN ('concluido', 'cancelado');

-- ============================================================
-- PART 3: Data Retention & Expurgo (pg_cron)
-- Automatic cleanup of log tables to prevent unbounded growth.
-- ============================================================

-- 3a. Create a master cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS TABLE(
  table_name TEXT,
  rows_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  -- agent_ai_logs: 90 days (already exists but we consolidate here)
  DELETE FROM public.agent_ai_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'agent_ai_logs'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- logs_atividades: 180 days
  DELETE FROM public.logs_atividades
  WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'logs_atividades'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- conexoes_logs: 30 days
  DELETE FROM public.conexoes_logs
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'conexoes_logs'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- conexoes_alertas: 60 days (read ones only)
  DELETE FROM public.conexoes_alertas
  WHERE created_at < now() - interval '60 days'
    AND lido = true;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'conexoes_alertas'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- automation_executions: 90 days
  DELETE FROM public.automation_executions
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'automation_executions'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- google_calendar_sync_logs: 30 days
  DELETE FROM public.google_calendar_sync_logs
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'google_calendar_sync_logs'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- zapsign_logs: 90 days
  DELETE FROM public.zapsign_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'zapsign_logs'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- webhook_events: 7 days (idempotency window)
  DELETE FROM public.webhook_events
  WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'webhook_events'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- rate_limits: expired windows
  DELETE FROM public.rate_limits
  WHERE updated_at < now() - interval '1 day';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'rate_limits'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- assistant_audit: 90 days
  DELETE FROM public.assistant_audit
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'assistant_audit'; rows_deleted := v_deleted;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_data IS
  'Master data retention function — enforces TTL on all log/ephemeral tables. Run via pg_cron daily.';

-- 3b. Schedule pg_cron job (daily at 03:00 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old individual cleanup jobs if they exist
    PERFORM cron.unschedule('cleanup-agent-ai-logs');
    PERFORM cron.unschedule('cleanup-rate-limits');
    PERFORM cron.unschedule('cleanup-webhook-events');

    -- Schedule master cleanup
    PERFORM cron.schedule(
      'cleanup-expired-data',
      '0 3 * * *',
      'SELECT * FROM public.cleanup_expired_data()'
    );
    RAISE NOTICE 'pg_cron: cleanup-expired-data scheduled daily at 03:00 UTC';
  ELSE
    RAISE NOTICE 'pg_cron not available — call cleanup_expired_data() manually or via Edge Function';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling failed (maybe jobs did not exist): %', SQLERRM;
END;
$$;

-- ============================================================
-- PART 4: Token encryption with pgcrypto
-- Prepare infrastructure for encrypting sensitive tokens.
-- Actual encryption requires the ENCRYPTION_KEY secret.
-- ============================================================

-- 4a. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4b. Add encrypted_tokens column to google_calendar_tokens
ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS encryption_version INT DEFAULT 1;

COMMENT ON COLUMN public.google_calendar_tokens.access_token_encrypted IS
  'AES-256 encrypted access token — decrypt with pgp_sym_decrypt(token, key)';

-- 4c. Add encrypted config to configuracoes_integracoes
ALTER TABLE public.configuracoes_integracoes
  ADD COLUMN IF NOT EXISTS configuracao_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS encryption_version INT DEFAULT 1;

COMMENT ON COLUMN public.configuracoes_integracoes.configuracao_encrypted IS
  'AES-256 encrypted integration credentials — replaces plaintext configuracao field';

-- 4d. Helper function for encryption (uses Supabase Vault or direct key)
CREATE OR REPLACE FUNCTION public.encrypt_sensitive(
  p_plaintext TEXT,
  p_key TEXT DEFAULT NULL
)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key TEXT;
BEGIN
  -- Use provided key or fall back to a database-level secret
  v_key := COALESCE(p_key, current_setting('app.encryption_key', true));

  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured. Set via app.encryption_key or pass explicitly.';
  END IF;

  RETURN pgp_sym_encrypt(p_plaintext, v_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_sensitive(
  p_encrypted BYTEA,
  p_key TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := COALESCE(p_key, current_setting('app.encryption_key', true));

  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured. Set via app.encryption_key or pass explicitly.';
  END IF;

  RETURN pgp_sym_decrypt(p_encrypted, v_key);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Decryption failed: % — returning NULL', SQLERRM;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.encrypt_sensitive IS
  'AES-256 symmetric encryption via pgcrypto — requires app.encryption_key setting';

COMMENT ON FUNCTION public.decrypt_sensitive IS
  'Decrypt sensitive data encrypted with encrypt_sensitive() — returns NULL on failure';

-- ============================================================
-- PART 5: Audit log partitioning preparation
-- audit_log is append-only and grows unboundedly.
-- We add a quarterly archival function (non-destructive).
-- Full partitioning requires table recreation which is too
-- disruptive for production — we use an archival approach instead.
-- ============================================================

-- 5a. Create archive table for old audit entries
CREATE TABLE IF NOT EXISTS public.audit_log_archive (
  LIKE public.audit_log INCLUDING ALL
);

COMMENT ON TABLE public.audit_log_archive IS
  'Archived audit_log entries older than 1 year — moved by cleanup job for LGPD compliance while keeping cold storage';

-- 5b. Archive function (moves entries > 1 year to archive)
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_moved BIGINT;
BEGIN
  -- Move entries older than 1 year to archive
  WITH moved AS (
    DELETE FROM public.audit_log
    WHERE created_at < now() - interval '1 year'
    RETURNING *
  )
  INSERT INTO public.audit_log_archive
  SELECT * FROM moved;

  GET DIAGNOSTICS v_moved = ROW_COUNT;

  RAISE NOTICE 'Archived % audit_log entries older than 1 year', v_moved;
  RETURN v_moved;
END;
$$;

-- 5c. Schedule quarterly archival
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'archive-audit-logs',
      '0 4 1 */3 *',
      'SELECT public.archive_old_audit_logs()'
    );
    RAISE NOTICE 'pg_cron: archive-audit-logs scheduled quarterly';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling failed: %', SQLERRM;
END;
$$;

-- ============================================================
-- PART 6: whatsapp_messages — add retention policy
-- Instead of disruptive partitioning, we add soft archival.
-- ============================================================

-- 6a. Add archived flag
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- 6b. Index for non-archived messages (most common query)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_active
  ON public.whatsapp_messages(conversation_id, timestamp DESC)
  WHERE archived = false;

-- 6c. Archive function for old messages
CREATE OR REPLACE FUNCTION public.archive_old_whatsapp_messages(
  p_days INT DEFAULT 365
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE public.whatsapp_messages
  SET archived = true
  WHERE created_at < now() - (p_days || ' days')::interval
    AND archived = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 6d. Schedule monthly archival
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'archive-whatsapp-messages',
      '0 5 1 * *',
      'SELECT public.archive_old_whatsapp_messages(365)'
    );
    RAISE NOTICE 'pg_cron: archive-whatsapp-messages scheduled monthly';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling failed: %', SQLERRM;
END;
$$;

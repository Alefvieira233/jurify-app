-- ===================================================
-- JURIFY - WORKFLOW QUEUE (Async Job Processing)
-- ===================================================
-- Fila de trabalhos assíncronos com retry, dead letter queue,
-- controle de concorrência e prioridade.
-- Inspirado em Inngest/BullMQ para Supabase.
-- Data: 2026-02-06
-- ===================================================

-- 📋 Tabela de Jobs
CREATE TABLE IF NOT EXISTS workflow_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  job_type TEXT NOT NULL,
  -- job_type: 'process_lead' | 'send_whatsapp' | 'generate_document' | 'ingest_document' | 'send_email'
  status TEXT NOT NULL DEFAULT 'pending',
  -- status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter'
  priority SMALLINT NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  -- priority: 1 = lowest, 10 = highest (urgent)
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  attempt INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  lock_timeout_seconds INT NOT NULL DEFAULT 300,
  idempotency_key TEXT,
  -- Prevents duplicate processing of the same job
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 📊 Índices de Performance
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_status
  ON workflow_jobs(status);

CREATE INDEX IF NOT EXISTS idx_workflow_jobs_tenant_id
  ON workflow_jobs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_workflow_jobs_job_type
  ON workflow_jobs(job_type);

CREATE INDEX IF NOT EXISTS idx_workflow_jobs_priority_created
  ON workflow_jobs(priority DESC, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_workflow_jobs_next_retry
  ON workflow_jobs(next_retry_at ASC)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_jobs_idempotency
  ON workflow_jobs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_jobs_locked_at
  ON workflow_jobs(locked_at)
  WHERE locked_by IS NOT NULL;

-- 🔒 RLS
ALTER TABLE workflow_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view jobs from their tenant"
  ON workflow_jobs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert jobs for their tenant"
  ON workflow_jobs FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update jobs from their tenant"
  ON workflow_jobs FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access on workflow_jobs"
  ON workflow_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- 🔄 Trigger para updated_at
CREATE OR REPLACE FUNCTION update_workflow_jobs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_jobs_timestamp
  BEFORE UPDATE ON workflow_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_jobs_timestamp();

-- ⚡ Função RPC: Pegar próximo job da fila (com lock atômico)
CREATE OR REPLACE FUNCTION claim_next_job(
  p_worker_id TEXT,
  p_job_types TEXT[] DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  job_type TEXT,
  payload JSONB,
  attempt INT,
  max_attempts INT
) AS $$
DECLARE
  v_job RECORD;
BEGIN
  -- Seleciona e trava o próximo job disponível atomicamente
  SELECT wj.* INTO v_job
  FROM workflow_jobs wj
  WHERE wj.status = 'pending'
    AND (p_job_types IS NULL OR wj.job_type = ANY(p_job_types))
    AND (p_tenant_id IS NULL OR wj.tenant_id = p_tenant_id)
  ORDER BY wj.priority DESC, wj.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job IS NULL THEN
    -- Tenta pegar um job para retry
    SELECT wj.* INTO v_job
    FROM workflow_jobs wj
    WHERE wj.status = 'failed'
      AND wj.next_retry_at IS NOT NULL
      AND wj.next_retry_at <= NOW()
      AND wj.attempt < wj.max_attempts
      AND (p_job_types IS NULL OR wj.job_type = ANY(p_job_types))
      AND (p_tenant_id IS NULL OR wj.tenant_id = p_tenant_id)
    ORDER BY wj.priority DESC, wj.next_retry_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  END IF;

  IF v_job IS NULL THEN
    RETURN;
  END IF;

  -- Trava o job para este worker
  UPDATE workflow_jobs
  SET status = 'processing',
      locked_by = p_worker_id,
      locked_at = NOW(),
      started_at = COALESCE(started_at, NOW()),
      attempt = attempt + 1
  WHERE workflow_jobs.id = v_job.id;

  RETURN QUERY
  SELECT v_job.id, v_job.tenant_id, v_job.job_type, v_job.payload, v_job.attempt + 1, v_job.max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ⚡ Função RPC: Marcar job como completo
CREATE OR REPLACE FUNCTION complete_job(
  p_job_id UUID,
  p_result JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE workflow_jobs
  SET status = 'completed',
      result = p_result,
      completed_at = NOW(),
      locked_by = NULL,
      locked_at = NULL
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ⚡ Função RPC: Marcar job como falho (com retry automático)
CREATE OR REPLACE FUNCTION fail_job(
  p_job_id UUID,
  p_error TEXT
)
RETURNS VOID AS $$
DECLARE
  v_attempt INT;
  v_max INT;
  v_delay INTERVAL;
BEGIN
  SELECT attempt, max_attempts INTO v_attempt, v_max
  FROM workflow_jobs WHERE id = p_job_id;

  -- Backoff exponencial: 2^attempt * 5 segundos (10s, 20s, 40s, 80s...)
  v_delay := (POWER(2, LEAST(v_attempt, 6)) * 5) * INTERVAL '1 second';

  IF v_attempt >= v_max THEN
    -- Move para dead letter queue
    UPDATE workflow_jobs
    SET status = 'dead_letter',
        error_message = p_error,
        locked_by = NULL,
        locked_at = NULL,
        next_retry_at = NULL
    WHERE id = p_job_id;
  ELSE
    -- Agenda retry
    UPDATE workflow_jobs
    SET status = 'failed',
        error_message = p_error,
        locked_by = NULL,
        locked_at = NULL,
        next_retry_at = NOW() + v_delay
    WHERE id = p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ⚡ Função RPC: Liberar jobs travados (timeout)
CREATE OR REPLACE FUNCTION release_stale_locks()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE workflow_jobs
  SET status = 'failed',
      error_message = 'Lock timeout exceeded',
      locked_by = NULL,
      locked_at = NULL,
      next_retry_at = NOW() + INTERVAL '30 seconds'
  WHERE status = 'processing'
    AND locked_at IS NOT NULL
    AND locked_at < NOW() - (lock_timeout_seconds * INTERVAL '1 second');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 📝 Comentários
COMMENT ON TABLE workflow_jobs IS 'Fila de trabalhos assíncronos com retry, dead letter queue e controle de concorrência';
COMMENT ON COLUMN workflow_jobs.idempotency_key IS 'Chave para evitar processamento duplicado do mesmo job';
COMMENT ON COLUMN workflow_jobs.lock_timeout_seconds IS 'Tempo máximo que um worker pode segurar um job antes de ser liberado';

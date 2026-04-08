-- Verification audit fixes — CRITICAL issues found by senior review
-- 1. whatsapp_conversations.tenant_id missing FK + cascade
-- 2. Lead status check constraint mismatch with state machine
-- 3. Composite index for dashboard RPC performance

-- ═══════════════════════════════════════════════════════════════════
-- 1. FK constraint on whatsapp_conversations.tenant_id
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_whatsapp_conversations_tenant'
  ) THEN
    ALTER TABLE public.whatsapp_conversations
      ADD CONSTRAINT fk_whatsapp_conversations_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Same for whatsapp_messages if it has tenant_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_messages' AND column_name = 'tenant_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_whatsapp_messages_tenant'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT fk_whatsapp_messages_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Align check constraint with state machine
--    Drop old constraint, create new one matching all valid statuses
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Drop existing check constraint if it exists
  ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
  ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS chk_leads_status;

  -- Create aligned constraint matching state machine + legacy values
  ALTER TABLE public.leads ADD CONSTRAINT chk_leads_status
    CHECK (status IS NULL OR status IN (
      'novo', 'em_contato', 'qualificado', 'proposta',
      'negociacao', 'ganho', 'perdido',
      -- Legacy values (accepted but will be migrated)
      'em_proposta', 'contratado'
    ));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update leads status constraint: %', SQLERRM;
END $$;

-- Update state machine to handle legacy statuses
CREATE OR REPLACE FUNCTION public.validate_lead_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  valid_transitions jsonb := '{
    "novo":        ["em_contato", "qualificado", "perdido"],
    "em_contato":  ["qualificado", "proposta", "perdido"],
    "qualificado": ["proposta", "perdido", "em_contato"],
    "proposta":    ["negociacao", "ganho", "perdido", "qualificado"],
    "em_proposta": ["negociacao", "ganho", "perdido", "proposta"],
    "negociacao":  ["ganho", "perdido", "proposta"],
    "ganho":       [],
    "contratado":  [],
    "perdido":     ["novo"]
  }'::jsonb;
  allowed jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  allowed := valid_transitions -> OLD.status;

  IF allowed IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT (allowed ? NEW.status) THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %. Transições permitidas: %',
      OLD.status, NEW.status, allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Composite indexes for dashboard RPC performance
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_agent_executions_tenant_created
  ON public.agent_executions (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_executions_tenant_status
  ON public.agent_executions (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_status
  ON public.leads (tenant_id, status);

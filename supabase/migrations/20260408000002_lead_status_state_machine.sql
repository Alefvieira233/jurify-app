-- Lead Status State Machine
-- Validates status transitions to prevent invalid pipeline moves.
-- Allows forward progression + skip to 'perdido' from any state.
-- 'ganho' is terminal — cannot be changed once set.

CREATE OR REPLACE FUNCTION public.validate_lead_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  valid_transitions jsonb := '{
    "novo":        ["em_contato", "qualificado", "perdido"],
    "em_contato":  ["qualificado", "proposta", "perdido"],
    "qualificado": ["proposta", "perdido", "em_contato"],
    "proposta":    ["ganho", "perdido", "qualificado"],
    "ganho":       [],
    "perdido":     ["novo"]
  }'::jsonb;
  allowed jsonb;
BEGIN
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Skip validation for service_role (Edge Functions, admin operations)
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Validate transition
  allowed := valid_transitions -> OLD.status;

  IF allowed IS NULL THEN
    -- Unknown current status — allow any transition (legacy data)
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

-- Attach trigger to leads table
DROP TRIGGER IF EXISTS trg_validate_lead_status ON public.leads;
CREATE TRIGGER trg_validate_lead_status
  BEFORE UPDATE OF status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lead_status_transition();

COMMENT ON FUNCTION public.validate_lead_status_transition IS
  'State machine for lead status. Forward progression + perdido from any state. Ganho is terminal. Service_role bypasses.';

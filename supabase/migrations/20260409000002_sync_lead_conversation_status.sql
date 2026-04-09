-- =============================================================================
-- Sync lead status ↔ whatsapp_conversations status
-- Bidirectional: when lead advances in CRM, conversation reflects it.
-- When conversation finalizes, lead reflects it.
-- =============================================================================

-- Mapping:
--   lead novo/em_contato       → conversation ativo
--   lead qualificado/proposta  → conversation qualificado
--   lead negociacao            → conversation qualificado
--   lead ganho                 → conversation finalizado
--   lead perdido               → conversation finalizado

-- ── 1. Lead status change → update conversation status ──

CREATE OR REPLACE FUNCTION public.sync_conversation_from_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_conv_status TEXT;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Map lead status → conversation status
  CASE NEW.status
    WHEN 'novo', 'em_contato' THEN
      new_conv_status := 'ativo';
    WHEN 'qualificado', 'proposta', 'negociacao' THEN
      new_conv_status := 'qualificado';
    WHEN 'ganho' THEN
      new_conv_status := 'finalizado';
    WHEN 'perdido' THEN
      new_conv_status := 'finalizado';
    ELSE
      new_conv_status := 'ativo';
  END CASE;

  -- Update all active conversations for this lead
  UPDATE public.whatsapp_conversations
  SET status = new_conv_status,
      updated_at = now()
  WHERE lead_id = NEW.id
    AND tenant_id = NEW.tenant_id
    AND status <> new_conv_status;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_conversation_from_lead ON public.leads;
CREATE TRIGGER trg_sync_conversation_from_lead
  AFTER UPDATE OF status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_conversation_from_lead();

-- ── 2. Conversation status change → update lead status (only for finalizado) ──
-- We only sync conversation→lead when conversation is manually closed,
-- to avoid circular trigger loops.

CREATE OR REPLACE FUNCTION public.sync_lead_from_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_lead_status TEXT;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only sync when conversation is finalized (human action)
  IF NEW.status <> 'finalizado' THEN
    RETURN NEW;
  END IF;

  -- Don't sync if lead_id is null
  IF NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get current lead status
  SELECT status INTO current_lead_status
  FROM public.leads
  WHERE id = NEW.lead_id AND tenant_id = NEW.tenant_id;

  -- Only mark lead as perdido if it's still in early stages
  -- (don't override ganho or already perdido)
  IF current_lead_status IN ('novo', 'em_contato') THEN
    UPDATE public.leads
    SET status = 'perdido',
        updated_at = now()
    WHERE id = NEW.lead_id
      AND tenant_id = NEW.tenant_id
      AND status IN ('novo', 'em_contato');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_from_conversation ON public.whatsapp_conversations;
CREATE TRIGGER trg_sync_lead_from_conversation
  AFTER UPDATE OF status ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lead_from_conversation();

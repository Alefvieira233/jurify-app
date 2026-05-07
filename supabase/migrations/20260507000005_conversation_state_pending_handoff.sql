-- Onda 17.1 — pending_handoff_to: campo que força roteamento determinístico.
-- Quando agente A faz handoff verbal pra agente B, webhook grava o tipo do
-- agente B aqui. Próxima mensagem do lead PULA o orchestrator e vai direto
-- pro agente alvo. Após uso, campo é limpo (one-shot, expira em 30min).

DROP FUNCTION IF EXISTS public.update_conversation_phase(UUID, UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.update_conversation_phase(UUID, UUID, TEXT, TEXT, JSONB, TEXT, BOOLEAN);

ALTER TABLE public.conversation_state
  ADD COLUMN IF NOT EXISTS pending_handoff_to TEXT,
  ADD COLUMN IF NOT EXISTS pending_handoff_set_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversation_state_handoff
  ON public.conversation_state(conversation_id)
  WHERE pending_handoff_to IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_conversation_phase(
  _conversation_id UUID,
  _tenant_id UUID,
  _new_phase TEXT,
  _agent_type TEXT,
  _context_patch JSONB DEFAULT '{}'::jsonb,
  _pending_handoff_to TEXT DEFAULT NULL,
  _clear_pending_handoff BOOLEAN DEFAULT FALSE
)
RETURNS public.conversation_state
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  _row public.conversation_state;
  _now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.conversation_state (
    conversation_id, tenant_id, current_phase, last_agent_type,
    accumulated_context, last_active_at,
    pending_handoff_to, pending_handoff_set_at
  )
  VALUES (
    _conversation_id, _tenant_id, _new_phase, _agent_type,
    _context_patch, _now,
    _pending_handoff_to,
    CASE WHEN _pending_handoff_to IS NOT NULL THEN _now ELSE NULL END
  )
  ON CONFLICT (conversation_id) DO UPDATE
  SET current_phase = EXCLUDED.current_phase,
      last_agent_type = EXCLUDED.last_agent_type,
      accumulated_context = public.conversation_state.accumulated_context || EXCLUDED.accumulated_context,
      last_active_at = _now,
      pending_handoff_to = CASE
        WHEN _clear_pending_handoff THEN NULL
        WHEN _pending_handoff_to IS NOT NULL THEN _pending_handoff_to
        ELSE public.conversation_state.pending_handoff_to
      END,
      pending_handoff_set_at = CASE
        WHEN _clear_pending_handoff THEN NULL
        WHEN _pending_handoff_to IS NOT NULL THEN _now
        ELSE public.conversation_state.pending_handoff_set_at
      END
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_conversation_phase TO authenticated, service_role;

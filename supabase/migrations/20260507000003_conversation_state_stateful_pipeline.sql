-- =====================================================================
-- Onda 17: conversation_state — pipeline stateful pra IA WhatsApp.
--
-- Cada conversa whatsapp_conversations tem 1 linha em conversation_state que
-- guarda: fase atual (greeting/qualifying/scheduling/confirmed/closed),
-- contexto acumulado (lead intent, dados coletados, último agente),
-- timestamp de última atividade.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.conversation_state (
  conversation_id UUID PRIMARY KEY REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_phase TEXT NOT NULL DEFAULT 'greeting',
  last_agent_type TEXT,
  accumulated_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phase_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_phase CHECK (current_phase IN (
    'greeting', 'qualifying', 'scheduling', 'confirmed', 'follow_up', 'closed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_conversation_state_tenant ON public.conversation_state(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_state_phase ON public.conversation_state(current_phase) WHERE current_phase NOT IN ('confirmed', 'closed');

ALTER TABLE public.conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_state FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select" ON public.conversation_state;
CREATE POLICY "tenant_select" ON public.conversation_state
FOR SELECT USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "service_role_all" ON public.conversation_state;
CREATE POLICY "service_role_all" ON public.conversation_state
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.fn_conversation_state_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.current_phase IS DISTINCT FROM OLD.current_phase THEN
    NEW.phase_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_conversation_state_updated_at ON public.conversation_state;
CREATE TRIGGER tg_conversation_state_updated_at
BEFORE UPDATE ON public.conversation_state
FOR EACH ROW EXECUTE FUNCTION public.fn_conversation_state_updated_at();

CREATE OR REPLACE FUNCTION public.update_conversation_phase(
  _conversation_id UUID,
  _tenant_id UUID,
  _new_phase TEXT,
  _agent_type TEXT,
  _context_patch JSONB DEFAULT '{}'::jsonb
)
RETURNS public.conversation_state
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  _row public.conversation_state;
BEGIN
  INSERT INTO public.conversation_state (conversation_id, tenant_id, current_phase, last_agent_type, accumulated_context, last_active_at)
  VALUES (_conversation_id, _tenant_id, _new_phase, _agent_type, _context_patch, NOW())
  ON CONFLICT (conversation_id) DO UPDATE
  SET current_phase = EXCLUDED.current_phase,
      last_agent_type = EXCLUDED.last_agent_type,
      accumulated_context = public.conversation_state.accumulated_context || EXCLUDED.accumulated_context,
      last_active_at = NOW()
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_conversation_phase TO authenticated, service_role;

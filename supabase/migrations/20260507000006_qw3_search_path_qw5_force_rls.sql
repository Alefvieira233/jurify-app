-- Quick Win #3 — Fix search_path mutável em fn_conversation_state_updated_at
-- (advisor SECURITY WARN function_search_path_mutable)
CREATE OR REPLACE FUNCTION public.fn_conversation_state_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.current_phase IS DISTINCT FROM OLD.current_phase THEN
    NEW.phase_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Quick Win #5 — Forçar RLS nas 7 tabelas com RLS habilitada mas não-forçada.
-- Sem FORCE, donas de tabela (owners) bypass RLS por padrão. Em multi-tenant é gap.
ALTER TABLE public.features FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_auto_replies FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_auto_reply_log FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversation_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversation_summaries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_meta_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_quick_replies FORCE ROW LEVEL SECURITY;

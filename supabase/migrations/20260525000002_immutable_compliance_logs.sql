-- =============================================================================
-- P0-8 — Imutabilidade dos logs de compliance (auditoria 2026-05-25)
--
-- Contexto: somente public.audit_log tinha triggers BEFORE DELETE/UPDATE para
-- garantir imutabilidade. lgpd_consent_log e assistant_audit, ambos também
-- contemplados pela LGPD (consentimento) e por compliance interno (uso do
-- assistente IA), estavam mutáveis. Admin de tenant via JWT (com policies
-- tenant-aware permissivas para UPDATE/DELETE) poderia adulterar registros
-- históricos — a ANPD considera essa configuração insuficiente.
--
-- Solução: função genérica `prevent_compliance_mutation()` que usa
-- TG_TABLE_NAME para a mensagem (reutilizável) + 4 triggers (DELETE+UPDATE em
-- cada tabela).
--
-- Mantém a função existente `prevent_audit_mutation()` em audit_log intacta
-- (não removemos para evitar refactor desnecessário).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_compliance_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  RAISE EXCEPTION 'compliance log % is immutable: % not allowed (LGPD/audit requirement)',
    TG_TABLE_NAME, TG_OP;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.prevent_compliance_mutation() FROM PUBLIC;

-- lgpd_consent_log
DROP TRIGGER IF EXISTS prevent_lgpd_consent_delete ON public.lgpd_consent_log;
DROP TRIGGER IF EXISTS prevent_lgpd_consent_update ON public.lgpd_consent_log;

CREATE TRIGGER prevent_lgpd_consent_delete
  BEFORE DELETE ON public.lgpd_consent_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_compliance_mutation();

CREATE TRIGGER prevent_lgpd_consent_update
  BEFORE UPDATE ON public.lgpd_consent_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_compliance_mutation();

-- assistant_audit
DROP TRIGGER IF EXISTS prevent_assistant_audit_delete ON public.assistant_audit;
DROP TRIGGER IF EXISTS prevent_assistant_audit_update ON public.assistant_audit;

CREATE TRIGGER prevent_assistant_audit_delete
  BEFORE DELETE ON public.assistant_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_compliance_mutation();

CREATE TRIGGER prevent_assistant_audit_update
  BEFORE UPDATE ON public.assistant_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_compliance_mutation();

-- Sanity check
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.triggers
  WHERE event_object_schema='public'
    AND event_object_table IN ('lgpd_consent_log','assistant_audit')
    AND event_manipulation IN ('DELETE','UPDATE');
  IF v_count < 4 THEN
    RAISE EXCEPTION 'Esperava 4 triggers de imutabilidade, encontrei %', v_count;
  END IF;
END $$;

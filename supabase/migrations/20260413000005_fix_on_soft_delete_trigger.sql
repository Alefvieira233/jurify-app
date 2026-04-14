-- ============================================================================
-- Hotfix: corrige trigger on_soft_delete
-- ============================================================================
-- Dois bugs coexistiam no trigger original (migration 20260404000004):
--
--   1. `auth.uid()::text` — mas audit_log.user_id é UUID (não TEXT).
--      Qualquer soft-delete falhava com:
--        ERROR: column "user_id" is of type uuid but expression is of type text
--
--   2. `operation = 'SOFT_DELETE'` — mas a CHECK constraint audit_log_operation_check
--      (de uma migration anterior) só aceita os operadores SQL padrão:
--      INSERT / UPDATE / DELETE. Valor 'SOFT_DELETE' é rejeitado:
--        ERROR: new row for relation "audit_log" violates check constraint
--
-- Fix:
--   - Remove o cast ::text (auth.uid() já retorna uuid).
--   - Usa 'DELETE' como operation (soft-delete é semanticamente um delete).
--   - Marca em changed_fields que foi soft-delete (diferenciação preservada).
--   - Adiciona SET search_path pra blindagem contra hijacking em SECURITY DEFINER.
--
-- Esta migration substitui a função in-place; os triggers existentes nas 4
-- tabelas (leads, agendamentos, contratos, whatsapp_messages) continuam
-- apontando pra função e passam a usar a versão corrigida automaticamente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Fire somente na transição NULL → não-NULL (ignora updates subsequentes
  -- que não mudam deleted_at, e ignora hard-deletes que nunca chegam aqui).
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    INSERT INTO public.audit_log (
      operation,
      table_name,
      record_id,
      tenant_id,
      user_id,
      old_data,
      new_data,
      changed_fields
    ) VALUES (
      'DELETE',                                     -- usa valor aceito pela CHECK
      TG_TABLE_NAME,
      NEW.id::text,
      NEW.tenant_id,
      auth.uid(),                                   -- UUID direto, sem cast
      row_to_json(OLD)::jsonb,
      jsonb_build_object('deleted_at', NEW.deleted_at, 'soft_delete', true),
      ARRAY['deleted_at']                           -- changed_fields diferencia soft de hard
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_soft_delete() IS
  'Trigger AFTER UPDATE em tabelas com deleted_at. Loga em audit_log quando soft-delete transiciona NULL→timestamp. Usa operation=DELETE (aceito pela CHECK) + new_data.soft_delete=true pra diferenciação.';

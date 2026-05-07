-- Bug pré-existente descoberto via smoke test 2026-05-07:
-- notify_lead_status_change inseria em notificacoes.tipo (tipo enum
-- notification_type) usando CASE retornando TEXT sem cast — Postgres
-- rejeita com 42804. Resultado: TODA mudança de status de lead falhava
-- silenciosamente em prod (transação caía no rollback).
-- Cascata: agendamento via WhatsApp também falhava porque
-- fn_agendamento_auto_kanban dispara UPDATE leads.status, que dispara
-- esse trigger.
CREATE OR REPLACE FUNCTION public.notify_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notificacoes (
      titulo,
      mensagem,
      tipo,
      tenant_id,
      created_by
    ) VALUES (
      'Status de Lead Alterado',
      format(
        'O lead "%s" mudou de "%s" para "%s".',
        COALESCE(NEW.nome, 'Sem nome'),
        COALESCE(OLD.status, 'indefinido'),
        COALESCE(NEW.status, 'indefinido')
      ),
      (CASE
        WHEN NEW.status IN ('convertido', 'ganho') THEN 'sucesso'
        WHEN NEW.status IN ('perdido', 'cancelado') THEN 'alerta'
        ELSE 'info'
      END)::public.notification_type,
      NEW.tenant_id,
      NEW.responsavel_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================================
-- Onda 18.1 + 18.3 — Triggers de automação CRM:
-- 1) Mover lead pelo Kanban quando agendamento é criado/atualizado.
-- 2) Criar tarefa "Atender reunião" automaticamente quando agendamento é criado.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_agendamento_auto_kanban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  _current_status TEXT;
BEGIN
  IF NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO _current_status FROM public.leads WHERE id = NEW.lead_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'agendado' THEN
    IF _current_status IN ('novo', 'em_contato') OR _current_status IS NULL THEN
      UPDATE public.leads SET status = 'qualificado', updated_at = NOW() WHERE id = NEW.lead_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'realizado' THEN
      IF _current_status IN ('qualificado', 'em_proposta', 'proposta', 'em_contato', 'novo') THEN
        UPDATE public.leads SET status = 'contratado', updated_at = NOW() WHERE id = NEW.lead_id;
      END IF;
    ELSIF NEW.status = 'cancelado' THEN
      NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_agendamento_auto_kanban ON public.agendamentos;
CREATE TRIGGER tg_agendamento_auto_kanban
AFTER INSERT OR UPDATE OF status ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.fn_agendamento_auto_kanban();

CREATE OR REPLACE FUNCTION public.fn_agendamento_auto_tarefa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  _criador UUID;
  _titulo TEXT;
  _descricao TEXT;
  _lead_nome TEXT;
BEGIN
  _criador := COALESCE(NEW.responsavel_id, NEW.lead_id);
  IF _criador IS NULL THEN
    SELECT p.id INTO _criador
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    WHERE p.tenant_id = NEW.tenant_id
      AND ur.role IN ('admin', 'manager', 'administrador')
      AND ur.ativo = true
    ORDER BY p.created_at ASC
    LIMIT 1;
  END IF;

  IF _criador IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.lead_id IS NOT NULL THEN
    SELECT nome INTO _lead_nome FROM public.leads WHERE id = NEW.lead_id;
  END IF;

  _titulo := COALESCE('Reunião com ' || _lead_nome, 'Reunião agendada');
  _descricao := 'Atender reunião' ||
    CASE WHEN NEW.area_juridica IS NOT NULL THEN ' (' || NEW.area_juridica || ')' ELSE '' END ||
    CASE WHEN NEW.observacoes IS NOT NULL THEN E'\n\nObs: ' || NEW.observacoes ELSE '' END;

  INSERT INTO public.tarefas (
    tenant_id, titulo, descricao, prazo, lead_id, responsavel_id, criador_id, status, prioridade
  ) VALUES (
    NEW.tenant_id,
    _titulo,
    _descricao,
    NEW.data_hora - INTERVAL '15 minutes',
    NEW.lead_id,
    NEW.responsavel_id,
    _criador,
    'pendente',
    'alta'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_agendamento_auto_tarefa ON public.agendamentos;
CREATE TRIGGER tg_agendamento_auto_tarefa
AFTER INSERT ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.fn_agendamento_auto_tarefa();

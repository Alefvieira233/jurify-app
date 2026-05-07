-- Bug pré-existente descoberto via smoke test 2026-05-07:
-- fn_agendamento_auto_tarefa usava NEW.lead_id como fallback de criador_id —
-- mas lead_id é uma referência em public.leads, NÃO em public.profiles.
-- Resultado: agendamentos sem responsavel_id falhavam por FK violation
-- na criação automática da tarefa associada (tarefas.criador_id_fkey).
-- Fix: pula direto pro lookup de admin/manager quando responsavel_id é NULL.
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
  _criador := NEW.responsavel_id;
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

-- ============================================================================
-- Adicionar FK responsavel_id em agendamentos + backfill
-- ============================================================================
-- Problema: agendamentos.responsavel é TEXT (nome do advogado em texto livre).
-- Isso quebra o trigger auto_qualify_lead_on_agendamento quando o nome não
-- bate exato com profiles.nome_completo — a tarefa vai pro admin fallback em
-- vez do advogado real.
--
-- Solução:
--   1. Adiciona coluna responsavel_id UUID FK profiles(id)
--   2. Backfill: popula responsavel_id a partir de profiles.nome_completo
--      quando houver match exato (case-insensitive, trim)
--   3. Atualiza trigger para preferir responsavel_id quando não-null,
--      fallback em responsavel TEXT pra backcompat
--   4. Deixa responsavel TEXT como fonte de display (nome amigável)
--
-- Backcompat: código existente que só escreve responsavel TEXT continua
-- funcionando — o trigger resolve dinamicamente.
-- ============================================================================

-- 1. Adiciona coluna
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_responsavel_id
  ON public.agendamentos (responsavel_id)
  WHERE responsavel_id IS NOT NULL;

-- 2. Backfill: tenta match exato por nome_completo dentro do tenant
UPDATE public.agendamentos a
   SET responsavel_id = p.id
  FROM public.profiles p
 WHERE a.responsavel_id IS NULL
   AND a.responsavel IS NOT NULL
   AND btrim(a.responsavel) <> ''
   AND p.tenant_id = a.tenant_id
   AND lower(btrim(p.nome_completo)) = lower(btrim(a.responsavel));

-- 3. Atualiza função do trigger para preferir FK quando disponível
CREATE OR REPLACE FUNCTION public.auto_qualify_lead_on_agendamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead_status TEXT;
  v_lead_nome TEXT;
  v_tag_id UUID;
  v_responsavel_profile_id UUID;
  v_tenant_admin_id UUID;
BEGIN
  IF NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status, nome
    INTO v_lead_status, v_lead_nome
    FROM public.leads
    WHERE id = NEW.lead_id AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE WARNING '[auto_qualify] Lead % não encontrado no tenant %', NEW.lead_id, NEW.tenant_id;
    RETURN NEW;
  END IF;

  -- 1+2+3+4. UPDATE no lead (status / score / temperature / last_activity)
  UPDATE public.leads
     SET status = CASE
                    WHEN status IN ('novo', 'em_contato') THEN 'qualificado'
                    ELSE status
                  END,
         lead_score = LEAST(100, COALESCE(lead_score, 0) + 20),
         temperature = 'hot',
         last_activity_at = now(),
         updated_at = now()
   WHERE id = NEW.lead_id
     AND tenant_id = NEW.tenant_id;

  -- 5. Tag automática "Reunião Agendada"
  INSERT INTO public.tags (tenant_id, nome, cor, categoria, ativo)
  VALUES (NEW.tenant_id, 'Reunião Agendada', '#3b82f6', 'automatico', true)
  ON CONFLICT (tenant_id, nome) DO UPDATE SET ativo = true
  RETURNING id INTO v_tag_id;

  IF v_tag_id IS NULL THEN
    SELECT id INTO v_tag_id
      FROM public.tags
     WHERE tenant_id = NEW.tenant_id AND nome = 'Reunião Agendada'
     LIMIT 1;
  END IF;

  IF v_tag_id IS NOT NULL THEN
    INSERT INTO public.lead_tags (lead_id, tag_id)
    VALUES (NEW.lead_id, v_tag_id)
    ON CONFLICT (lead_id, tag_id) DO NOTHING;
  END IF;

  -- 6. Resolver responsável: prefere FK, fallback em match por nome
  IF NEW.responsavel_id IS NOT NULL THEN
    v_responsavel_profile_id := NEW.responsavel_id;
  ELSIF NEW.responsavel IS NOT NULL AND btrim(NEW.responsavel) <> '' THEN
    SELECT id INTO v_responsavel_profile_id
      FROM public.profiles
     WHERE tenant_id = NEW.tenant_id
       AND lower(btrim(nome_completo)) = lower(btrim(NEW.responsavel))
     LIMIT 1;
  END IF;

  -- Criador fallback: primeiro admin/manager do tenant
  SELECT p.id INTO v_tenant_admin_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
   WHERE p.tenant_id = NEW.tenant_id
     AND ur.tenant_id = NEW.tenant_id
     AND ur.role IN ('admin', 'manager')
     AND COALESCE(ur.ativo, true) = true
   ORDER BY p.created_at ASC
   LIMIT 1;

  IF v_tenant_admin_id IS NOT NULL THEN
    INSERT INTO public.tarefas (
      tenant_id, titulo, descricao, prazo, pontos,
      responsavel_id, criador_id, lead_id, status, prioridade
    )
    VALUES (
      NEW.tenant_id,
      'Preparar reunião com ' || COALESCE(v_lead_nome, 'lead'),
      'Agendamento automático via sistema. Revisar histórico do lead e preparar pauta antes da reunião em ' ||
        to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
      NEW.data_hora - INTERVAL '1 day',
      3,
      COALESCE(v_responsavel_profile_id, v_tenant_admin_id),
      v_tenant_admin_id,
      NEW.lead_id,
      'pendente',
      'alta'
    );
  ELSE
    RAISE WARNING '[auto_qualify] Tenant % sem admin/manager — tarefa não criada', NEW.tenant_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[auto_qualify] Erro: % (SQLSTATE %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

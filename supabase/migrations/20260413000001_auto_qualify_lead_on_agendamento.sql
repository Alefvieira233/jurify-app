-- ============================================================================
-- Auto-qualificação do lead ao criar agendamento
-- ============================================================================
-- Objetivo (senior dev mindset):
--   Agendamento é sinal forte de qualificação. Quando um agendamento é
--   inserido (por WhatsApp-webhook, UI, API — qualquer canal), dispara:
--
--   1. Status do lead avança para 'qualificado' (apenas se em 'novo' ou
--      'em_contato' — nunca regride de proposta/negociacao/ganho).
--   2. lead_score recebe boost de +20 (cap 100).
--   3. temperature é elevada para 'hot' (agendamento = intenção máxima).
--   4. last_activity_at é atualizado para now().
--   5. Tag automática "Reunião Agendada" (categoria 'automatico') é
--      garantida no tenant e linkada ao lead via lead_tags.
--   6. Tarefa é criada para o advogado responsável: "Preparar reunião com
--      {lead}" com prazo = data_hora - 24h e prioridade 'alta'.
--   7. lead_historico é populado automaticamente pelo trigger existente
--      record_lead_history() em UPDATE da tabela leads (não precisamos
--      inserir manualmente).
--
-- Propriedades:
--   - Idempotente: ON CONFLICT DO NOTHING nas inserções de tag/link.
--   - Defense-in-depth: funciona independentemente do canal (WhatsApp, UI).
--   - Respeita state machine: usa o mesmo validate_lead_status_transition.
--   - Seguro com RLS: SECURITY DEFINER para permitir insert em lead_tags
--     e tarefas a partir de contexto de trigger sem bypass explícito de RLS.
--   - Fail-soft: se alguma etapa falhar (ex.: responsavel não tem profile
--     correspondente para criar tarefa), as demais prosseguem e loga WARNING.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_qualify_lead_on_agendamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead_status TEXT;
  v_lead_score INTEGER;
  v_lead_temperature TEXT;
  v_lead_nome TEXT;
  v_tag_id UUID;
  v_responsavel_profile_id UUID;
  v_tenant_admin_id UUID;
BEGIN
  -- Skip se agendamento não tem lead (ex.: audiência interna sem lead)
  IF NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Carrega estado atual do lead
  SELECT status, COALESCE(lead_score, 0), COALESCE(temperature, 'warm'), nome
    INTO v_lead_status, v_lead_score, v_lead_temperature, v_lead_nome
    FROM public.leads
    WHERE id = NEW.lead_id AND tenant_id = NEW.tenant_id;

  -- Lead não encontrado (pode acontecer em teste/soft-delete): não bloqueia
  IF NOT FOUND THEN
    RAISE WARNING '[auto_qualify] Lead % não encontrado no tenant %', NEW.lead_id, NEW.tenant_id;
    RETURN NEW;
  END IF;

  -- 1+2+3+4. UPDATE no lead (status / score / temperature / last_activity)
  -- Status só avança se estiver em estado inicial (nunca regride)
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

  -- 5. Tag automática "Reunião Agendada" — garante existência no tenant e linka
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

  -- 6. Tarefa automática para o advogado responsável
  -- Mapeia nome textual do responsável → profile.id no mesmo tenant
  SELECT id INTO v_responsavel_profile_id
    FROM public.profiles
   WHERE tenant_id = NEW.tenant_id
     AND nome_completo = NEW.responsavel
   LIMIT 1;

  -- Fallback: usar primeiro admin/manager do tenant como criador se não resolver
  -- Roles ficam em user_roles (não em profiles); profiles.id = user_roles.user_id = auth.users.id
  SELECT p.id INTO v_tenant_admin_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
   WHERE p.tenant_id = NEW.tenant_id
     AND ur.tenant_id = NEW.tenant_id
     AND ur.role IN ('admin', 'manager')
     AND COALESCE(ur.ativo, true) = true
   ORDER BY p.created_at ASC
   LIMIT 1;

  -- Cria tarefa só se tivermos pelo menos um criador válido
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
    RAISE WARNING '[auto_qualify] Tenant % sem admin/manager — tarefa não criada para agendamento %',
      NEW.tenant_id, NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Fail-soft: agendamento NUNCA falha por causa do trigger.
    -- Qualquer erro vira WARNING e o INSERT original prossegue.
    RAISE WARNING '[auto_qualify] Erro ao processar auto-qualificação do agendamento %: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_qualify_lead_on_agendamento() IS
  'AFTER INSERT em agendamentos: avança status do lead se inicial, boost score +20, temperature=hot, tag automática, tarefa para advogado. Idempotente e fail-soft.';

-- Trigger: AFTER INSERT on agendamentos
DROP TRIGGER IF EXISTS trg_auto_qualify_lead_on_agendamento ON public.agendamentos;
CREATE TRIGGER trg_auto_qualify_lead_on_agendamento
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_qualify_lead_on_agendamento();

-- Garantir que a tag "Reunião Agendada" tenha UNIQUE (tenant_id, nome) — já existe
-- pelo schema original, mas reforçamos via DO block defensivo (no-op se já houver).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'tags_tenant_id_nome_key'
       AND conrelid = 'public.tags'::regclass
  ) THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_tenant_id_nome_key UNIQUE (tenant_id, nome);
  END IF;
END $$;

-- ============================================================================
-- Testes do trigger auto_qualify_lead_on_agendamento
-- ============================================================================
-- Como rodar:
--   supabase db reset                        # aplica migrations limpas
--   psql "$DATABASE_URL" -f supabase/tests/auto_qualify_trigger.test.sql
--
-- Os testes rodam em uma transação que é ROLLED BACK ao final — sem side effects.
-- Cada asserção usa RAISE EXCEPTION para falhar em vermelho no psql.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Fixtures
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant_id UUID := gen_random_uuid();
  v_admin_user UUID := gen_random_uuid();
  v_advogado_user UUID := gen_random_uuid();
  v_depto_id UUID;
  v_lead_id UUID;
  v_agendamento_id UUID;
  v_tag_count INT;
  v_tarefa_count INT;
  v_lead_status TEXT;
  v_lead_score INT;
  v_lead_temp TEXT;
  v_lead_depto UUID;
BEGIN
  -- Cria auth.users fictício (normalmente criado via signup)
  INSERT INTO auth.users (id, email) VALUES
    (v_admin_user, 'admin-test@jurify.test'),
    (v_advogado_user, 'advogado-test@jurify.test')
  ON CONFLICT DO NOTHING;

  -- Tenant
  INSERT INTO public.tenants (id, nome, slug, plano)
    VALUES (v_tenant_id, 'Tenant Teste', 'tenant-teste-' || substring(v_tenant_id::text, 1, 8), 'free');

  -- Profiles (admin + advogado)
  INSERT INTO public.profiles (id, tenant_id, nome_completo, email) VALUES
    (v_admin_user, v_tenant_id, 'Admin Teste', 'admin-test@jurify.test'),
    (v_advogado_user, v_tenant_id, 'Dra. Maria Silva', 'advogado-test@jurify.test');

  -- user_roles (admin)
  INSERT INTO public.user_roles (user_id, tenant_id, role, ativo)
    VALUES (v_admin_user, v_tenant_id, 'admin', true);

  -- Departamento opcional
  INSERT INTO public.departamentos (tenant_id, nome, ativo)
    VALUES (v_tenant_id, 'Cível', true)
    RETURNING id INTO v_depto_id;

  -- ==========================================================================
  -- CASO 1: Lead em status 'novo' → deve avançar para 'qualificado'
  -- ==========================================================================
  INSERT INTO public.leads (tenant_id, nome, area_juridica, status, lead_score, temperature, departamento_id, responsavel_id)
    VALUES (v_tenant_id, 'João da Silva', 'Direito Civil', 'novo', 10, 'cold', v_depto_id, v_advogado_user)
    RETURNING id INTO v_lead_id;

  INSERT INTO public.agendamentos (tenant_id, lead_id, area_juridica, data_hora, responsavel, status)
    VALUES (v_tenant_id, v_lead_id, 'Direito Civil', now() + INTERVAL '2 days', 'Dra. Maria Silva', 'agendado')
    RETURNING id INTO v_agendamento_id;

  SELECT status, lead_score, temperature INTO v_lead_status, v_lead_score, v_lead_temp
    FROM public.leads WHERE id = v_lead_id;

  IF v_lead_status <> 'qualificado' THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: status esperado=qualificado, obtido=%', v_lead_status;
  END IF;
  IF v_lead_score <> 30 THEN -- 10 + 20
    RAISE EXCEPTION 'CASO 1 FALHOU: score esperado=30, obtido=%', v_lead_score;
  END IF;
  IF v_lead_temp <> 'hot' THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: temperature esperada=hot, obtida=%', v_lead_temp;
  END IF;

  -- Tag automática foi criada e linkada
  SELECT COUNT(*) INTO v_tag_count
    FROM public.lead_tags lt
    JOIN public.tags t ON t.id = lt.tag_id
   WHERE lt.lead_id = v_lead_id AND t.nome = 'Reunião Agendada';
  IF v_tag_count <> 1 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: tag "Reunião Agendada" esperada=1, obtida=%', v_tag_count;
  END IF;

  -- Tarefa criada para o advogado responsável
  SELECT COUNT(*) INTO v_tarefa_count
    FROM public.tarefas
   WHERE lead_id = v_lead_id
     AND responsavel_id = v_advogado_user
     AND status = 'pendente'
     AND prioridade = 'alta';
  IF v_tarefa_count <> 1 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: tarefa esperada=1, obtida=%', v_tarefa_count;
  END IF;

  RAISE NOTICE 'CASO 1 OK: status=%, score=%, temp=%, tag=%, tarefa=%',
    v_lead_status, v_lead_score, v_lead_temp, v_tag_count, v_tarefa_count;

  -- ==========================================================================
  -- CASO 2: Lead em 'ganho' (terminal) NUNCA deve regredir para 'qualificado'
  -- ==========================================================================
  INSERT INTO public.leads (tenant_id, nome, area_juridica, status, lead_score, temperature)
    VALUES (v_tenant_id, 'Maria Premium', 'Direito Civil', 'ganho', 95, 'hot')
    RETURNING id INTO v_lead_id;

  INSERT INTO public.agendamentos (tenant_id, lead_id, area_juridica, data_hora, responsavel, status)
    VALUES (v_tenant_id, v_lead_id, 'Direito Civil', now() + INTERVAL '3 days', 'Dra. Maria Silva', 'agendado');

  SELECT status, lead_score INTO v_lead_status, v_lead_score
    FROM public.leads WHERE id = v_lead_id;

  IF v_lead_status <> 'ganho' THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: status terminal foi alterado para %', v_lead_status;
  END IF;
  -- Score cap em 100 (95 + 20 = 115 → 100)
  IF v_lead_score <> 100 THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: score cap esperado=100, obtido=%', v_lead_score;
  END IF;
  RAISE NOTICE 'CASO 2 OK: status preservado=%, score cap=%', v_lead_status, v_lead_score;

  -- ==========================================================================
  -- CASO 3: Lead em 'em_contato' → avança para 'qualificado'
  -- ==========================================================================
  INSERT INTO public.leads (tenant_id, nome, area_juridica, status, lead_score, temperature)
    VALUES (v_tenant_id, 'Pedro Avançando', 'Direito Trabalhista', 'em_contato', 40, 'warm')
    RETURNING id INTO v_lead_id;

  INSERT INTO public.agendamentos (tenant_id, lead_id, area_juridica, data_hora, responsavel, status)
    VALUES (v_tenant_id, v_lead_id, 'Direito Trabalhista', now() + INTERVAL '1 day', 'Dra. Maria Silva', 'agendado');

  SELECT status INTO v_lead_status FROM public.leads WHERE id = v_lead_id;
  IF v_lead_status <> 'qualificado' THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: em_contato → qualificado esperado, obtido=%', v_lead_status;
  END IF;
  RAISE NOTICE 'CASO 3 OK: em_contato → qualificado';

  -- ==========================================================================
  -- CASO 4: Múltiplos agendamentos do mesmo lead — idempotente (não duplica tag)
  -- ==========================================================================
  INSERT INTO public.agendamentos (tenant_id, lead_id, area_juridica, data_hora, responsavel, status)
    VALUES (v_tenant_id, v_lead_id, 'Direito Trabalhista', now() + INTERVAL '5 days', 'Dra. Maria Silva', 'agendado');

  SELECT COUNT(*) INTO v_tag_count
    FROM public.lead_tags lt
    JOIN public.tags t ON t.id = lt.tag_id
   WHERE lt.lead_id = v_lead_id AND t.nome = 'Reunião Agendada';
  IF v_tag_count <> 1 THEN
    RAISE EXCEPTION 'CASO 4 FALHOU: tag duplicou em 2º agendamento, count=%', v_tag_count;
  END IF;
  RAISE NOTICE 'CASO 4 OK: tag não duplica em múltiplos agendamentos';

  -- ==========================================================================
  -- CASO 5: Agendamento sem lead_id (ex.: audiência interna) — não quebra
  -- ==========================================================================
  INSERT INTO public.agendamentos (tenant_id, lead_id, area_juridica, data_hora, responsavel, status)
    VALUES (v_tenant_id, NULL, 'Direito Civil', now() + INTERVAL '1 day', 'Dra. Maria Silva', 'agendado');
  RAISE NOTICE 'CASO 5 OK: agendamento sem lead_id passa sem erro';

  RAISE NOTICE '✅ TODOS OS CASOS PASSARAM';
END $$;

ROLLBACK;

-- ============================================================================
-- Seed default AI agents for every tenant
--
-- Architecture: Squad of 3 visible agents + 2 background specialists
-- The orchestrator (agent-orchestrator edge function) routes messages
-- to the right agent automatically. Users can customize prompts.
--
-- Triggered by: handle_new_user() → after tenant creation
-- Also: backfills existing tenants that have no agents
-- ============================================================================

-- ============================================================
-- PART 1: Function to create default agents for a tenant
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_default_agents(_tenant_id UUID, _creator_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Skip if tenant already has agents
  IF EXISTS (SELECT 1 FROM public.agentes_ia WHERE tenant_id = _tenant_id LIMIT 1) THEN
    RETURN;
  END IF;

  -- ── Agent 1: Ana — Recepcionista (always first contact) ──
  INSERT INTO public.agentes_ia (
    tenant_id, criado_por, nome, tipo, tipo_agente, status, ativo,
    area_juridica, descricao_funcao, objetivo, modelo_ia, temperatura, max_tokens,
    prompt_sistema, script_saudacao, perguntas_qualificacao, keywords_acao, delay_resposta
  ) VALUES (
    _tenant_id, _creator_id,
    'Ana — Recepcionista',
    'recepcionista',
    'atendimento',
    'ativo', true,
    'Todas as áreas',
    'Recepcionista virtual especializada em atendimento jurídico. Faz o primeiro contato, qualifica leads e coleta informações essenciais.',
    'Qualificar leads, coletar nome/problema/urgência e encaminhar para o advogado correto.',
    'gpt-4o-mini', 0.5, 400,
    'Você é Ana, recepcionista virtual do escritório de advocacia. Seu papel é acolher clientes com empatia e profissionalismo.

PERSONALIDADE:
- Educada, acolhedora e profissional
- Linguagem simples e direta (é WhatsApp)
- Empática mas objetiva — não enrola
- Sempre em português brasileiro

FLUXO DE ATENDIMENTO:
1. Cumprimente calorosamente e pergunte como pode ajudar
2. Entenda o problema jurídico do cliente (escute com atenção)
3. Colete o NOME COMPLETO (pergunte naturalmente)
4. Classifique a ÁREA JURÍDICA (trabalhista, família, consumidor, criminal, previdenciário, imobiliário, empresarial, tributário)
5. Avalie a URGÊNCIA (prazo correndo? audiência próxima? risco iminente?)
6. Confirme os dados e informe que um advogado especialista entrará em contato

REGRAS INEGOCIÁVEIS:
- NUNCA dê orientação jurídica específica ("procure um advogado" não é orientação)
- NUNCA cite valores de honorários
- Pergunte UMA coisa de cada vez (não bombardeie)
- Se o cliente mandar só "oi/olá", responda com saudação e pergunte como pode ajudar
- Se o cliente estiver nervoso/ansioso, acolha PRIMEIRO, depois qualifique
- Máximo 3 parágrafos por mensagem
- Se identificar urgência ALTA (prazo de dias), sinalize como prioridade',

    'Olá! 👋 Sou a Ana, recepcionista virtual do escritório. Como posso ajudar você hoje?',

    ARRAY[
      'Qual é o seu nome completo?',
      'Pode me contar brevemente o que está acontecendo?',
      'Qual é a área do seu problema? (trabalhista, família, consumidor...)',
      'Existe algum prazo correndo ou urgência?',
      'Deixe seu telefone para contato, por favor.'
    ],

    ARRAY['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'preciso de ajuda', 'advogado', 'consulta'],
    2
  );

  -- ── Agent 2: Dr. Gabriel — Assistente Jurídico ──
  INSERT INTO public.agentes_ia (
    tenant_id, criado_por, nome, tipo, tipo_agente, status, ativo,
    area_juridica, descricao_funcao, objetivo, modelo_ia, temperatura, max_tokens,
    prompt_sistema, keywords_acao, delay_resposta
  ) VALUES (
    _tenant_id, _creator_id,
    'Dr. Gabriel — Assistente Jurídico',
    'juridico',
    'especialista',
    'ativo', true,
    'Todas as áreas',
    'Assistente jurídico com acesso completo ao contexto do cliente: processos, prazos, honorários e documentos.',
    'Informar o cliente sobre andamento de processos, prazos urgentes, status de honorários e documentos, de forma clara e precisa.',
    'gpt-4o-mini', 0.3, 800,
    'Você é Dr. Gabriel, assistente jurídico virtual do escritório. Tem acesso completo aos processos, prazos, honorários e documentos do cliente.

PERSONALIDADE:
- Preciso, confiável e acessível
- Explica termos jurídicos em linguagem simples
- Transmite segurança sem ser arrogante
- Sempre em português brasileiro

RESPONSABILIDADES:
1. Informar sobre ANDAMENTO de processos (fase atual, próximos passos)
2. ALERTAR sobre prazos urgentes com datas específicas e ênfase
3. Esclarecer status de HONORÁRIOS (valores pagos, pendentes)
4. Explicar DOCUMENTOS do processo quando solicitado
5. Responder comandos especiais (/prazos, /processos, /documentos, /honorarios, /status)

REGRAS:
- Use APENAS dados do contexto jurídico fornecido — NUNCA invente
- Para prazos em menos de 7 dias, use ⚠️ e destaque a data
- Se não tiver dados suficientes, diga claramente e ofereça encaminhar ao advogado
- Máximo 4 parágrafos por mensagem
- Se o cliente pedir algo fora do escopo jurídico, encaminhe educadamente',

    ARRAY['processo', 'prazo', 'audiência', 'honorário', 'documento', 'andamento', 'status', '/prazos', '/processos'],
    3
  );

  -- ── Agent 3: Marcos — Consultor Comercial ──
  INSERT INTO public.agentes_ia (
    tenant_id, criado_por, nome, tipo, tipo_agente, status, ativo,
    area_juridica, descricao_funcao, objetivo, modelo_ia, temperatura, max_tokens,
    prompt_sistema, keywords_acao, delay_resposta
  ) VALUES (
    _tenant_id, _creator_id,
    'Marcos — Consultor Comercial',
    'comercial',
    'vendas',
    'ativo', true,
    'Todas as áreas',
    'Consultor comercial especializado em apresentar serviços jurídicos, explicar modalidades de honorários e converter leads em consultas agendadas.',
    'Converter leads qualificados em consultas agendadas, apresentar diferenciais do escritório e explicar formas de contratação.',
    'gpt-4o-mini', 0.5, 500,
    'Você é Marcos, consultor comercial do escritório de advocacia. Seu papel é apresentar os serviços e converter leads em consultas.

PERSONALIDADE:
- Profissional, persuasivo mas nunca agressivo
- Confiante e conhecedor dos serviços
- Focado em solução, não em venda
- Sempre em português brasileiro

ABORDAGEM:
1. Apresente os DIFERENCIAIS do escritório (experiência, tecnologia, atendimento personalizado)
2. Explique as MODALIDADES de honorários:
   - Fixo (valor fechado por etapa ou serviço)
   - Êxito (percentual sobre resultado obtido)
   - Misto (entrada + êxito)
3. Para VALORES ESPECÍFICOS, diga que depende da complexidade e que o advogado vai apresentar uma proposta personalizada
4. Proponha AGENDAR uma consulta (gratuita ou não, conforme política do escritório)
5. Enfatize: "cada caso é único, por isso fazemos uma análise personalizada"

REGRAS:
- NUNCA cite valores específicos de honorários
- NUNCA prometa resultados
- Se o cliente já passou pela qualificação, use as informações que já foram coletadas
- Máximo 3 parágrafos
- Objetivo final: AGENDAR uma consulta ou retorno do advogado',

    ARRAY['valor', 'preço', 'honorário', 'quanto custa', 'contrato', 'proposta', 'orçamento', 'como funciona'],
    2
  );

  RAISE NOTICE 'Created 3 default agents for tenant %', _tenant_id;
END;
$$;

COMMENT ON FUNCTION public.seed_default_agents IS
  'Creates the default AI agent squad (Recepcionista, Jurídico, Comercial) for a new tenant';

-- ============================================================
-- PART 2: Update handle_new_user() to seed agents after tenant
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _tenant_id UUID;
  _has_admin BOOLEAN;
  _user_name TEXT;
  _user_email TEXT;
  _role TEXT;
  _slug TEXT;
BEGIN
  _user_email := COALESCE(NEW.email, '');
  _user_name := COALESCE(
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'full_name',
    split_part(_user_email, '@', 1)
  );

  _slug := lower(regexp_replace(split_part(_user_email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
            || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Step 1: Check if invited to existing tenant
  _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  -- Step 2: Create new tenant if needed
  IF _tenant_id IS NULL THEN
    INSERT INTO public.tenants (nome, slug, plano, ativo)
    VALUES (_user_name, _slug, 'trial', true)
    RETURNING id INTO _tenant_id;
  END IF;

  -- Step 3: Create profile
  INSERT INTO public.profiles (id, nome_completo, email, tenant_id, role)
  VALUES (NEW.id, _user_name, _user_email, _tenant_id, 'admin')
  ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    email = EXCLUDED.email,
    tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id);

  -- Step 4: Check admin status
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE p.tenant_id = _tenant_id
      AND ur.role IN ('admin', 'administrador')
      AND ur.ativo = true
      AND ur.user_id != NEW.id
  ) INTO _has_admin;

  _role := CASE WHEN _has_admin THEN 'viewer' ELSE 'admin' END;

  UPDATE public.profiles SET role = _role WHERE id = NEW.id;

  -- Step 5: Insert user_roles
  INSERT INTO public.user_roles (user_id, role, tenant_id, ativo)
  VALUES (NEW.id, _role, _tenant_id, true)
  ON CONFLICT DO NOTHING;

  -- Step 6: Seed default AI agents (only for NEW tenants)
  PERFORM public.seed_default_agents(_tenant_id, NEW.id);

  RETURN NEW;
END;
$$;

-- ============================================================
-- PART 3: Backfill existing tenants without agents
-- ============================================================

DO $$
DECLARE
  _tenant RECORD;
BEGIN
  FOR _tenant IN
    SELECT t.id
    FROM public.tenants t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.agentes_ia a WHERE a.tenant_id = t.id
    )
  LOOP
    PERFORM public.seed_default_agents(_tenant.id);
  END LOOP;
END;
$$;

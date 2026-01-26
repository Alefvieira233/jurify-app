-- Align core tables with app fields (safe, additive changes only)

-- agentes_ia: ensure app fields exist
ALTER TABLE public.agentes_ia
  ADD COLUMN IF NOT EXISTS script_saudacao TEXT,
  ADD COLUMN IF NOT EXISTS delay_resposta INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS tipo_agente TEXT,
  ADD COLUMN IF NOT EXISTS descricao_funcao TEXT,
  ADD COLUMN IF NOT EXISTS prompt_base TEXT,
  ADD COLUMN IF NOT EXISTS parametros_avancados JSONB DEFAULT '{"temperatura":0.7,"top_p":0.9,"frequency_penalty":0,"presence_penalty":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS keywords_acao TEXT[],
  ADD COLUMN IF NOT EXISTS perguntas_qualificacao TEXT[],
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS area_juridica TEXT,
  ADD COLUMN IF NOT EXISTS objetivo TEXT;

-- Backfill tipo_agente from tipo when available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agentes_ia'
      AND column_name = 'tipo'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agentes_ia'
      AND column_name = 'tipo_agente'
  ) THEN
    UPDATE public.agentes_ia
    SET tipo_agente = COALESCE(tipo_agente, tipo)
    WHERE tipo_agente IS NULL;
  END IF;
END $$;

-- Backfill descricao_funcao/prompt_base from objetivo/script_saudacao
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agentes_ia'
      AND column_name = 'descricao_funcao'
  ) THEN
    UPDATE public.agentes_ia
    SET descricao_funcao = COALESCE(descricao_funcao, objetivo)
    WHERE descricao_funcao IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agentes_ia'
      AND column_name = 'prompt_base'
  ) THEN
    UPDATE public.agentes_ia
    SET prompt_base = COALESCE(prompt_base, script_saudacao)
    WHERE prompt_base IS NULL;
  END IF;
END $$;

-- contratos: add missing fields used by the app
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS nome_cliente TEXT,
  ADD COLUMN IF NOT EXISTS area_juridica TEXT,
  ADD COLUMN IF NOT EXISTS valor_causa NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS texto_contrato TEXT,
  ADD COLUMN IF NOT EXISTS clausulas_customizadas TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS responsavel TEXT,
  ADD COLUMN IF NOT EXISTS data_envio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_assinatura TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS status_assinatura TEXT,
  ADD COLUMN IF NOT EXISTS link_assinatura_zapsign TEXT,
  ADD COLUMN IF NOT EXISTS zapsign_document_id TEXT,
  ADD COLUMN IF NOT EXISTS data_geracao_link TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_envio_whatsapp TIMESTAMPTZ;

-- Backfill valor_causa from valor_total when possible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contratos'
      AND column_name = 'valor_total'
  ) THEN
    UPDATE public.contratos
    SET valor_causa = COALESCE(valor_causa, NULLIF(valor_total, '')::numeric)
    WHERE valor_causa IS NULL
      AND valor_total IS NOT NULL
      AND valor_total <> '';
  END IF;
END $$;

-- Backfill status from status_assinatura if status is missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contratos'
      AND column_name = 'status_assinatura'
  ) THEN
    UPDATE public.contratos
    SET status = COALESCE(status, status_assinatura)
    WHERE status IS NULL
      AND status_assinatura IS NOT NULL;
  END IF;
END $$;

-- agendamentos: add missing fields used by the app
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS area_juridica TEXT,
  ADD COLUMN IF NOT EXISTS responsavel TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

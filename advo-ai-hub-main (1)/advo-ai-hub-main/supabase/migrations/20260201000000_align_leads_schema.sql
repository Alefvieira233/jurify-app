-- Align leads schema with current app usage

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS nome TEXT;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS descricao TEXT;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES auth.users(id);

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'nome_completo'
  ) THEN
    UPDATE public.leads
    SET nome = COALESCE(nome, nome_completo)
    WHERE nome IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'observacoes'
  ) THEN
    UPDATE public.leads
    SET descricao = COALESCE(descricao, observacoes)
    WHERE descricao IS NULL AND observacoes IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'responsavel'
  ) THEN
    UPDATE public.leads
    SET metadata = metadata || jsonb_build_object('responsavel_nome', responsavel)
    WHERE responsavel IS NOT NULL
      AND (metadata IS NULL OR NOT (metadata ? 'responsavel_nome'));
  END IF;
END $$;

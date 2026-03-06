-- Migration: processos
-- Tabela de Processos/Expedientes Jurídicos

CREATE TABLE IF NOT EXISTS public.processos (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id                   UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  -- Identificação
  numero_processo           TEXT,
  tribunal                  TEXT,
  vara                      TEXT,
  comarca                   TEXT,
  -- Classificação
  tipo_acao                 TEXT NOT NULL CHECK (tipo_acao IN (
    'civel', 'criminal', 'trabalhista', 'previdenciario', 'familia',
    'empresarial', 'tributario', 'administrativo', 'outro'
  )),
  area_juridica             TEXT,
  fase_processual           TEXT NOT NULL DEFAULT 'conhecimento' CHECK (fase_processual IN (
    'conhecimento', 'recurso', 'execucao', 'cumprimento_sentenca', 'encerrado'
  )),
  posicao                   TEXT NOT NULL DEFAULT 'autor' CHECK (posicao IN (
    'autor', 'reu', 'terceiro', 'assistente'
  )),
  -- Responsabilidade
  responsavel_id            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Financeiro
  valor_causa               NUMERIC(15,2),
  valor_honorario_acordado  NUMERIC(15,2),
  tipo_honorario            TEXT DEFAULT 'fixo' CHECK (tipo_honorario IN (
    'fixo', 'hora', 'contingencia', 'misto'
  )),
  -- Datas
  data_distribuicao         DATE,
  data_encerramento         DATE,
  -- Status
  status                    TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN (
    'ativo', 'suspenso', 'encerrado_vitoria', 'encerrado_derrota',
    'encerrado_acordo', 'arquivado'
  )),
  -- Metadados
  observacoes               TEXT,
  partes_contrarias         TEXT[],
  tags                      TEXT[],
  metadata                  JSONB DEFAULT '{}'::jsonb,
  -- Timestamps
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_processos_tenant
  ON public.processos(tenant_id);

CREATE INDEX IF NOT EXISTS idx_processos_tenant_status
  ON public.processos(tenant_id, status) WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_processos_lead_id
  ON public.processos(lead_id) WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processos_responsavel
  ON public.processos(responsavel_id, tenant_id) WHERE responsavel_id IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_processos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER processos_updated_at
  BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.set_processos_updated_at();

-- RLS
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_processos_select" ON public.processos
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "rls_processos_insert" ON public.processos
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "rls_processos_update" ON public.processos
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND tenant_id = public.get_current_tenant_id())
  WITH CHECK (auth.uid() IS NOT NULL AND tenant_id = public.get_current_tenant_id());

CREATE POLICY "rls_processos_delete" ON public.processos
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

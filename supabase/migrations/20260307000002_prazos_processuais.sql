-- Migration: prazos_processuais
-- Tabela de Prazos Processuais com alertas

CREATE TABLE IF NOT EXISTS public.prazos_processuais (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id      UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  lead_id          UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  -- Descrição
  tipo             TEXT NOT NULL CHECK (tipo IN (
    'audiencia', 'peticao', 'recurso', 'manifestacao', 'prazo_fatal',
    'despacho', 'sentenca', 'outro'
  )),
  descricao        TEXT NOT NULL,
  -- Datas e alertas
  data_prazo       TIMESTAMPTZ NOT NULL,
  alertas_dias     INT[] NOT NULL DEFAULT '{7,3,1}',
  -- Responsabilidade
  responsavel_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Status
  status           TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'cumprido', 'perdido', 'cancelado'
  )),
  data_cumprimento TIMESTAMPTZ,
  observacoes      TEXT,
  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prazos_tenant
  ON public.prazos_processuais(tenant_id);

CREATE INDEX IF NOT EXISTS idx_prazos_processo
  ON public.prazos_processuais(processo_id);

CREATE INDEX IF NOT EXISTS idx_prazos_data_prazo
  ON public.prazos_processuais(tenant_id, data_prazo)
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_prazos_vencendo
  ON public.prazos_processuais(data_prazo)
  WHERE status = 'pendente' AND data_prazo > NOW();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_prazos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER prazos_updated_at
  BEFORE UPDATE ON public.prazos_processuais
  FOR EACH ROW EXECUTE FUNCTION public.set_prazos_updated_at();

-- RLS
ALTER TABLE public.prazos_processuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_prazos_all" ON public.prazos_processuais
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Migration: honorarios
-- Tabela de Honorários Advocatícios

CREATE TABLE IF NOT EXISTS public.honorarios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id           UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  lead_id               UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  -- Tipo e valores
  tipo                  TEXT NOT NULL DEFAULT 'fixo' CHECK (tipo IN (
    'fixo', 'hora', 'contingencia', 'misto', 'retainer'
  )),
  valor_fixo            NUMERIC(15,2),
  valor_hora            NUMERIC(10,2),
  taxa_contingencia     NUMERIC(5,2),
  horas_estimadas       NUMERIC(8,2),
  -- Pagamentos
  valor_total_acordado  NUMERIC(15,2),
  valor_adiantamento    NUMERIC(15,2) DEFAULT 0,
  valor_recebido        NUMERIC(15,2) DEFAULT 0,
  data_vencimento       DATE,
  -- Status
  status                TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN (
    'vigente', 'pago', 'inadimplente', 'cancelado', 'disputado'
  )),
  -- Metadados
  observacoes           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_honorarios_tenant
  ON public.honorarios(tenant_id);

CREATE INDEX IF NOT EXISTS idx_honorarios_processo
  ON public.honorarios(processo_id) WHERE processo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_honorarios_status
  ON public.honorarios(tenant_id, status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_honorarios_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER honorarios_updated_at
  BEFORE UPDATE ON public.honorarios
  FOR EACH ROW EXECUTE FUNCTION public.set_honorarios_updated_at();

-- RLS
ALTER TABLE public.honorarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_honorarios_all" ON public.honorarios
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

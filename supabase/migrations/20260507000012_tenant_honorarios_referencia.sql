-- Tabela de referência de honorários por escritório (uso INTERNO).
-- Compliance OAB Provimento 205/2021 art. 7º: tabela de honorários NÃO pode
-- ser publicidade — vedada exposição automática a leads/clientes via canal IA.
-- Esta tabela serve a sócios/equipe pra base de cálculo de propostas; o agente
-- IA cliente-facing NÃO consulta automaticamente. Apenas via ação manual do
-- profissional autorizado (botão "gerar proposta").

CREATE TABLE IF NOT EXISTS public.tenant_honorarios_referencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  area_juridica TEXT NOT NULL,
  modalidade TEXT NOT NULL CHECK (modalidade IN ('fixo', 'exito', 'misto', 'consulta_avulsa', 'mensal', 'hora')),
  descricao TEXT NULL,
  valor_min NUMERIC(12,2) NULL,
  valor_max NUMERIC(12,2) NULL,
  percentual_exito NUMERIC(5,2) NULL,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  observacoes_internas TEXT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  internal_only BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_honorarios_ref_tenant_area
  ON public.tenant_honorarios_referencia (tenant_id, area_juridica)
  WHERE ativo = true;

ALTER TABLE public.tenant_honorarios_referencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_honorarios_referencia FORCE ROW LEVEL SECURITY;

-- Apenas admin/manager do tenant lê/escreve
CREATE POLICY tenant_honorarios_ref_select ON public.tenant_honorarios_referencia
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.ativo = true
        AND ur.role IN ('admin', 'administrador', 'manager', 'gerente')
    )
  );

CREATE POLICY tenant_honorarios_ref_insert ON public.tenant_honorarios_referencia
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT ur.tenant_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.ativo = true
        AND ur.role IN ('admin', 'administrador', 'manager', 'gerente')
    )
  );

CREATE POLICY tenant_honorarios_ref_update ON public.tenant_honorarios_referencia
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.ativo = true
        AND ur.role IN ('admin', 'administrador', 'manager', 'gerente')
    )
  );

CREATE POLICY tenant_honorarios_ref_delete ON public.tenant_honorarios_referencia
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.ativo = true
        AND ur.role = 'admin'
    )
  );

-- Trigger pra atualizar updated_at
CREATE TRIGGER trg_tenant_honorarios_ref_updated_at
  BEFORE UPDATE ON public.tenant_honorarios_referencia
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.tenant_honorarios_referencia IS
  'Tabela de honorários de referência por escritório. USO INTERNO — não injetar no contexto cliente-facing IA por default. Compliance OAB Prov. 205/2021 art. 7º.';
COMMENT ON COLUMN public.tenant_honorarios_referencia.internal_only IS
  'Quando true (default), valores não devem ser expostos em respostas IA a leads/clientes externos.';

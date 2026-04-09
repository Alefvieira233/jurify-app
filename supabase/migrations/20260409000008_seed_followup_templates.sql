-- =============================================================================
-- Seed default follow-up message templates per pipeline stage
-- Used by auto-followup Edge Function and manual follow-up UI
-- =============================================================================

-- Create templates table if not exists (lightweight, tenant-scoped)
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  stage TEXT NOT NULL, -- Pipeline stage: novo, em_contato, qualificado, proposta, negociacao
  channel TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp | email
  nome TEXT NOT NULL, -- Template name
  conteudo TEXT NOT NULL, -- Message content with placeholders: {nome}, {area}, {escritorio}, {dias}
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, stage, channel, nome)
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_message_templates_select" ON public.message_templates
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "rls_message_templates_insert" ON public.message_templates
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "rls_message_templates_update" ON public.message_templates
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "rls_message_templates_delete" ON public.message_templates
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.is_admin_or_manager()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_tenant_stage
ON public.message_templates(tenant_id, stage, channel)
WHERE ativo = true;

-- Seed default templates for all existing tenants
INSERT INTO public.message_templates (tenant_id, stage, channel, nome, conteudo)
SELECT
  t.id,
  stage,
  'whatsapp',
  nome,
  conteudo
FROM (SELECT DISTINCT tenant_id AS id FROM profiles WHERE tenant_id IS NOT NULL) t
CROSS JOIN (VALUES
  ('novo', 'Primeiro contato', 'Olá, {nome}! Aqui é do escritório {escritorio}. Recebemos seu contato e gostaríamos de saber como podemos ajudar. Estamos à disposição para uma consulta inicial sem compromisso.'),
  ('em_contato', 'Follow-up após contato', 'Olá, {nome}! Conversamos há {dias} dias{area} e gostaríamos de saber se podemos ajudar com mais alguma orientação. Posso agendar uma consulta com nosso advogado especialista?'),
  ('qualificado', 'Proposta de consulta', 'Olá, {nome}! Sou do escritório {escritorio}. Já analisamos sua situação{area} e temos uma proposta que pode ajudá-lo(a). Posso agendar uma conversa rápida com o advogado responsável?'),
  ('proposta', 'Follow-up proposta', 'Olá, {nome}! Enviamos uma proposta{area} e gostaríamos de saber se ficou alguma dúvida. Estamos à disposição para esclarecer qualquer ponto ou ajustar as condições.'),
  ('negociacao', 'Fechamento', 'Olá, {nome}! Estamos em negociação{area} e gostaríamos de avançar. Tem alguma pendência ou dúvida que possamos resolver? Estamos prontos para fechar.')
) AS templates(stage, nome, conteudo)
ON CONFLICT (tenant_id, stage, channel, nome) DO NOTHING;

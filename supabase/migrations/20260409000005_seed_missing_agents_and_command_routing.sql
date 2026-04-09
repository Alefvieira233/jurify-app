-- =============================================================================
-- Seed missing agents (suporte + analista_documentos) for all existing tenants
-- These agents existed in code but were never seeded in DB, causing
-- silent fallback to hardcoded prompts on every message routed to them.
-- =============================================================================

-- Add suporte agent to all tenants that don't have one
INSERT INTO public.agentes_ia (tenant_id, tipo, nome, prompt_sistema, temperatura, max_tokens, ativo)
SELECT DISTINCT
  t.id,
  'suporte',
  'Suporte ao Cliente',
  'Você é o suporte ao cliente do escritório de advocacia. Seja empático, consulte os dados do sistema para dar respostas precisas sobre andamento de processos, honorários e documentos. Para reclamações, valide o sentimento do cliente e informe que o advogado responsável será notificado em até 24h.',
  0.4,
  500,
  true
FROM (SELECT DISTINCT tenant_id AS id FROM profiles WHERE tenant_id IS NOT NULL) t
WHERE NOT EXISTS (
  SELECT 1 FROM agentes_ia ai
  WHERE ai.tenant_id = t.id AND ai.tipo = 'suporte'
);

-- Add analista_documentos agent to all tenants that don't have one
INSERT INTO public.agentes_ia (tenant_id, tipo, nome, prompt_sistema, temperatura, max_tokens, ativo)
SELECT DISTINCT
  t.id,
  'analista_documentos',
  'Analista de Documentos',
  'Você é o analista de documentos do escritório de advocacia. Identifique o tipo de documento (contrato, petição, notificação, comprovante), resuma pontos-chave, destaque prazos e valores, e informe que o advogado vai analisar em detalhes. NÃO dê parecer jurídico.',
  0.2,
  600,
  true
FROM (SELECT DISTINCT tenant_id AS id FROM profiles WHERE tenant_id IS NOT NULL) t
WHERE NOT EXISTS (
  SELECT 1 FROM agentes_ia ai
  WHERE ai.tenant_id = t.id AND ai.tipo = 'analista_documentos'
);

-- Update the seed function to include these agents for NEW tenants
CREATE OR REPLACE FUNCTION public.seed_default_agents_v2(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only seed if tenant has no agents yet
  IF EXISTS (SELECT 1 FROM agentes_ia WHERE tenant_id = p_tenant_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO agentes_ia (tenant_id, tipo, nome, prompt_sistema, temperatura, max_tokens, ativo) VALUES
    (p_tenant_id, 'recepcionista', 'Ana', 'Recepcionista virtual do escritório. Acolhe o cliente, coleta nome e direciona para o assistente jurídico se houver demanda legal. Respostas curtas e profissionais.', 0.5, 400, true),
    (p_tenant_id, 'juridico', 'Dr. Gabriel', 'Assistente jurídico do escritório. Orienta clientes sobre processos, prazos e honorários usando dados do sistema. Para novos leads, identifica a área do direito e sugere consulta com advogado. NÃO dá parecer definitivo.', 0.3, 800, true),
    (p_tenant_id, 'comercial', 'Marcos', 'Consultor comercial do escritório. Apresenta serviços, explica modalidades de honorários e guia o lead para agendar consulta. Não cita valores específicos sem análise do advogado.', 0.5, 500, true),
    (p_tenant_id, 'suporte', 'Suporte', 'Suporte ao cliente do escritório. Ajuda com andamento de processos, pagamentos e reclamações. Empático e objetivo. Encaminha para advogado quando necessário.', 0.4, 500, true),
    (p_tenant_id, 'analista_documentos', 'Analista', 'Analista de documentos jurídicos. Identifica tipo de documento, resume pontos-chave, destaca prazos e valores. NÃO dá parecer jurídico.', 0.2, 600, true);
END;
$$;

-- ========================================
-- SCRIPT PARA POPULAR O JURIFY COM DADOS
-- Execute no Supabase Dashboard > SQL Editor
-- ========================================

-- 1️⃣ INSERIR LEADS
INSERT INTO leads (nome_completo, email, telefone, area_juridica, origem, responsavel, status, valor_causa, observacoes) VALUES
('João Silva Santos', 'joao.silva@email.com', '+55 11 98765-4321', 'trabalhista', 'whatsapp', 'Dr. Roberto Lima', 'novo', 15000.00, 'Cliente interessado em ação trabalhista por rescisão indevida'),
('Maria Oliveira Costa', 'maria.oliveira@email.com', '+55 11 97654-3210', 'civel', 'site', 'Dra. Fernanda Souza', 'qualificado', 50000.00, 'Ação de indenização por danos morais'),
('Pedro Henrique Alves', 'pedro.alves@email.com', '+55 11 96543-2109', 'criminal', 'indicacao', 'Dr. Marcos Pereira', 'proposta', 30000.00, 'Defesa criminal - furto qualificado'),
('Ana Carolina Mendes', 'ana.mendes@email.com', '+55 11 95432-1098', 'previdenciario', 'whatsapp', 'Dra. Juliana Castro', 'contrato', 8000.00, 'Aposentadoria por invalidez'),
('Carlos Eduardo Souza', 'carlos.souza@email.com', '+55 11 94321-0987', 'consumidor', 'site', 'Dr. Rafael Torres', 'atendimento', 5000.00, 'Problema com produto defeituoso'),
('Juliana Fernandes', 'juliana.fernandes@email.com', '+55 11 93210-9876', 'trabalhista', 'whatsapp', 'Dr. Roberto Lima', 'perdido', 12000.00, 'Desistiu do processo'),
('Ricardo Martins', 'ricardo.martins@email.com', '+55 11 92109-8765', 'civel', 'indicacao', 'Dra. Fernanda Souza', 'novo', 25000.00, 'Ação de despejo'),
('Beatriz Lima', 'beatriz.lima@email.com', '+55 11 91098-7654', 'familia', 'site', 'Dra. Juliana Castro', 'qualificado', 10000.00, 'Divórcio consensual'),
('Fernando Costa', 'fernando.costa@email.com', '+55 11 90987-6543', 'trabalhista', 'whatsapp', 'Dr. Roberto Lima', 'proposta', 18000.00, 'Horas extras não pagas'),
('Patricia Santos', 'patricia.santos@email.com', '+55 11 89876-5432', 'consumidor', 'site', 'Dr. Rafael Torres', 'novo', 3500.00, 'Cobrança indevida');

-- 2️⃣ INSERIR AGENDAMENTOS
INSERT INTO agendamentos (lead_id, data_hora, area_juridica, responsavel, status, observacoes)
SELECT
  id,
  NOW() + INTERVAL '1 day' + (random() * INTERVAL '30 days'),
  area_juridica,
  responsavel,
  'agendado',
  'Primeira consulta agendada'
FROM leads
WHERE status IN ('qualificado', 'proposta', 'contrato')
LIMIT 5;

-- 3️⃣ INSERIR CONTRATOS
INSERT INTO contratos (lead_id, titulo, valor, status, area_juridica, responsavel, data_inicio)
SELECT
  id,
  'Contrato de Prestação de Serviços Jurídicos - ' || nome_completo,
  valor_causa,
  'ativo',
  area_juridica,
  responsavel,
  NOW()
FROM leads
WHERE status = 'contrato'
LIMIT 3;

-- 4️⃣ INSERIR AGENTES IA
INSERT INTO agentes_ia (nome, area_juridica, objetivo, descricao_funcao, prompt_base, script_saudacao, status, tipo_agente) VALUES
('Qualificador Trabalhista', 'trabalhista', 'Qualificar e categorizar leads da área trabalhista', 'Identifica tipo de caso trabalhista e urgência', 'Você é um especialista em direito do trabalho. Analise o caso e identifique: tipo de ação, urgência, valor estimado, documentos necessários.', 'Olá! Sou especialista em direito trabalhista. Vou te ajudar a qualificar seu caso.', 'ativo', 'qualificacao'),
('Qualificador Cível', 'civel', 'Qualificar e categorizar leads da área cível', 'Identifica tipo de ação cível e complexidade', 'Você é um especialista em direito civil. Analise o caso e identifique: tipo de ação, complexidade, prazos, documentos necessários.', 'Olá! Sou especialista em direito civil. Como posso te ajudar?', 'ativo', 'qualificacao'),
('Qualificador Criminal', 'criminal', 'Qualificar e categorizar leads da área criminal', 'Identifica tipo de crime e fase processual', 'Você é um especialista em direito penal. Analise o caso e identifique: tipo de crime, fase processual, urgência, estratégia de defesa.', 'Olá! Sou especialista em direito criminal. Vamos analisar seu caso.', 'ativo', 'qualificacao'),
('Agente de Follow-up', 'geral', 'Realizar follow-up automático com leads', 'Envia mensagens de acompanhamento personalizadas', 'Você é responsável por manter contato com os leads. Seja cordial, profissional e objetivo.', 'Olá! Estou entrando em contato para acompanhar seu caso.', 'ativo', 'followup'),
('Agente de Propostas', 'geral', 'Gerar propostas comerciais automáticas', 'Cria propostas personalizadas baseadas no caso', 'Você é responsável por criar propostas comerciais. Inclua: escopo, honorários, prazos, forma de pagamento.', 'Vou preparar uma proposta personalizada para seu caso.', 'ativo', 'proposta');

-- 5️⃣ INSERIR INTERAÇÕES DE LEADS
INSERT INTO lead_interactions (lead_id, tipo_interacao, canal, conteudo, responsavel)
SELECT
  id,
  CASE (random() * 3)::int
    WHEN 0 THEN 'ligacao'
    WHEN 1 THEN 'email'
    ELSE 'whatsapp'
  END,
  CASE (random() * 3)::int
    WHEN 0 THEN 'telefone'
    WHEN 1 THEN 'email'
    ELSE 'whatsapp'
  END,
  'Contato inicial com o lead. Cliente demonstrou interesse em contratar os serviços.',
  responsavel
FROM leads
LIMIT 8;

-- 6️⃣ INSERIR EXECUÇÕES DE AGENTES (para Mission Control)
INSERT INTO agent_executions (execution_id, lead_id, status, current_agent, agents_involved, started_at, total_tokens, estimated_cost_usd)
SELECT
  'exec_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8),
  id,
  CASE (random() * 4)::int
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'processing'
    WHEN 2 THEN 'completed'
    ELSE 'failed'
  END,
  'QualificadorAgent',
  ARRAY['CoordinatorAgent', 'QualificadorAgent', 'LegalAgent'],
  NOW() - (random() * INTERVAL '24 hours'),
  (1000 + random() * 5000)::int,
  (0.01 + random() * 0.5)::numeric(10,4)
FROM leads
LIMIT 10;

-- 7️⃣ INSERIR LOGS DE IA
INSERT INTO agent_ai_logs (agent_name, lead_id, model, prompt_tokens, completion_tokens, total_tokens, result_preview, status, latency_ms)
SELECT
  'QualificadorAgent',
  id,
  'gpt-4-turbo-preview',
  (500 + random() * 1000)::int,
  (200 + random() * 500)::int,
  (700 + random() * 1500)::int,
  'Lead qualificado com sucesso. Área: ' || area_juridica || '. Urgência: média. Documentos: pendentes.',
  'completed',
  (800 + random() * 2000)::int
FROM leads
LIMIT 15;

-- 8️⃣ VERIFICAR DADOS INSERIDOS
SELECT 'LEADS' as tabela, COUNT(*)::text as total FROM leads
UNION ALL
SELECT 'AGENDAMENTOS', COUNT(*)::text FROM agendamentos
UNION ALL
SELECT 'CONTRATOS', COUNT(*)::text FROM contratos
UNION ALL
SELECT 'AGENTES_IA', COUNT(*)::text FROM agentes_ia
UNION ALL
SELECT 'INTERAÇÕES', COUNT(*)::text FROM lead_interactions
UNION ALL
SELECT 'EXECUÇÕES', COUNT(*)::text FROM agent_executions
UNION ALL
SELECT 'LOGS_IA', COUNT(*)::text FROM agent_ai_logs;

-- ========================================
-- ✅ SCRIPT CONCLUÍDO
-- Acesse http://localhost:8080 para ver os dados!
-- ========================================

-- ========================================
-- POPULAR JURIFY - SQL CORRIGIDO
-- ========================================

-- 1️⃣ INSERIR LEADS (COLUNAS CORRETAS)
INSERT INTO leads (nome, email, telefone, area_juridica, origem, responsavel, status, valor_causa, observacoes) VALUES
('João Silva Santos', 'joao.silva@email.com', '11987654321', 'trabalhista', 'whatsapp', 'Dr. Roberto Lima', 'novo_lead', 15000.00, 'Cliente interessado em ação trabalhista'),
('Maria Oliveira Costa', 'maria.oliveira@email.com', '11976543210', 'direito_civil', 'site', 'Dra. Fernanda Souza', 'qualificado', 50000.00, 'Ação de indenização por danos morais'),
('Pedro Henrique Alves', 'pedro.alves@email.com', '11965432109', 'direito_penal', 'indicacao', 'Dr. Marcos Pereira', 'em_proposta', 30000.00, 'Defesa criminal'),
('Ana Carolina Mendes', 'ana.mendes@email.com', '11954321098', 'previdenciario', 'whatsapp', 'Dra. Juliana Castro', 'contratado', 8000.00, 'Aposentadoria por invalidez'),
('Carlos Eduardo Souza', 'carlos.souza@email.com', '11943210987', 'direito_consumidor', 'site', 'Dr. Rafael Torres', 'em_atendimento', 5000.00, 'Produto defeituoso'),
('Juliana Fernandes', 'juliana.fernandes@email.com', '11932109876', 'trabalhista', 'whatsapp', 'Dr. Roberto Lima', 'lead_perdido', 12000.00, 'Desistiu'),
('Ricardo Martins', 'ricardo.martins@email.com', '11921098765', 'direito_civil', 'indicacao', 'Dra. Fernanda Souza', 'novo_lead', 25000.00, 'Ação de despejo'),
('Beatriz Lima', 'beatriz.lima@email.com', '11910987654', 'direito_familia', 'site', 'Dra. Juliana Castro', 'qualificado', 10000.00, 'Divórcio'),
('Fernando Costa', 'fernando.costa@email.com', '11909876543', 'trabalhista', 'whatsapp', 'Dr. Roberto Lima', 'em_proposta', 18000.00, 'Horas extras'),
('Patricia Santos', 'patricia.santos@email.com', '11898765432', 'direito_consumidor', 'site', 'Dr. Rafael Torres', 'novo_lead', 3500.00, 'Cobrança indevida');

-- 2️⃣ INSERIR AGENTES IA
INSERT INTO agentes_ia (nome, area_juridica, objetivo, descricao_funcao, prompt_base, script_saudacao, status, tipo_agente) VALUES
('Qualificador Trabalhista', 'trabalhista', 'Qualificar leads trabalhistas', 'Identifica tipo de caso', 'Você é especialista em direito do trabalho', 'Olá! Sou especialista em trabalhista', 'ativo', 'qualificacao'),
('Qualificador Cível', 'direito_civil', 'Qualificar leads cíveis', 'Identifica ações cíveis', 'Você é especialista em direito civil', 'Olá! Sou especialista em cível', 'ativo', 'qualificacao'),
('Qualificador Criminal', 'direito_penal', 'Qualificar leads criminais', 'Identifica crimes', 'Você é especialista em direito penal', 'Olá! Sou especialista em criminal', 'ativo', 'qualificacao'),
('Agente Follow-up', 'geral', 'Follow-up automático', 'Acompanha leads', 'Você faz follow-up profissional', 'Estou entrando em contato', 'ativo', 'followup'),
('Agente Propostas', 'geral', 'Gera propostas', 'Cria propostas personalizadas', 'Você cria propostas comerciais', 'Vou preparar uma proposta', 'ativo', 'proposta');

-- 3️⃣ INSERIR AGENDAMENTOS
INSERT INTO agendamentos (lead_id, data_hora, area_juridica, responsavel, status, observacoes)
SELECT
  id,
  NOW() + INTERVAL '1 day',
  area_juridica,
  responsavel,
  'agendado',
  'Primeira consulta'
FROM leads
WHERE status IN ('qualificado', 'em_proposta', 'contratado')
LIMIT 5;

-- 4️⃣ INSERIR CONTRATOS
INSERT INTO contratos (lead_id, titulo, valor, status, area_juridica, responsavel, data_inicio)
SELECT
  id,
  'Contrato - ' || nome,
  valor_causa,
  'ativo',
  area_juridica,
  responsavel,
  NOW()
FROM leads
WHERE status = 'contratado'
LIMIT 3;

-- 5️⃣ VERIFICAR
SELECT 'LEADS' as tabela, COUNT(*)::text as total FROM leads
UNION ALL
SELECT 'AGENDAMENTOS', COUNT(*)::text FROM agendamentos
UNION ALL
SELECT 'CONTRATOS', COUNT(*)::text FROM contratos
UNION ALL
SELECT 'AGENTES_IA', COUNT(*)::text FROM agentes_ia;

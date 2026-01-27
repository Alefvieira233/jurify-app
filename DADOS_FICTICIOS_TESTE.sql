-- =========================================================================
-- 🚀 JURIFY - DADOS FICTÍCIOS PARA TESTE
-- =========================================================================
-- Script completo para popular o banco com dados de demonstração
-- Execute este script no SQL Editor do Supabase
-- =========================================================================

-- =========================================================================
-- 1. LIMPAR DADOS EXISTENTES (CUIDADO EM PRODUÇÃO!)
-- =========================================================================

-- Desabilitar temporariamente os triggers para evitar problemas
SET session_replication_role = 'replica';

-- Limpar tabelas na ordem correta (respeitar foreign keys)
DELETE FROM whatsapp_messages;
DELETE FROM whatsapp_conversations;
DELETE FROM agent_ai_logs;
DELETE FROM agent_executions;
DELETE FROM leads WHERE email LIKE '%@teste.jurify.com';

-- Reabilitar triggers
SET session_replication_role = 'origin';

-- =========================================================================
-- 2. LEADS FICTÍCIOS (20 leads variados)
-- =========================================================================

INSERT INTO public.leads (
  id,
  nome_completo,
  telefone,
  email,
  area_juridica,
  origem,
  valor_causa,
  responsavel,
  status,
  observacoes,
  created_at,
  updated_at
) VALUES
-- Novos Leads (5)
('11111111-1111-1111-1111-111111111111', 'Maria Silva Santos', '(11) 98765-4321', 'maria.silva@teste.jurify.com', 'Direito Trabalhista', 'WhatsApp', 35000.00, 'IA Jurídica', 'novo_lead', 'Cliente procurou via WhatsApp às 14h. Rescisão indevida.', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('11111111-1111-1111-1111-111111111112', 'João Pedro Oliveira', '(21) 97654-3210', 'joao.pedro@teste.jurify.com', 'Direito de Família', 'Facebook Ads', 18000.00, 'IA Jurídica', 'novo_lead', 'Divórcio consensual com partilha de bens.', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
('11111111-1111-1111-1111-111111111113', 'Ana Carolina Costa', '(11) 96543-2109', 'ana.costa@teste.jurify.com', 'Direito Previdenciário', 'Google Ads', 42000.00, 'IA Jurídica', 'novo_lead', 'Aposentadoria por invalidez negada pelo INSS.', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
('11111111-1111-1111-1111-111111111114', 'Carlos Eduardo Mendes', '(31) 95432-1098', 'carlos.mendes@teste.jurify.com', 'Direito Civil', 'Instagram', 28000.00, 'IA Jurídica', 'novo_lead', 'Problema com contrato de compra e venda.', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),
('11111111-1111-1111-1111-111111111115', 'Fernanda Lima Souza', '(85) 94321-0987', 'fernanda.lima@teste.jurify.com', 'Direito do Consumidor', 'WhatsApp', 8500.00, 'IA Jurídica', 'novo_lead', 'Produto com defeito e loja se recusando a trocar.', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes'),

-- Em Qualificação (4)
('22222222-2222-2222-2222-222222222221', 'Roberto Santos Jr', '(11) 93210-9876', 'roberto.santos@teste.jurify.com', 'Direito Trabalhista', 'Site Jurify', 52000.00, 'Dr. Silva', 'em_qualificacao', 'Acidente de trabalho. Aguardando documentos médicos.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 hours'),
('22222222-2222-2222-2222-222222222222', 'Patricia Almeida', '(21) 92109-8765', 'patricia.almeida@teste.jurify.com', 'Direito de Família', 'Indicação', 25000.00, 'Dra. Oliveira', 'em_qualificacao', 'Pensão alimentícia. Valores em discussão.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 hours'),
('22222222-2222-2222-2222-222222222223', 'Lucas Fernandes', '(11) 91098-7654', 'lucas.fernandes@teste.jurify.com', 'Direito Imobiliário', 'Google Ads', 120000.00, 'Dr. Silva', 'em_qualificacao', 'Despejo por falta de pagamento. Cliente é o locador.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),
('22222222-2222-2222-2222-222222222224', 'Juliana Rodrigues', '(31) 90987-6543', 'juliana.rodrigues@teste.jurify.com', 'Direito Previdenciário', 'Facebook Ads', 38000.00, 'Dra. Oliveira', 'em_qualificacao', 'Revisão de benefício. Análise em andamento.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 hours'),

-- Proposta Enviada (3)
('33333333-3333-3333-3333-333333333331', 'Marcos Paulo Silva', '(85) 89876-5432', 'marcos.paulo@teste.jurify.com', 'Direito Trabalhista', 'Instagram', 45000.00, 'Dr. Silva', 'proposta_enviada', 'Proposta de honorários enviada. Aguardando resposta.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
('33333333-3333-3333-3333-333333333332', 'Camila Santos', '(11) 88765-4321', 'camila.santos@teste.jurify.com', 'Direito Civil', 'WhatsApp', 32000.00, 'Dra. Oliveira', 'proposta_enviada', 'Ação de indenização. Proposta com 30% de êxito.', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'),
('33333333-3333-3333-3333-333333333333', 'Rafael Oliveira', '(21) 87654-3210', 'rafael.oliveira@teste.jurify.com', 'Direito do Consumidor', 'Site Jurify', 15000.00, 'Dr. Silva', 'proposta_enviada', 'Caso de voo cancelado. Proposta enviada ontem.', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'),

-- Contrato Assinado (4)
('44444444-4444-4444-4444-444444444441', 'Beatriz Costa', '(11) 87000-2109', 'beatriz.costa@teste.jurify.com', 'Direito de Família', 'Indicação', 68000.00, 'Dra. Oliveira', 'contrato_assinado', 'Divórcio litigioso. Contrato assinado digitalmente.', NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days'),
('44444444-4444-4444-4444-444444444442', 'Thiago Mendes', '(31) 86000-1098', 'thiago.mendes@teste.jurify.com', 'Direito Trabalhista', 'Google Ads', 58000.00, 'Dr. Silva', 'contrato_assinado', 'Horas extras não pagas. Documentação completa.', NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days'),
('44444444-4444-4444-4444-444444444443', 'Renata Ferreira', '(85) 85000-0987', 'renata.ferreira@teste.jurify.com', 'Direito Civil', 'Facebook Ads', 95000.00, 'Dra. Oliveira', 'contrato_assinado', 'Cobrança de dívida empresarial. Alto valor.', NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),
('44444444-4444-4444-4444-444444444444', 'Diego Santos', '(21) 84000-9876', 'diego.santos@teste.jurify.com', 'Direito Previdenciário', 'WhatsApp', 41000.00, 'Dr. Silva', 'contrato_assinado', 'Aposentadoria especial. Contrato firmado.', NOW() - INTERVAL '9 days', NOW() - INTERVAL '6 days'),

-- Em Atendimento (2)
('55555555-5555-5555-5555-555555555551', 'Gabriela Lima', '(11) 83000-8765', 'gabriela.lima@teste.jurify.com', 'Direito Trabalhista', 'Instagram', 37000.00, 'Dr. Silva', 'em_atendimento', 'Processo em andamento. Audiência marcada para semana que vem.', NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day'),
('55555555-5555-5555-5555-555555555552', 'André Souza', '(31) 82000-7654', 'andre.souza@teste.jurify.com', 'Direito de Família', 'Site Jurify', 22000.00, 'Dra. Oliveira', 'em_atendimento', 'Guarda compartilhada. Negociação em curso.', NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days'),

-- Leads Perdidos (2)
('66666666-6666-6666-6666-666666666661', 'Paulo Henrique', '(85) 81000-6543', 'paulo.henrique@teste.jurify.com', 'Direito Civil', 'Google Ads', 19000.00, 'IA Jurídica', 'lead_perdido', 'Cliente optou por outro escritório. Preço foi fator decisivo.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
('66666666-6666-6666-6666-666666666662', 'Larissa Martins', '(21) 80000-5432', 'larissa.martins@teste.jurify.com', 'Direito Trabalhista', 'Facebook Ads', 31000.00, 'Dr. Silva', 'lead_perdido', 'Sem resposta após 3 tentativas de contato.', NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days');

-- =========================================================================
-- 3. CONVERSAS DO WHATSAPP (10 conversas ativas)
-- =========================================================================

INSERT INTO whatsapp_conversations (
  id,
  lead_id,
  tenant_id,
  phone_number,
  contact_name,
  status,
  area_juridica,
  last_message,
  last_message_at,
  unread_count,
  ia_active,
  created_at,
  updated_at
) VALUES
-- Conversas Ativas
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', '11987654321', 'Maria Silva', 'ativo', 'Direito Trabalhista', 'Entendi. Vou enviar os documentos hoje mesmo!', NOW() - INTERVAL '5 minutes', 1, true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', '11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000001', '21976543210', 'João Pedro', 'ativo', 'Direito de Família', 'Qual o próximo passo?', NOW() - INTERVAL '15 minutes', 1, true, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '15 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', '11111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000001', '85943210987', 'Fernanda Lima', 'ativo', 'Direito do Consumidor', 'Obrigada! Vou aguardar o retorno.', NOW() - INTERVAL '30 minutes', 0, true, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes'),

-- Aguardando Resposta
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000001', '11932109876', 'Roberto Santos', 'aguardando', 'Direito Trabalhista', 'Conseguiu analisar meus documentos?', NOW() - INTERVAL '3 hours', 2, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 hours'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', '85898765432', 'Marcos Paulo', 'aguardando', 'Direito Trabalhista', 'Vi a proposta. Vou pensar com calma.', NOW() - INTERVAL '5 hours', 1, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 hours'),

-- Qualificados
('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444441', '00000000-0000-0000-0000-000000000001', '11870002109', 'Beatriz Costa', 'qualificado', 'Direito de Família', 'Perfeito! Já assinei o contrato.', NOW() - INTERVAL '7 days', 0, false, NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccd', '44444444-4444-4444-4444-444444444442', '00000000-0000-0000-0000-000000000001', '31860001098', 'Thiago Mendes', 'qualificado', 'Direito Trabalhista', 'Tudo certo. Quando começamos?', NOW() - INTERVAL '5 days', 0, false, NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days'),

-- Finalizados
('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666661', '00000000-0000-0000-0000-000000000001', '85810006543', 'Paulo Henrique', 'finalizado', 'Direito Civil', 'Obrigado, mas vou com outro advogado.', NOW() - INTERVAL '14 days', 0, false, NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
('dddddddd-dddd-dddd-dddd-ddddddddddde', '55555555-5555-5555-5555-555555555551', '00000000-0000-0000-0000-000000000001', '11830008765', 'Gabriela Lima', 'finalizado', 'Direito Trabalhista', 'Muito obrigada por tudo!', NOW() - INTERVAL '10 days', 0, false, NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days'),
('dddddddd-dddd-dddd-dddd-dddddddddddf', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '21921098765', 'Patricia Almeida', 'ativo', 'Direito de Família', 'Já recebi a documentação. Obrigada!', NOW() - INTERVAL '2 hours', 0, true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 hours');

-- =========================================================================
-- 4. MENSAGENS DO WHATSAPP (Histórico de conversas)
-- =========================================================================

-- Conversa com Maria Silva (Lead Novo - Ativo)
INSERT INTO whatsapp_messages (conversation_id, sender, content, message_type, timestamp) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lead', 'Olá, boa tarde! Preciso de ajuda com uma questão trabalhista.', 'text', NOW() - INTERVAL '2 hours'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ia', 'Olá Maria! Seja bem-vinda ao Jurify. Sou a assistente virtual e vou te ajudar. Pode me contar mais sobre seu caso?', 'text', NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lead', 'Fui demitida sem justa causa e a empresa não pagou minhas verbas rescisórias corretamente.', 'text', NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ia', 'Entendo. Isso é uma situação séria. Você tem quanto tempo de empresa e qual o valor aproximado que está faltando?', 'text', NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes 30 seconds'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lead', 'Trabalhei por 5 anos e falta pelo menos R$ 35.000 entre FGTS, aviso prévio e férias.', 'text', NOW() - INTERVAL '2 hours' + INTERVAL '4 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ia', 'Perfeito, Maria. Você tem um caso forte. Para dar continuidade, vou precisar de: 1) Carteira de trabalho 2) Rescisão 3) Extratos bancários. Pode enviar?', 'text', NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lead', 'Entendi. Vou enviar os documentos hoje mesmo!', 'text', NOW() - INTERVAL '5 minutes');

-- Conversa com João Pedro (Lead Novo - Família)
INSERT INTO whatsapp_messages (conversation_id, sender, content, message_type, timestamp) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'lead', 'Oi, preciso de um advogado para divórcio.', 'text', NOW() - INTERVAL '1 hour'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'ia', 'Olá João Pedro! Vou te ajudar com isso. É um divórcio consensual ou litigioso?', 'text', NOW() - INTERVAL '1 hour' + INTERVAL '20 seconds'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'lead', 'Consensual, já conversamos e estamos de acordo.', 'text', NOW() - INTERVAL '55 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'ia', 'Ótimo! Isso acelera muito o processo. Vocês têm filhos ou bens para partilha?', 'text', NOW() - INTERVAL '54 minutes 40 seconds'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'lead', 'Sim, temos 1 filho menor e um apartamento.', 'text', NOW() - INTERVAL '50 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'ia', 'Entendi. Vou encaminhar seu caso para nossa equipe especializada em Direito de Família. Eles vão entrar em contato em até 24h para detalhar valores e próximos passos. Ok?', 'text', NOW() - INTERVAL '49 minutes 30 seconds'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'lead', 'Qual o próximo passo?', 'text', NOW() - INTERVAL '15 minutes');

-- Conversa com Fernanda Lima (Lead Novo - Consumidor)
INSERT INTO whatsapp_messages (conversation_id, sender, content, message_type, timestamp) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'lead', 'Comprei um notebook com defeito e a loja não quer trocar!', 'text', NOW() - INTERVAL '45 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'ia', 'Olá Fernanda! Sinto muito por essa situação. Vamos resolver isso. Há quanto tempo você comprou e qual o defeito?', 'text', NOW() - INTERVAL '44 minutes 50 seconds'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'lead', 'Comprei há 2 meses. Ele não liga mais e está dentro da garantia.', 'text', NOW() - INTERVAL '43 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'ia', 'Você já acionou a loja e o fabricante? Tem nota fiscal?', 'text', NOW() - INTERVAL '42 minutes 45 seconds'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'lead', 'Sim, já fui na loja 3 vezes. Tenho nota fiscal e protocolo de atendimento.', 'text', NOW() - INTERVAL '40 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'ia', 'Perfeito! Com esses documentos, você tem direito à troca ou devolução do valor. Posso solicitar que um advogado especialista entre em contato para te orientar sobre os próximos passos?', 'text', NOW() - INTERVAL '39 minutes 30 seconds'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'lead', 'Obrigada! Vou aguardar o retorno.', 'text', NOW() - INTERVAL '30 minutes');

-- Conversa com Roberto Santos (Em Qualificação - Aguardando)
INSERT INTO whatsapp_messages (conversation_id, sender, content, message_type, timestamp) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'lead', 'Enviei os laudos médicos ontem. Conseguiu analisar?', 'text', NOW() - INTERVAL '3 hours'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ia', 'Oi Roberto! Recebi sim. O Dr. Silva está analisando sua documentação e deve retornar ainda hoje. Aguarde!', 'text', NOW() - INTERVAL '3 hours' + INTERVAL '15 seconds'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'lead', 'Conseguiu analisar meus documentos?', 'text', NOW() - INTERVAL '3 hours');

-- Conversa com Beatriz Costa (Contrato Assinado - Qualificado)
INSERT INTO whatsapp_messages (conversation_id, sender, content, message_type, timestamp) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'lead', 'Recebi o contrato por e-mail. Está tudo certo?', 'text', NOW() - INTERVAL '7 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'agent', 'Sim, Beatriz! Pode assinar digitalmente. Qualquer dúvida estou à disposição.', 'text', NOW() - INTERVAL '7 days' + INTERVAL '10 minutes'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'lead', 'Perfeito! Já assinei o contrato.', 'text', NOW() - INTERVAL '7 days' + INTERVAL '30 minutes');

-- =========================================================================
-- 5. EXECUÇÕES DE AGENTES (Mission Control)
-- =========================================================================

INSERT INTO agent_executions (
  id,
  execution_id,
  lead_id,
  tenant_id,
  status,
  current_agent,
  current_stage,
  started_at,
  completed_at,
  total_duration_ms,
  agents_involved,
  total_agents_used,
  total_prompt_tokens,
  total_completion_tokens,
  total_tokens,
  estimated_cost_usd,
  final_result,
  created_at,
  updated_at
) VALUES
-- Execução Completada 1 (Maria Silva)
('e0000000-0000-0000-0000-000000000001', 'exec_1733990400_abc12345', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'completed', 'QualificationAgent', 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes', 5234, ARRAY['RouterAgent', 'QualificationAgent', 'DocumentAgent'], 3, 2450, 890, 3340, 0.0845, '{"status": "qualified", "confidence": 0.92, "area": "Direito Trabalhista", "value": 35000}'::jsonb, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes'),

-- Execução Completada 2 (João Pedro)
('e0000000-0000-0000-0000-000000000002', 'exec_1733990500_def67890', '11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000001', 'completed', 'QualificationAgent', 'completed', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '55 minutes', 4567, ARRAY['RouterAgent', 'QualificationAgent'], 2, 1820, 654, 2474, 0.0621, '{"status": "qualified", "confidence": 0.88, "area": "Direito de Família", "value": 18000}'::jsonb, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '55 minutes'),

-- Execução em Processamento (Fernanda Lima)
('e0000000-0000-0000-0000-000000000003', 'exec_1733992300_ghi11111', '11111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000001', 'processing', 'DocumentAgent', 'analyzing_documents', NOW() - INTERVAL '30 minutes', NULL, NULL, ARRAY['RouterAgent', 'QualificationAgent', 'DocumentAgent'], 3, 1950, 720, 2670, 0.0678, NULL, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '5 minutes'),

-- Execução Pendente (Ana Carolina)
('e0000000-0000-0000-0000-000000000004', 'exec_1733993100_jkl22222', '11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000001', 'pending', 'RouterAgent', 'initializing', NOW() - INTERVAL '15 minutes', NULL, NULL, ARRAY['RouterAgent'], 1, 450, 0, 450, 0.0045, NULL, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),

-- Execução Completada 3 (Roberto Santos)
('e0000000-0000-0000-0000-000000000005', 'exec_1733900000_mno33333', '22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000001', 'completed', 'NegotiationAgent', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '8 minutes', 8123, ARRAY['RouterAgent', 'QualificationAgent', 'DocumentAgent', 'NegotiationAgent'], 4, 3200, 1150, 4350, 0.1103, '{"status": "qualified", "confidence": 0.95, "area": "Direito Trabalhista", "value": 52000}'::jsonb, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '8 minutes'),

-- Execução com Falha (Carlos Eduardo)
('e0000000-0000-0000-0000-000000000006', 'exec_1733993400_pqr44444', '11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000001', 'failed', 'DocumentAgent', 'error', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '8 minutes', 2100, ARRAY['RouterAgent', 'QualificationAgent', 'DocumentAgent'], 3, 1100, 234, 1334, 0.0341, NULL, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '8 minutes');

-- =========================================================================
-- 6. LOGS DE IA (Detalhes das execuções)
-- =========================================================================

-- Logs da Execução 1 (Maria Silva - Completada)
INSERT INTO agent_ai_logs (execution_id, agent_name, lead_id, tenant_id, model, status, prompt_tokens, completion_tokens, total_tokens, latency_ms, result_preview, created_at) VALUES
('e0000000-0000-0000-0000-000000000001', 'RouterAgent', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 850, 320, 1170, 1234, 'Roteado para QualificationAgent - Área: Direito Trabalhista', NOW() - INTERVAL '2 hours'),
('e0000000-0000-0000-0000-000000000001', 'QualificationAgent', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 1200, 450, 1650, 2345, 'Lead qualificado com 92% de confiança - Valor estimado: R$ 35.000', NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes'),
('e0000000-0000-0000-0000-000000000001', 'DocumentAgent', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 400, 120, 520, 987, 'Documentos necessários identificados e solicitados ao lead', NOW() - INTERVAL '2 hours' + INTERVAL '4 minutes');

-- Logs da Execução 2 (João Pedro - Completada)
INSERT INTO agent_ai_logs (execution_id, agent_name, lead_id, tenant_id, model, status, prompt_tokens, completion_tokens, total_tokens, latency_ms, result_preview, created_at) VALUES
('e0000000-0000-0000-0000-000000000002', 'RouterAgent', '11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 820, 310, 1130, 1156, 'Roteado para QualificationAgent - Área: Direito de Família', NOW() - INTERVAL '1 hour'),
('e0000000-0000-0000-0000-000000000002', 'QualificationAgent', '11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 1000, 344, 1344, 2234, 'Lead qualificado - Divórcio consensual - Confiança: 88%', NOW() - INTERVAL '1 hour' + INTERVAL '2 minutes');

-- Logs da Execução 3 (Fernanda Lima - Em Processamento)
INSERT INTO agent_ai_logs (execution_id, agent_name, lead_id, tenant_id, model, status, prompt_tokens, completion_tokens, total_tokens, latency_ms, result_preview, created_at) VALUES
('e0000000-0000-0000-0000-000000000003', 'RouterAgent', '11111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 750, 290, 1040, 1089, 'Roteado para QualificationAgent - Área: Direito do Consumidor', NOW() - INTERVAL '30 minutes'),
('e0000000-0000-0000-0000-000000000003', 'QualificationAgent', '11111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 900, 330, 1230, 1987, 'Lead qualificado - Defeito em produto - Valor: R$ 8.500', NOW() - INTERVAL '28 minutes'),
('e0000000-0000-0000-0000-000000000003', 'DocumentAgent', '11111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'processing', 300, 100, 400, NULL, 'Analisando nota fiscal e protocolos...', NOW() - INTERVAL '5 minutes');

-- Logs da Execução 4 (Ana Carolina - Pendente)
INSERT INTO agent_ai_logs (execution_id, agent_name, lead_id, tenant_id, model, status, prompt_tokens, completion_tokens, total_tokens, latency_ms, result_preview, created_at) VALUES
('e0000000-0000-0000-0000-000000000004', 'RouterAgent', '11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'pending', 450, 0, 450, NULL, 'Inicializando análise...', NOW() - INTERVAL '15 minutes');

-- Logs da Execução 5 (Roberto Santos - Completada com múltiplos agentes)
INSERT INTO agent_ai_logs (execution_id, agent_name, lead_id, tenant_id, model, status, prompt_tokens, completion_tokens, total_tokens, latency_ms, result_preview, created_at) VALUES
('e0000000-0000-0000-0000-000000000005', 'RouterAgent', '22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 900, 350, 1250, 1345, 'Roteado para QualificationAgent - Área: Direito Trabalhista (Acidente)', NOW() - INTERVAL '1 day'),
('e0000000-0000-0000-0000-000000000005', 'QualificationAgent', '22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 1300, 500, 1800, 2456, 'Lead altamente qualificado - Acidente de trabalho grave - 95% confiança', NOW() - INTERVAL '1 day' + INTERVAL '2 minutes'),
('e0000000-0000-0000-0000-000000000005', 'DocumentAgent', '22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 600, 200, 800, 1678, 'Laudos médicos recebidos e validados. Documentação completa.', NOW() - INTERVAL '1 day' + INTERVAL '5 minutes'),
('e0000000-0000-0000-0000-000000000005', 'NegotiationAgent', '22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 400, 100, 500, 1234, 'Proposta de honorários gerada: 30% sobre êxito', NOW() - INTERVAL '1 day' + INTERVAL '7 minutes');

-- Logs da Execução 6 (Carlos Eduardo - Falha)
INSERT INTO agent_ai_logs (execution_id, agent_name, lead_id, tenant_id, model, status, prompt_tokens, completion_tokens, total_tokens, latency_ms, result_preview, error_message, created_at) VALUES
('e0000000-0000-0000-0000-000000000006', 'RouterAgent', '11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 700, 180, 880, 1123, 'Roteado para QualificationAgent - Área: Direito Civil', NOW() - INTERVAL '10 minutes'),
('e0000000-0000-0000-0000-000000000006', 'QualificationAgent', '11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'completed', 300, 40, 340, 876, 'Lead em análise...', NOW() - INTERVAL '9 minutes'),
('e0000000-0000-0000-0000-000000000006', 'DocumentAgent', '11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000001', 'gpt-4-turbo-preview', 'failed', 100, 14, 114, 456, 'Erro ao processar documentos', 'API timeout - Falha ao acessar serviço de análise de documentos', NOW() - INTERVAL '8 minutes');

-- =========================================================================
-- PRONTO! Dados fictícios completos inseridos
-- =========================================================================

-- Verificação rápida
SELECT 'Leads inseridos:' as tabela, COUNT(*) as total FROM leads WHERE email LIKE '%@teste.jurify.com'
UNION ALL
SELECT 'Conversas WhatsApp:', COUNT(*) FROM whatsapp_conversations
UNION ALL
SELECT 'Mensagens WhatsApp:', COUNT(*) FROM whatsapp_messages
UNION ALL
SELECT 'Execuções de Agentes:', COUNT(*) FROM agent_executions
UNION ALL
SELECT 'Logs de IA:', COUNT(*) FROM agent_ai_logs;

-- ✅ DADOS FICTÍCIOS PRONTOS PARA TESTE!

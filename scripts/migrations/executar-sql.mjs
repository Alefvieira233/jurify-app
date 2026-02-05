import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv() {
  const envContent = readFileSync('.env', 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();
    if (key && value) env[key.trim()] = value;
  });
  return env;
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('🚀 POPULANDO BANCO DE DADOS...\n');

// Leads
const leads = [
  { nome: 'João Silva Santos', email: 'joao.silva@email.com', telefone: '11987654321', area_juridica: 'trabalhista', origem: 'whatsapp', responsavel: 'Dr. Roberto Lima', status: 'novo_lead', valor_causa: 15000.00, observacoes: 'Cliente interessado em ação trabalhista' },
  { nome: 'Maria Oliveira Costa', email: 'maria.oliveira@email.com', telefone: '11976543210', area_juridica: 'direito_civil', origem: 'site', responsavel: 'Dra. Fernanda Souza', status: 'qualificado', valor_causa: 50000.00, observacoes: 'Ação de indenização' },
  { nome: 'Pedro Henrique Alves', email: 'pedro.alves@email.com', telefone: '11965432109', area_juridica: 'direito_penal', origem: 'indicacao', responsavel: 'Dr. Marcos Pereira', status: 'em_proposta', valor_causa: 30000.00, observacoes: 'Defesa criminal' },
  { nome: 'Ana Carolina Mendes', email: 'ana.mendes@email.com', telefone: '11954321098', area_juridica: 'previdenciario', origem: 'whatsapp', responsavel: 'Dra. Juliana Castro', status: 'contratado', valor_causa: 8000.00, observacoes: 'Aposentadoria' },
  { nome: 'Carlos Eduardo Souza', email: 'carlos.souza@email.com', telefone: '11943210987', area_juridica: 'direito_consumidor', origem: 'site', responsavel: 'Dr. Rafael Torres', status: 'em_atendimento', valor_causa: 5000.00, observacoes: 'Produto defeituoso' },
];

async function popularBanco() {
  // 1. Inserir Leads
  console.log('📝 Inserindo leads...');
  const { data: leadsData, error: leadsError } = await supabase
    .from('leads')
    .insert(leads)
    .select();
  
  if (leadsError) {
    console.error('❌ Erro ao inserir leads:', leadsError.message);
    return;
  }
  console.log(`✅ ${leadsData.length} leads inseridos!\n`);
  
  // 2. Inserir Agentes IA
  console.log('🤖 Inserindo agentes IA...');
  const agentes = [
    { nome: 'Qualificador Trabalhista', area_juridica: 'trabalhista', objetivo: 'Qualificar leads', descricao_funcao: 'Identifica casos', prompt_base: 'Especialista trabalhista', script_saudacao: 'Olá!', status: 'ativo', tipo_agente: 'qualificacao' },
    { nome: 'Qualificador Cível', area_juridica: 'direito_civil', objetivo: 'Qualificar leads', descricao_funcao: 'Identifica casos', prompt_base: 'Especialista civil', script_saudacao: 'Olá!', status: 'ativo', tipo_agente: 'qualificacao' },
  ];
  
  const { data: agentesData, error: agentesError } = await supabase
    .from('agentes_ia')
    .insert(agentes)
    .select();
  
  if (agentesError) {
    console.error('❌ Erro ao inserir agentes:', agentesError.message);
  } else {
    console.log(`✅ ${agentesData.length} agentes inseridos!\n`);
  }
  
  // 3. Verificar totais
  console.log('📊 VERIFICANDO TOTAIS:\n');
  
  const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log(`Leads: ${leadsCount}`);
  
  const { count: agentesCount } = await supabase.from('agentes_ia').select('*', { count: 'exact', head: true });
  console.log(`Agentes IA: ${agentesCount}`);
  
  const { count: agendamentosCount } = await supabase.from('agendamentos').select('*', { count: 'exact', head: true });
  console.log(`Agendamentos: ${agendamentosCount}`);
  
  const { count: contratosCount } = await supabase.from('contratos').select('*', { count: 'exact', head: true });
  console.log(`Contratos: ${contratosCount}\n`);
  
  console.log('✅ BANCO POPULADO COM SUCESSO!');
  console.log('🌐 Recarregue http://localhost:8080\n');
}

popularBanco();

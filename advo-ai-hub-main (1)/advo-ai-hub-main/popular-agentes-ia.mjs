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

console.log('🤖 POPULANDO AGENTES IA - SCHEMA CORRETO!\n');

async function popularAgentes() {
  const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
  const tenantId = tenant?.id;

  const agentes = [
    {
      nome: 'Qualificador Trabalhista',
      tipo: 'qualificacao',
      descricao: 'Especialista em direito do trabalho - qualifica leads trabalhistas',
      area_juridica: 'trabalhista',
      objetivo: 'Qualificar e categorizar leads da área trabalhista',
      descricao_funcao: 'Identifica tipo de caso trabalhista, urgência e documentos necessários',
      prompt_base: 'Você é especialista em direito do trabalho. Analise o caso e qualifique.',
      script_saudacao: 'Olá! Sou especialista em direito trabalhista. Como posso ajudar?',
      modelo_ia: 'gpt-4',
      temperatura: 0.7,
      max_tokens: 2000,
      ativo: true,
      tenant_id: tenantId
    },
    {
      nome: 'Qualificador Cível',
      tipo: 'qualificacao',
      descricao: 'Especialista em direito civil - qualifica leads cíveis',
      area_juridica: 'direito_civil',
      objetivo: 'Qualificar leads da área cível',
      descricao_funcao: 'Identifica tipo de ação cível e complexidade',
      prompt_base: 'Você é especialista em direito civil. Analise e qualifique o caso.',
      script_saudacao: 'Olá! Sou especialista em direito civil. Vamos analisar seu caso.',
      modelo_ia: 'gpt-4',
      temperatura: 0.7,
      max_tokens: 2000,
      ativo: true,
      tenant_id: tenantId
    },
    {
      nome: 'Qualificador Criminal',
      tipo: 'qualificacao',
      descricao: 'Especialista em direito penal - qualifica leads criminais',
      area_juridica: 'direito_penal',
      objetivo: 'Qualificar leads da área criminal',
      descricao_funcao: 'Identifica tipo de crime e urgência',
      prompt_base: 'Você é especialista em direito penal. Analise a defesa necessária.',
      script_saudacao: 'Olá! Sou especialista em direito criminal. Vou te ajudar.',
      modelo_ia: 'gpt-4',
      temperatura: 0.7,
      max_tokens: 2000,
      ativo: true,
      tenant_id: tenantId
    },
    {
      nome: 'Agente Follow-up',
      tipo: 'followup',
      descricao: 'Faz follow-up automático com leads em aberto',
      area_juridica: 'geral',
      objetivo: 'Realizar follow-up automático',
      descricao_funcao: 'Mantém contato com leads em aberto',
      prompt_base: 'Você é responsável pelo acompanhamento de leads.',
      script_saudacao: 'Olá! Estou entrando em contato para acompanhamento.',
      modelo_ia: 'gpt-4',
      temperatura: 0.8,
      max_tokens: 1500,
      ativo: true,
      tenant_id: tenantId
    },
    {
      nome: 'Gerador de Propostas',
      tipo: 'proposta',
      descricao: 'Cria propostas comerciais personalizadas',
      area_juridica: 'geral',
      objetivo: 'Gerar propostas comerciais',
      descricao_funcao: 'Cria propostas personalizadas',
      prompt_base: 'Você cria propostas comerciais jurídicas.',
      script_saudacao: 'Vou preparar uma proposta para seu caso.',
      modelo_ia: 'gpt-4',
      temperatura: 0.6,
      max_tokens: 3000,
      ativo: true,
      tenant_id: tenantId
    }
  ];

  console.log(`Inserindo ${agentes.length} agentes IA...`);

  const { data, error } = await supabase
    .from('agentes_ia')
    .insert(agentes)
    .select();

  if (error) {
    console.error(`❌ Erro: ${error.message}`);
    console.error(error);
  } else {
    console.log(`✅ ${data.length} agentes IA inseridos com sucesso!`);

    console.log('\n📋 Agentes criados:');
    data.forEach((agente, i) => {
      console.log(`   ${i + 1}. ${agente.nome} (${agente.tipo})`);
    });
  }

  // Verificar total
  const { count } = await supabase.from('agentes_ia').select('*', { count: 'exact', head: true });
  console.log(`\n📊 Total de agentes IA no banco: ${count}\n`);
}

popularAgentes();

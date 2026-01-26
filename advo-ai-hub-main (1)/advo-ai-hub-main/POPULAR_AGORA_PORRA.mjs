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

console.log('🔥 POPULANDO O BANCO AGORA - SEM ENROLAÇÃO!\n');

const LEADS = [
  {
    nome: 'João Silva Santos',
    email: 'joao.silva@email.com',
    telefone: '11987654321',
    area_juridica: 'trabalhista',
    descricao: 'Cliente com questão de rescisão trabalhista indevida. Demissão sem justa causa.',
    origem: 'whatsapp',
    status: 'novo_lead',
    valor_causa: 15000.00,
    prioridade: 'alta'
  },
  {
    nome: 'Maria Oliveira Costa',
    email: 'maria.oliveira@email.com',
    telefone: '11976543210',
    area_juridica: 'direito_civil',
    descricao: 'Ação de indenização por danos morais. Acidente de trânsito.',
    origem: 'site',
    status: 'qualificado',
    valor_causa: 50000.00,
    prioridade: 'alta'
  },
  {
    nome: 'Pedro Henrique Alves',
    email: 'pedro.alves@email.com',
    telefone: '11965432109',
    area_juridica: 'direito_penal',
    descricao: 'Defesa criminal - furto qualificado. Precisa de advogado urgente.',
    origem: 'indicacao',
    status: 'em_proposta',
    valor_causa: 30000.00,
    prioridade: 'urgente'
  },
  {
    nome: 'Ana Carolina Mendes',
    email: 'ana.mendes@email.com',
    telefone: '11954321098',
    area_juridica: 'previdenciario',
    descricao: 'Aposentadoria por invalidez negada pelo INSS. Perícia médica pendente.',
    origem: 'whatsapp',
    status: 'contratado',
    valor_causa: 8000.00,
    prioridade: 'media'
  },
  {
    nome: 'Carlos Eduardo Souza',
    email: 'carlos.souza@email.com',
    telefone: '11943210987',
    area_juridica: 'direito_consumidor',
    descricao: 'Produto defeituoso não substituído pela loja. CDC.',
    origem: 'site',
    status: 'em_atendimento',
    valor_causa: 5000.00,
    prioridade: 'baixa'
  },
  {
    nome: 'Juliana Fernandes',
    email: 'juliana.fernandes@email.com',
    telefone: '11932109876',
    area_juridica: 'trabalhista',
    descricao: 'Horas extras não pagas. Trabalhava sem registro.',
    origem: 'whatsapp',
    status: 'lead_perdido',
    valor_causa: 12000.00,
    prioridade: 'baixa'
  },
  {
    nome: 'Ricardo Martins',
    email: 'ricardo.martins@email.com',
    telefone: '11921098765',
    area_juridica: 'direito_civil',
    descricao: 'Ação de despejo por falta de pagamento. Inquilino inadimplente.',
    origem: 'indicacao',
    status: 'novo_lead',
    valor_causa: 25000.00,
    prioridade: 'media'
  },
  {
    nome: 'Beatriz Lima',
    email: 'beatriz.lima@email.com',
    telefone: '11910987654',
    area_juridica: 'direito_familia',
    descricao: 'Divórcio consensual. Sem filhos menores.',
    origem: 'site',
    status: 'qualificado',
    valor_causa: 10000.00,
    prioridade: 'media'
  },
  {
    nome: 'Fernando Costa',
    email: 'fernando.costa@email.com',
    telefone: '11909876543',
    area_juridica: 'trabalhista',
    descricao: 'Acidente de trabalho. Busca indenização e auxílio.',
    origem: 'whatsapp',
    status: 'em_proposta',
    valor_causa: 18000.00,
    prioridade: 'alta'
  },
  {
    nome: 'Patricia Santos',
    email: 'patricia.santos@email.com',
    telefone: '11898765432',
    area_juridica: 'direito_consumidor',
    descricao: 'Cobrança indevida no cartão de crédito. Banco não resolve.',
    origem: 'site',
    status: 'novo_lead',
    valor_causa: 3500.00,
    prioridade: 'baixa'
  }
];

const AGENTES_IA = [
  {
    nome: 'Qualificador Trabalhista',
    area_juridica: 'trabalhista',
    objetivo: 'Qualificar e categorizar leads da área trabalhista',
    descricao_funcao: 'Identifica tipo de caso trabalhista, urgência e documentos necessários',
    prompt_base: 'Você é especialista em direito do trabalho. Analise o caso e qualifique.',
    script_saudacao: 'Olá! Sou especialista em direito trabalhista. Como posso ajudar?',
    status: 'ativo',
    tipo_agente: 'qualificacao'
  },
  {
    nome: 'Qualificador Cível',
    area_juridica: 'direito_civil',
    objetivo: 'Qualificar leads da área cível',
    descricao_funcao: 'Identifica tipo de ação cível e complexidade',
    prompt_base: 'Você é especialista em direito civil. Analise e qualifique o caso.',
    script_saudacao: 'Olá! Sou especialista em direito civil. Vamos analisar seu caso.',
    status: 'ativo',
    tipo_agente: 'qualificacao'
  },
  {
    nome: 'Qualificador Criminal',
    area_juridica: 'direito_penal',
    objetivo: 'Qualificar leads da área criminal',
    descricao_funcao: 'Identifica tipo de crime e urgência',
    prompt_base: 'Você é especialista em direito penal. Analise a defesa necessária.',
    script_saudacao: 'Olá! Sou especialista em direito criminal. Vou te ajudar.',
    status: 'ativo',
    tipo_agente: 'qualificacao'
  },
  {
    nome: 'Agente Follow-up',
    area_juridica: 'geral',
    objetivo: 'Realizar follow-up automático',
    descricao_funcao: 'Mantém contato com leads em aberto',
    prompt_base: 'Você é responsável pelo acompanhamento de leads.',
    script_saudacao: 'Olá! Estou entrando em contato para acompanhamento.',
    status: 'ativo',
    tipo_agente: 'followup'
  },
  {
    nome: 'Agente de Propostas',
    area_juridica: 'geral',
    objetivo: 'Gerar propostas comerciais',
    descricao_funcao: 'Cria propostas personalizadas',
    prompt_base: 'Você cria propostas comerciais jurídicas.',
    script_saudacao: 'Vou preparar uma proposta para seu caso.',
    status: 'ativo',
    tipo_agente: 'proposta'
  }
];

async function popularTudo() {
  try {
    // 1. LEADS
    console.log('📝 Inserindo 10 leads...');
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .insert(LEADS)
      .select();

    if (leadsError) {
      console.error('❌ ERRO NOS LEADS:', leadsError.message);
      throw leadsError;
    }

    console.log(`✅ ${leadsData.length} LEADS INSERIDOS!\n`);

    // 2. AGENTES IA
    console.log('🤖 Inserindo 5 agentes IA...');
    const { data: agentesData, error: agentesError } = await supabase
      .from('agentes_ia')
      .insert(AGENTES_IA)
      .select();

    if (agentesError) {
      console.error('❌ ERRO NOS AGENTES:', agentesError.message);
      // Continua mesmo com erro nos agentes
    } else {
      console.log(`✅ ${agentesData.length} AGENTES INSERIDOS!\n`);
    }

    // 3. AGENDAMENTOS (para leads qualificados)
    console.log('📅 Criando agendamentos...');
    const leadsQualificados = leadsData.filter(l =>
      l.status === 'qualificado' || l.status === 'em_proposta' || l.status === 'contratado'
    );

    const agendamentos = leadsQualificados.slice(0, 5).map((lead, i) => ({
      lead_id: lead.id,
      data_hora: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
      area_juridica: lead.area_juridica,
      responsavel: 'Dr. Roberto Silva',
      status: 'agendado',
      observacoes: 'Primeira consulta agendada'
    }));

    const { data: agendamentosData, error: agendamentosError } = await supabase
      .from('agendamentos')
      .insert(agendamentos)
      .select();

    if (agendamentosError) {
      console.error('⚠️ Erro nos agendamentos:', agendamentosError.message);
    } else {
      console.log(`✅ ${agendamentosData.length} AGENDAMENTOS CRIADOS!\n`);
    }

    // 4. CONTRATOS (para leads contratados)
    console.log('📄 Criando contratos...');
    const leadsContratados = leadsData.filter(l => l.status === 'contratado');

    const contratos = leadsContratados.map(lead => ({
      lead_id: lead.id,
      titulo: `Contrato - ${lead.nome}`,
      valor: lead.valor_causa || 5000.00,
      status: 'ativo',
      area_juridica: lead.area_juridica,
      responsavel: 'Dr. Roberto Silva',
      data_inicio: new Date().toISOString()
    }));

    if (contratos.length > 0) {
      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos')
        .insert(contratos)
        .select();

      if (contratosError) {
        console.error('⚠️ Erro nos contratos:', contratosError.message);
      } else {
        console.log(`✅ ${contratosData.length} CONTRATOS CRIADOS!\n`);
      }
    }

    // VERIFICAÇÃO FINAL
    console.log('═'.repeat(60));
    console.log('📊 VERIFICAÇÃO FINAL:\n');

    const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    const { count: agentesCount } = await supabase.from('agentes_ia').select('*', { count: 'exact', head: true });
    const { count: agendamentosCount } = await supabase.from('agendamentos').select('*', { count: 'exact', head: true });
    const { count: contratosCount } = await supabase.from('contratos').select('*', { count: 'exact', head: true });

    console.log(`Leads: ${leadsCount}`);
    console.log(`Agentes IA: ${agentesCount}`);
    console.log(`Agendamentos: ${agendamentosCount}`);
    console.log(`Contratos: ${contratosCount}`);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ BANCO POPULADO COM SUCESSO!');
    console.log('🌐 RECARREGUE: http://localhost:8080');
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message);
    process.exit(1);
  }
}

popularTudo();

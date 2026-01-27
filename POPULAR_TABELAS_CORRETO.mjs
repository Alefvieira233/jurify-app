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

console.log('🔥 POPULANDO TABELAS COM SCHEMA CORRETO!\n');
console.log('═'.repeat(60));

async function popularTudo() {
  try {
    // Pegar tenant_id
    const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
    const tenantId = tenant?.id;

    if (!tenantId) {
      console.error('❌ Nenhum tenant encontrado!');
      return;
    }

    console.log(`✅ Usando tenant_id: ${tenantId}\n`);

    // Pegar alguns leads para vincular
    const { data: leads } = await supabase.from('leads').select('id').limit(5);
    const leadIds = leads?.map(l => l.id) || [];

    // 1. AGENTES_IA (com campo 'tipo' obrigatório)
    console.log('1️⃣ Inserindo AGENTES_IA...');

    const agentesIA = [
      {
        nome: 'Qualificador Trabalhista',
        descricao: 'Especialista em direito do trabalho',
        tipo: 'qualificacao',
        tenant_id: tenantId,
        modelo: 'gpt-4',
        temperatura: 0.7,
        max_tokens: 2000,
        ativo: true
      },
      {
        nome: 'Qualificador Cível',
        descricao: 'Especialista em direito civil',
        tipo: 'qualificacao',
        tenant_id: tenantId,
        modelo: 'gpt-4',
        temperatura: 0.7,
        max_tokens: 2000,
        ativo: true
      },
      {
        nome: 'Qualificador Criminal',
        descricao: 'Especialista em direito penal',
        tipo: 'qualificacao',
        tenant_id: tenantId,
        modelo: 'gpt-4',
        temperatura: 0.7,
        max_tokens: 2000,
        ativo: true
      },
      {
        nome: 'Agente Follow-up',
        descricao: 'Faz follow-up automático com leads',
        tipo: 'followup',
        tenant_id: tenantId,
        modelo: 'gpt-4',
        temperatura: 0.7,
        max_tokens: 2000,
        ativo: true
      },
      {
        nome: 'Gerador de Propostas',
        descricao: 'Cria propostas comerciais',
        tipo: 'proposta',
        tenant_id: tenantId,
        modelo: 'gpt-4',
        temperatura: 0.7,
        max_tokens: 2000,
        ativo: true
      }
    ];

    const { data: agentesData, error: agentesError } = await supabase
      .from('agentes_ia')
      .insert(agentesIA)
      .select();

    if (agentesError) {
      console.error(`❌ Erro: ${agentesError.message}`);
    } else {
      console.log(`✅ ${agentesData.length} agentes IA inseridos!\n`);
    }

    // 2. AGENDAMENTOS
    console.log('2️⃣ Inserindo AGENDAMENTOS...');

    const hoje = new Date();
    const agendamentos = [
      {
        titulo: 'Consulta Inicial - Caso Trabalhista',
        descricao: 'Primeira consulta com cliente sobre rescisão indevida',
        data_hora: new Date(hoje.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        duracao: 60,
        tipo: 'consulta',
        status: 'agendado',
        lead_id: leadIds[0] || null,
        tenant_id: tenantId,
        local: 'Escritório - Sala 1'
      },
      {
        titulo: 'Audiência Trabalhista',
        descricao: 'Audiência de conciliação no TRT',
        data_hora: new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        duracao: 120,
        tipo: 'audiencia',
        status: 'agendado',
        lead_id: leadIds[1] || null,
        tenant_id: tenantId,
        local: 'TRT - 2ª Vara'
      },
      {
        titulo: 'Reunião de Proposta',
        descricao: 'Apresentação de proposta para cliente civil',
        data_hora: new Date(hoje.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        duracao: 45,
        tipo: 'reuniao',
        status: 'agendado',
        lead_id: leadIds[2] || null,
        tenant_id: tenantId,
        link_videochamada: 'https://meet.google.com/abc-defg-hij'
      },
      {
        titulo: 'Consulta Online - Divórcio',
        descricao: 'Consulta online sobre processo de divórcio',
        data_hora: new Date(hoje.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        duracao: 60,
        tipo: 'consulta',
        status: 'agendado',
        lead_id: leadIds[3] || null,
        tenant_id: tenantId,
        link_videochamada: 'https://meet.google.com/xyz-abcd-efg'
      },
      {
        titulo: 'Prazo de Recurso',
        descricao: 'Data limite para entrada de recurso',
        data_hora: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        duracao: 0,
        tipo: 'prazo',
        status: 'agendado',
        tenant_id: tenantId
      }
    ];

    const { data: agendamentosData, error: agendamentosError } = await supabase
      .from('agendamentos')
      .insert(agendamentos)
      .select();

    if (agendamentosError) {
      console.error(`❌ Erro: ${agendamentosError.message}`);
    } else {
      console.log(`✅ ${agendamentosData.length} agendamentos inseridos!\n`);
    }

    // 3. CONTRATOS
    console.log('3️⃣ Inserindo CONTRATOS...');

    const contratos = [
      {
        numero: 'CTR-2025-001',
        titulo: 'Contrato de Prestação de Serviços Jurídicos - Trabalhista',
        descricao: 'Ação trabalhista de rescisão indevida',
        tipo: 'prestacao_servicos',
        area_juridica: 'trabalhista',
        status: 'ativo',
        valor: 15000.00,
        honorarios: 30,
        data_inicio: new Date().toISOString(),
        data_fim: new Date(hoje.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        tenant_id: tenantId
      },
      {
        numero: 'CTR-2025-002',
        titulo: 'Contrato de Prestação de Serviços Jurídicos - Cível',
        descricao: 'Ação de indenização por danos morais',
        tipo: 'prestacao_servicos',
        area_juridica: 'civil',
        status: 'ativo',
        valor: 50000.00,
        honorarios: 25,
        data_inicio: new Date().toISOString(),
        data_fim: new Date(hoje.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        tenant_id: tenantId
      },
      {
        numero: 'CTR-2025-003',
        titulo: 'Contrato de Prestação de Serviços Jurídicos - Previdenciário',
        descricao: 'Aposentadoria por invalidez',
        tipo: 'prestacao_servicos',
        area_juridica: 'previdenciario',
        status: 'ativo',
        valor: 8000.00,
        honorarios: 20,
        data_inicio: new Date().toISOString(),
        tenant_id: tenantId
      },
      {
        numero: 'CTR-2025-004',
        titulo: 'Contrato de Prestação de Serviços Jurídicos - Família',
        descricao: 'Processo de divórcio consensual',
        tipo: 'prestacao_servicos',
        area_juridica: 'familia',
        status: 'rascunho',
        valor: 10000.00,
        honorarios: 100,
        tenant_id: tenantId
      }
    ];

    const { data: contratosData, error: contratosError } = await supabase
      .from('contratos')
      .insert(contratos)
      .select();

    if (contratosError) {
      console.error(`❌ Erro: ${contratosError.message}`);
    } else {
      console.log(`✅ ${contratosData.length} contratos inseridos!\n`);
    }

    // VERIFICAÇÃO FINAL
    console.log('═'.repeat(60));
    console.log('📊 VERIFICAÇÃO FINAL:\n');

    const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    const { count: agentesCount } = await supabase.from('agentes_ia').select('*', { count: 'exact', head: true });
    const { count: agendamentosCount } = await supabase.from('agendamentos').select('*', { count: 'exact', head: true });
    const { count: contratosCount } = await supabase.from('contratos').select('*', { count: 'exact', head: true });

    console.log(`📋 Leads: ${leadsCount}`);
    console.log(`🤖 Agentes IA: ${agentesCount}`);
    console.log(`📅 Agendamentos: ${agendamentosCount}`);
    console.log(`📄 Contratos: ${contratosCount}`);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ BANCO TOTALMENTE POPULADO!');
    console.log('\n🌐 PRÓXIMOS PASSOS:');
    console.log('   1. Acesse http://localhost:8080');
    console.log('   2. Faça login com: admin@jurify.com.br');
    console.log('   3. Recarregue o Dashboard (Ctrl+Shift+R)');
    console.log('   4. TUDO DEVE ESTAR FUNCIONANDO AGORA!');
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

popularTudo();

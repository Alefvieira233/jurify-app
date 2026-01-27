#!/usr/bin/env node
/**
 * 🌱 Script simples para popular banco com dados de teste
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) env[key.trim()] = value;
    });
    return env;
  } catch (error) {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Credenciais Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('\n🌱 JURIFY - SEED DE DADOS DE TESTE\n');
console.log('=' .repeat(60));

async function seedData() {
  try {
    // 1. Leads
    console.log('\n📝 Inserindo leads...');

    const leads = [
      {
        name: 'João Silva',
        email: 'joao.silva@teste.com',
        phone: '+5511999998888',
        status: 'novo',
        area_juridica: 'trabalhista',
        origem: 'whatsapp'
      },
      {
        name: 'Maria Santos',
        email: 'maria.santos@teste.com',
        phone: '+5511988887777',
        status: 'qualificado',
        area_juridica: 'civel',
        origem: 'site'
      },
      {
        name: 'Pedro Oliveira',
        email: 'pedro.oliveira@teste.com',
        phone: '+5511977776666',
        status: 'proposta',
        area_juridica: 'criminal',
        origem: 'indicacao'
      },
      {
        name: 'Ana Costa',
        email: 'ana.costa@teste.com',
        phone: '+5511966665555',
        status: 'contrato',
        area_juridica: 'previdenciario',
        origem: 'whatsapp'
      },
      {
        name: 'Carlos Mendes',
        email: 'carlos.mendes@teste.com',
        phone: '+5511955554444',
        status: 'perdido',
        area_juridica: 'consumidor',
        origem: 'site'
      }
    ];

    const { data: insertedLeads, error: leadsError } = await supabase
      .from('leads')
      .insert(leads)
      .select();

    if (leadsError) {
      console.error('❌ Erro ao inserir leads:', leadsError.message);
      return;
    }

    console.log(`✅ ${insertedLeads.length} leads inseridos!`);

    // 2. Agendamentos
    console.log('\n📅 Inserindo agendamentos...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(10, 0, 0, 0);

    const agendamentos = [
      {
        lead_id: insertedLeads[0].id,
        data_hora: tomorrow.toISOString(),
        area_juridica: 'trabalhista',
        responsavel: 'Dr. Roberto Silva',
        status: 'agendado',
        observacoes: 'Primeira consulta'
      },
      {
        lead_id: insertedLeads[1].id,
        data_hora: nextWeek.toISOString(),
        area_juridica: 'civel',
        responsavel: 'Dra. Fernanda Lima',
        status: 'agendado',
        observacoes: 'Análise de documentos'
      }
    ];

    const { data: insertedAgendamentos, error: agendamentosError } = await supabase
      .from('agendamentos')
      .insert(agendamentos)
      .select();

    if (agendamentosError) {
      console.error('❌ Erro ao inserir agendamentos:', agendamentosError.message);
    } else {
      console.log(`✅ ${insertedAgendamentos.length} agendamentos inseridos!`);
    }

    // 3. Contratos
    console.log('\n📄 Inserindo contratos...');

    const contratos = [
      {
        lead_id: insertedLeads[3].id,
        titulo: 'Contrato de Prestação de Serviços Jurídicos - Ana Costa',
        valor: 5000.00,
        status: 'ativo',
        area_juridica: 'previdenciario',
        responsavel: 'Dr. Marcos Pereira'
      }
    ];

    const { data: insertedContratos, error: contratosError } = await supabase
      .from('contratos')
      .insert(contratos)
      .select();

    if (contratosError) {
      console.error('❌ Erro ao inserir contratos:', contratosError.message);
    } else {
      console.log(`✅ ${insertedContratos.length} contrato inserido!`);
    }

    // 4. Agentes IA
    console.log('\n🤖 Inserindo agentes IA...');

    const agentesIA = [
      {
        nome: 'Qualificador Trabalhista',
        area_juridica: 'trabalhista',
        objetivo: 'Qualificar leads da área trabalhista',
        descricao_funcao: 'Identifica casos de direito do trabalho',
        prompt_base: 'Você é um especialista em direito trabalhista...',
        script_saudacao: 'Olá! Sou especialista em direito trabalhista. Como posso ajudar?',
        status: 'ativo'
      },
      {
        nome: 'Qualificador Cível',
        area_juridica: 'civel',
        objetivo: 'Qualificar leads da área cível',
        descricao_funcao: 'Identifica casos de direito civil',
        prompt_base: 'Você é um especialista em direito civil...',
        script_saudacao: 'Olá! Sou especialista em direito civil. Como posso ajudar?',
        status: 'ativo'
      }
    ];

    const { data: insertedAgentes, error: agentesError } = await supabase
      .from('agentes_ia')
      .insert(agentesIA)
      .select();

    if (agentesError) {
      console.error('❌ Erro ao inserir agentes IA:', agentesError.message);
    } else {
      console.log(`✅ ${insertedAgentes.length} agentes IA inseridos!`);
    }

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO\n');

    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    console.log(`Leads: ${leadsCount}`);

    const { count: agendamentosCount } = await supabase
      .from('agendamentos')
      .select('*', { count: 'exact', head: true });
    console.log(`Agendamentos: ${agendamentosCount}`);

    const { count: contratosCount } = await supabase
      .from('contratos')
      .select('*', { count: 'exact', head: true });
    console.log(`Contratos: ${contratosCount}`);

    const { count: agentesCount } = await supabase
      .from('agentes_ia')
      .select('*', { count: 'exact', head: true });
    console.log(`Agentes IA: ${agentesCount}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ DADOS INSERIDOS COM SUCESSO!');
    console.log('🌐 Acesse http://localhost:8080 para visualizar\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

seedData();

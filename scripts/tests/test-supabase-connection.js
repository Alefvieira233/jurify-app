/**
 * 🧪 SCRIPT DE TESTE DE CONEXÃO SUPABASE
 *
 * Verifica:
 * 1. Conexão com Supabase
 * 2. Tabelas existentes
 * 3. Dados disponíveis
 * 4. Migrations aplicadas
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n🚀 JURIFY - TESTE DE CONEXÃO SUPABASE\n');
console.log('=' .repeat(60));

// Validar credenciais
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Credenciais do Supabase não encontradas no .env');
  console.log('\nVerifique se o .env contém:');
  console.log('  VITE_SUPABASE_URL=...');
  console.log('  VITE_SUPABASE_ANON_KEY=...\n');
  process.exit(1);
}

console.log(`✅ URL: ${SUPABASE_URL}`);
console.log(`✅ Anon Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
console.log('=' .repeat(60));

// Criar cliente
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('\n📡 Testando conexão...\n');

  try {
    // 1. Testar conexão básica
    const { data: healthCheck, error: healthError } = await supabase
      .from('leads')
      .select('count', { count: 'exact', head: true });

    if (healthError) {
      console.error('❌ Erro ao conectar:', healthError.message);

      if (healthError.message.includes('relation') || healthError.message.includes('does not exist')) {
        console.log('\n⚠️  A tabela "leads" não existe.');
        console.log('💡 Você precisa aplicar as migrations:');
        console.log('   cd supabase');
        console.log('   supabase db push\n');
      }

      return false;
    }

    console.log('✅ Conexão com Supabase estabelecida!\n');
    return true;

  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function checkTables() {
  console.log('📋 Verificando tabelas...\n');

  const tables = [
    'profiles',
    'leads',
    'lead_interactions',
    'agendamentos',
    'contratos',
    'agent_ai_logs',
    'agent_executions',
    'whatsapp_conversations',
    'whatsapp_messages'
  ];

  const results = [];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.push({ table, status: '❌', count: 0, error: error.message });
      } else {
        results.push({ table, status: '✅', count, error: null });
      }
    } catch (err) {
      results.push({ table, status: '❌', count: 0, error: err.message });
    }
  }

  // Exibir resultados
  console.log('Tabela'.padEnd(30) + 'Status'.padEnd(10) + 'Registros');
  console.log('-'.repeat(60));

  let existingTables = 0;
  let totalRecords = 0;

  for (const result of results) {
    const countStr = result.count !== null ? result.count.toString() : 'N/A';
    console.log(
      result.table.padEnd(30) +
      result.status.padEnd(10) +
      countStr
    );

    if (result.status === '✅') {
      existingTables++;
      totalRecords += result.count || 0;
    } else if (result.error) {
      console.log(`  └─ Erro: ${result.error}`);
    }
  }

  console.log('-'.repeat(60));
  console.log(`Total: ${existingTables}/${tables.length} tabelas encontradas`);
  console.log(`Total de registros: ${totalRecords}\n`);

  return { existingTables, totalTables: tables.length, totalRecords, results };
}

async function checkData() {
  console.log('📊 Verificando dados disponíveis...\n');

  const queries = [
    { name: 'Leads', query: () => supabase.from('leads').select('*').limit(3) },
    { name: 'Agendamentos', query: () => supabase.from('agendamentos').select('*').limit(3) },
    { name: 'Contratos', query: () => supabase.from('contratos').select('*').limit(3) },
  ];

  for (const { name, query } of queries) {
    const { data, error } = await query();

    if (error) {
      console.log(`❌ ${name}: Erro ao buscar - ${error.message}`);
    } else {
      console.log(`✅ ${name}: ${data?.length || 0} registro(s) encontrado(s)`);

      if (data && data.length > 0) {
        console.log(`   Exemplo: ${JSON.stringify(data[0]).substring(0, 80)}...`);
      }
    }
  }

  console.log();
}

async function checkMigrations() {
  console.log('🗄️  Verificando migrations críticas...\n');

  const criticalChecks = [
    {
      name: 'agent_ai_logs (Migration 20251210000000)',
      check: async () => {
        const { data, error } = await supabase
          .from('agent_ai_logs')
          .select('agent_name, total_tokens')
          .limit(1);
        return !error;
      }
    },
    {
      name: 'agent_executions (Migration 20251210000001)',
      check: async () => {
        const { data, error } = await supabase
          .from('agent_executions')
          .select('execution_id, status')
          .limit(1);
        return !error;
      }
    },
    {
      name: 'whatsapp_conversations (Migration 20251211000000)',
      check: async () => {
        const { data, error } = await supabase
          .from('whatsapp_conversations')
          .select('id')
          .limit(1);
        return !error;
      }
    }
  ];

  let appliedCount = 0;

  for (const { name, check } of criticalChecks) {
    const applied = await check();
    console.log(`${applied ? '✅' : '❌'} ${name}`);
    if (applied) appliedCount++;
  }

  console.log(`\n${appliedCount}/${criticalChecks.length} migrations críticas aplicadas\n`);

  return appliedCount === criticalChecks.length;
}

async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 RELATÓRIO FINAL');
  console.log('='.repeat(60) + '\n');

  const connected = await testConnection();

  if (!connected) {
    console.log('❌ FALHA NA CONEXÃO');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Verifique as credenciais no .env');
    console.log('   2. Confirme que o projeto Supabase está ativo');
    console.log('   3. Execute: supabase db push\n');
    return;
  }

  const tableResults = await checkTables();
  await checkData();
  const migrationsOk = await checkMigrations();

  // Score geral
  const scorePercentage = Math.round(
    (tableResults.existingTables / tableResults.totalTables) * 100
  );

  console.log('='.repeat(60));
  console.log('🎯 STATUS GERAL\n');
  console.log(`Conexão: ${connected ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`Tabelas: ${scorePercentage}% (${tableResults.existingTables}/${tableResults.totalTables})`);
  console.log(`Dados: ${tableResults.totalRecords} registros`);
  console.log(`Migrations: ${migrationsOk ? '✅ Aplicadas' : '⚠️  Pendentes'}`);

  console.log('\n' + '='.repeat(60));

  if (scorePercentage === 100 && migrationsOk) {
    console.log('✅ SISTEMA 100% PRONTO!');
    console.log('\nTudo configurado corretamente. Pode usar o sistema.\n');
  } else if (scorePercentage >= 50) {
    console.log('⚠️  SISTEMA PARCIALMENTE CONFIGURADO');
    console.log('\n💡 Próximos passos:');

    if (!migrationsOk) {
      console.log('   1. Aplicar migrations pendentes:');
      console.log('      cd supabase');
      console.log('      supabase db push');
    }

    if (tableResults.totalRecords === 0) {
      console.log('   2. Popular banco com dados de teste:');
      console.log('      npm run db:seed');
    }
    console.log();
  } else {
    console.log('❌ SISTEMA NÃO CONFIGURADO');
    console.log('\n💡 Ações necessárias:');
    console.log('   1. Aplicar todas as migrations:');
    console.log('      cd supabase');
    console.log('      supabase db push');
    console.log('   2. Verificar conexão com Supabase');
    console.log('   3. Confirmar credenciais no .env\n');
  }

  console.log('='.repeat(60) + '\n');
}

// Executar
generateReport().catch(console.error);

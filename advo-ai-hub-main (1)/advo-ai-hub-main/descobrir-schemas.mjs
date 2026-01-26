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

console.log('🔍 DESCOBRINDO ESTRUTURA REAL DAS TABELAS\n');
console.log('═'.repeat(60));

async function descobrirSchema(tabela, dadosTeste) {
  console.log(`\n📋 TABELA: ${tabela.toUpperCase()}`);
  console.log('-'.repeat(60));

  try {
    const { data, error } = await supabase
      .from(tabela)
      .insert(dadosTeste)
      .select()
      .single();

    if (error) {
      console.log(`❌ Erro: ${error.message}`);
      console.log(`Código: ${error.code}`);
      if (error.details) console.log(`Detalhes: ${error.details}`);
      return null;
    }

    console.log('✅ Inserção bem-sucedida!');
    console.log('\n🗂️ COLUNAS DISPONÍVEIS:');
    const colunas = Object.keys(data);
    colunas.forEach(col => {
      console.log(`   - ${col}: ${typeof data[col]} = ${data[col]}`);
    });

    // Deletar o registro de teste
    await supabase.from(tabela).delete().eq('id', data.id);
    console.log('   (registro de teste deletado)');

    return colunas;
  } catch (e) {
    console.error(`❌ Exceção: ${e.message}`);
    return null;
  }
}

async function descobrirTodas() {
  // Pegar tenant_id para usar nos testes
  const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
  const tenantId = tenant?.id;

  if (!tenantId) {
    console.error('❌ Nenhum tenant encontrado!');
    return;
  }

  console.log(`✅ Usando tenant_id: ${tenantId}\n`);

  // Testar agentes_ia
  await descobrirSchema('agentes_ia', {
    nome: 'Teste',
    tenant_id: tenantId
  });

  // Testar agendamentos
  const { data: umLead } = await supabase.from('leads').select('id').limit(1).single();

  await descobrirSchema('agendamentos', {
    tenant_id: tenantId,
    titulo: 'Teste Agendamento',
    data_hora: new Date().toISOString()
  });

  // Testar contratos
  await descobrirSchema('contratos', {
    tenant_id: tenantId,
    titulo: 'Teste Contrato'
  });

  console.log('\n' + '═'.repeat(60));
  console.log('✅ DESCOBERTA CONCLUÍDA!');
  console.log('═'.repeat(60) + '\n');
}

descobrirTodas();

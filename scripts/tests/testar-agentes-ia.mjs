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

console.log('🔍 TESTANDO AGENTES_IA - DESCOBRINDO CAMPOS MÍNIMOS\n');

async function testar() {
  const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
  const tenantId = tenant?.id;

  // Teste 1: Só nome e tipo e tenant_id
  console.log('Teste 1: nome + tipo + tenant_id');
  let { data, error } = await supabase
    .from('agentes_ia')
    .insert({
      nome: 'Teste Agente',
      tipo: 'qualificacao',
      tenant_id: tenantId
    })
    .select();

  if (error) {
    console.log(`❌ ${error.message}\n`);
  } else {
    console.log('✅ Sucesso!');
    console.log('\n📋 COLUNAS:');
    Object.keys(data[0]).forEach(col => {
      console.log(`   - ${col}: ${typeof data[0][col]} = ${JSON.stringify(data[0][col])}`);
    });

    // Deletar
    await supabase.from('agentes_ia').delete().eq('id', data[0].id);
    console.log('\n   (registro deletado)\n');
    return;
  }

  // Se falhou, tentar com mais campos
  console.log('Teste 2: Adicionando mais campos...');
  ({ data, error } = await supabase
    .from('agentes_ia')
    .insert({
      nome: 'Teste Agente',
      tipo: 'qualificacao',
      tenant_id: tenantId,
      descricao: 'Teste',
      ativo: true
    })
    .select());

  if (error) {
    console.log(`❌ ${error.message}\n`);
  } else {
    console.log('✅ Sucesso!');
    console.log('\n📋 COLUNAS:');
    Object.keys(data[0]).forEach(col => {
      console.log(`   - ${col}: ${typeof data[0][col]} = ${JSON.stringify(data[0][col])}`);
    });

    await supabase.from('agentes_ia').delete().eq('id', data[0].id);
  }
}

testar();

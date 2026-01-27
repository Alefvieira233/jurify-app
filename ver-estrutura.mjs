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

console.log('🔍 DESCOBRINDO ESTRUTURA REAL DA TABELA LEADS...\n');

async function descobrirEstrutura() {
  // Tentar inserir só com nome
  console.log('Teste 1: Inserindo apenas { nome }...');
  const { data: test1, error: error1 } = await supabase
    .from('leads')
    .insert({ nome: 'Teste' })
    .select();

  if (error1) {
    console.log('❌ Erro:', error1.message);
    if (error1.message.includes('not-null')) {
      console.log('→ Tem campos obrigatórios faltando');
    }
  } else {
    console.log('✅ Sucesso! Colunas:', Object.keys(test1[0]));
    await supabase.from('leads').delete().eq('id', test1[0].id);
  }

  // Tentar com mais campos
  console.log('\nTeste 2: Com nome + email + telefone...');
  const { data: test2, error: error2 } = await supabase
    .from('leads')
    .insert({
      nome: 'Teste',
      email: 'teste@teste.com',
      telefone: '11999999999'
    })
    .select();

  if (error2) {
    console.log('❌ Erro:', error2.message);
  } else {
    console.log('✅ Sucesso! Colunas:', Object.keys(test2[0]));
    console.log('\nESTRUTURA COMPLETA:');
    console.log(JSON.stringify(test2[0], null, 2));
    await supabase.from('leads').delete().eq('id', test2[0].id);
  }
}

descobrirEstrutura();

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv() {
  try {
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
  } catch (error) {
    return {};
  }
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  console.log('🔍 Verificando estrutura da tabela LEADS...\n');
  
  // Tentar inserir um registro vazio para ver quais colunas existem
  const { error } = await supabase.from('leads').insert({}).select();
  
  if (error) {
    console.log('Erro (esperado):');
    console.log(error.message);
    console.log('\nDetalhes:', error.details);
    console.log('\nHint:', error.hint);
  }
  
  // Tentar pegar a estrutura via RPC
  const { data, error: rpcError } = await supabase.rpc('exec', {
    sql: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'leads'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `
  });
  
  if (!rpcError && data) {
    console.log('\n✅ Colunas da tabela LEADS:');
    console.log(data);
  }
}

checkSchema();

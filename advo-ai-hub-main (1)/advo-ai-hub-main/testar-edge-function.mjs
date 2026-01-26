import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

console.log('\n🔍 TESTE DETALHADO - EDGE FUNCTION\n');
console.log('='.repeat(60));

const env = {};
readFileSync('.env', 'utf-8').split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  const value = valueParts.join('=').trim();
  if (key && value) env[key.trim()] = value;
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

console.log('📋 Configurações:');
console.log(`   URL: ${env.VITE_SUPABASE_URL}`);
console.log(`   ANON Key: ${env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...`);
console.log();

// Buscar agente
console.log('1️⃣ Buscando agente...');
const { data: agentes } = await supabase
  .from('agentes_ia')
  .select('*')
  .eq('ativo', true)
  .limit(1);

if (!agentes || agentes.length === 0) {
  console.error('❌ Nenhum agente encontrado');
  process.exit(1);
}

const agente = agentes[0];
console.log(`✅ ${agente.nome} (ID: ${agente.id})\n`);

// Testar Edge Function
console.log('2️⃣ Chamando Edge Function...');
console.log(`   Endpoint: ${env.VITE_SUPABASE_URL}/functions/v1/agentes-ia-api`);
console.log();

try {
  const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
    body: {
      agente_id: agente.id,
      input_usuario: 'Teste simples',
      use_n8n: false
    }
  });

  if (error) {
    console.error('❌ Erro retornado:');
    console.error('   Message:', error.message);
    console.error('   Status:', error.status || 'N/A');
    console.error('   Context:', error.context || 'N/A');
    console.error('\n📋 Detalhes completos:');
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Sucesso!');
    console.log('📋 Resposta:');
    console.log(JSON.stringify(data, null, 2));
  }
} catch (err) {
  console.error('❌ Exception capturada:');
  console.error(err);
}

console.log('\n');

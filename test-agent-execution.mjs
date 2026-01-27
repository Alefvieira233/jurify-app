/**
 * 🧪 TESTE DE EXECUÇÃO DE AGENTE IA
 *
 * Testa se um agente consegue executar via Edge Function
 */

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

console.log('\n🤖 TESTE DE EXECUÇÃO DE AGENTE IA\n');
console.log('='.repeat(60));

async function testAgentExecution() {
  try {
    // 1. Buscar um agente IA
    console.log('\n📋 Buscando agentes IA disponíveis...');
    const { data: agentes, error: agentError } = await supabase
      .from('agentes_ia')
      .select('*')
      .limit(1);

    if (agentError || !agentes || agentes.length === 0) {
      console.error('❌ Nenhum agente encontrado:', agentError?.message);
      return;
    }

    const agente = agentes[0];
    console.log(`✅ Agente encontrado: ${agente.nome} (${agente.id})`);

    // 2. Tentar executar o agente
    console.log('\n🚀 Executando agente IA via Edge Function...');
    console.log('   Input: "Olá, preciso de ajuda com um caso trabalhista"');

    const startTime = Date.now();

    const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
      body: {
        agente_id: agente.id,
        input_usuario: 'Olá, preciso de ajuda com um caso trabalhista sobre demissão sem justa causa',
        use_n8n: false // Forçar uso da OpenAI local
      }
    });

    const duration = Date.now() - startTime;

    console.log(`\n⏱️  Tempo de execução: ${duration}ms`);

    if (error) {
      console.error('\n❌ ERRO NA EXECUÇÃO:');
      console.error('   Mensagem:', error.message);
      console.error('   Detalhes:', JSON.stringify(error, null, 2));

      // Análise do erro
      if (error.message?.includes('OPENAI_API_KEY')) {
        console.log('\n💡 SOLUÇÃO:');
        console.log('   A OpenAI API Key não está configurada no Supabase!');
        console.log('\n   Para configurar:');
        console.log('   1. Acesse: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/vault/secrets');
        console.log('   2. Clique em "New secret"');
        console.log('   3. Nome: OPENAI_API_KEY');
        console.log('   4. Valor: sua-chave-da-openai (começa com sk-...)');
        console.log('   5. Salve e aguarde ~1 minuto para propagar\n');
      }

      return;
    }

    // Sucesso!
    console.log('\n✅ AGENTE EXECUTOU COM SUCESSO!\n');
    console.log('📊 Resultado:');
    console.log('   Source:', data.source || 'N/A');
    console.log('   Success:', data.success || false);

    if (data.response) {
      const preview = typeof data.response === 'string'
        ? data.response.substring(0, 200)
        : JSON.stringify(data.response).substring(0, 200);
      console.log('   Response:', preview + '...');
    }

    if (data.execution_time) {
      console.log('   Execution Time:', data.execution_time, 'ms');
    }

    // 3. Verificar logs
    console.log('\n📝 Verificando logs no banco...');
    const { data: logs, error: logsError } = await supabase
      .from('agent_ai_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!logsError && logs && logs.length > 0) {
      console.log('✅ Log registrado no banco:');
      console.log('   Agent:', logs[0].agent_name);
      console.log('   Status:', logs[0].status);
      console.log('   Tokens:', logs[0].total_tokens);
      console.log('   Latency:', logs[0].latency_ms, 'ms');
    }

  } catch (err) {
    console.error('\n❌ ERRO INESPERADO:', err.message);
    console.error(err);
  }
}

// Executar teste
testAgentExecution()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 TESTE CONCLUÍDO\n');
  })
  .catch(console.error);

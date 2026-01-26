/**
 * 🧪 TESTE COMPLETO DA EDGE FUNCTION
 *
 * Simula exatamente como o frontend chama a Edge Function
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

// Usar o cliente Supabase como o frontend faz
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

console.log('\n🧪 TESTE COMPLETO - EDGE FUNCTION AGENTES-IA-API\n');
console.log('='.repeat(60));

async function testarEdgeFunction() {
  try {
    // 1. Buscar um agente
    console.log('📋 Buscando agente IA...');
    const { data: agentes, error: agentError } = await supabase
      .from('agentes_ia')
      .select('*')
      .limit(1)
      .single();

    if (agentError) {
      console.error('❌ Erro ao buscar agente:', agentError);
      return;
    }

    console.log(`✅ Agente encontrado: ${agentes.nome} (${agentes.id})\n`);

    // 2. Chamar Edge Function (como o frontend faz)
    console.log('🚀 Chamando Edge Function...');
    console.log('   Payload:', {
      agente_id: agentes.id,
      input_usuario: 'Teste de execução do agente IA',
      use_n8n: false
    });

    const startTime = Date.now();

    const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
      body: {
        agente_id: agentes.id,
        input_usuario: 'Olá, preciso de ajuda com um caso de demissão sem justa causa. Tenho direito a FGTS?',
        use_n8n: false
      }
    });

    const duration = Date.now() - startTime;

    console.log(`\n⏱️  Tempo: ${duration}ms\n`);

    if (error) {
      console.error('❌ ERRO NA EXECUÇÃO:');
      console.error('   Nome:', error.name);
      console.error('   Mensagem:', error.message);
      console.error('   Context:', error.context);

      // Tentar detalhar mais o erro
      console.log('\n🔍 DIAGNÓSTICO:\n');

      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.log('   ⚠️  Erro de autenticação');
        console.log('   Possível causa: Edge Function configurada para exigir autenticação');
        console.log('\n   💡 SOLUÇÃO:');
        console.log('   1. Verifique se há RLS nas tabelas que a função acessa');
        console.log('   2. Tente fazer login no sistema antes de chamar a função');
        console.log('   3. Verifique as configurações de Auth da Edge Function\n');
      } else if (error.message?.includes('500')) {
        console.log('   ⚠️  Erro interno da função');
        console.log('   Possível causa: Erro no código da Edge Function');
        console.log('\n   💡 SOLUÇÃO:');
        console.log('   1. Veja os logs em: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/logs/edge-functions');
        console.log('   2. Procure por erros de OPENAI_API_KEY ou outros\n');
      } else {
        console.log('   Erro não identificado. Verifique os logs do Supabase.');
      }

      return;
    }

    // Sucesso!
    console.log('✅ EDGE FUNCTION EXECUTOU COM SUCESSO!\n');
    console.log('='.repeat(60));
    console.log('📊 RESPOSTA:\n');
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(60));

    console.log('\n🎉 AGENTES IA FUNCIONANDO PERFEITAMENTE!\n');

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
  }
}

testarEdgeFunction();

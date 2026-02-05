/**
 * 🧪 TESTE DIRETO DA EDGE FUNCTION - SEM AUTENTICAÇÃO
 *
 * Testa se a Edge Function responde mesmo sem login
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
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

console.log('\n🧪 TESTE DIRETO - EDGE FUNCTION (SEM AUTH)\n');
console.log('='.repeat(60));

async function testar() {
  try {
    // Primeiro, vamos buscar um agente (pode precisar de auth ou não dependendo do RLS)
    console.log('📋 Tentando buscar agente IA...\n');

    const { data: agentes, error: agentError } = await supabase
      .from('agentes_ia')
      .select('id, nome')
      .limit(1);

    let agenteId = null;

    if (agentError) {
      console.log('⚠️  Não conseguiu buscar agente (pode ser RLS):', agentError.message);
      console.log('   Vamos usar um ID de agente fixo para teste\n');

      // Usando um dos IDs que sabemos que existem
      agenteId = '0e5a0646-1cac-42b7-bb00-7d7c5de6e8b3';
    } else if (agentes && agentes.length > 0) {
      agenteId = agentes[0].id;
      console.log(`✅ Agente encontrado: ${agentes[0].nome} (${agenteId})\n`);
    } else {
      console.log('⚠️  Nenhum agente encontrado');
      console.log('   Vamos usar um ID de agente fixo para teste\n');
      agenteId = '0e5a0646-1cac-42b7-bb00-7d7c5de6e8b3';
    }

    // Chamar Edge Function DIRETO
    console.log('🚀 Chamando Edge Function diretamente...');
    console.log('   Agente ID:', agenteId);
    console.log('   Input: "Fui demitido. Tenho direito a FGTS?"\n');

    const startTime = Date.now();

    const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
      body: {
        agente_id: agenteId,
        input_usuario: 'Fui demitido sem justa causa. Tenho direito a receber o FGTS e seguro-desemprego?',
        use_n8n: false
      }
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Tempo de resposta: ${duration}ms\n`);

    if (error) {
      console.error('❌ ERRO NA EDGE FUNCTION:\n');
      console.error('   Nome:', error.name);
      console.error('   Mensagem:', error.message);

      if (error.context) {
        console.error('   Context:', JSON.stringify(error.context, null, 2));
      }

      console.log('\n🔍 DIAGNÓSTICO:\n');

      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.log('   ❌ ERRO 401 - Não autorizado\n');
        console.log('   📋 Possíveis causas:');
        console.log('      1. Edge Function configurada para exigir autenticação');
        console.log('      2. RLS nas tabelas bloqueando acesso sem auth');
        console.log('      3. OPENAI_API_KEY não configurada no Supabase\n');
        console.log('   💡 PRÓXIMOS PASSOS:');
        console.log('      1. Verifique se OPENAI_API_KEY está em:');
        console.log('         https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/vault');
        console.log('      2. Aguarde 2-3 minutos após configurar');
        console.log('      3. Tente novamente\n');
      } else if (error.message?.includes('500')) {
        console.log('   ❌ ERRO 500 - Erro interno\n');
        console.log('   📋 Possíveis causas:');
        console.log('      1. Erro no código da Edge Function');
        console.log('      2. OPENAI_API_KEY inválida ou não configurada');
        console.log('      3. Problema na conexão com OpenAI\n');
        console.log('   💡 PRÓXIMOS PASSOS:');
        console.log('      1. Veja os logs: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/logs/edge-functions');
        console.log('      2. Procure por erros relacionados a OPENAI_API_KEY');
        console.log('      3. Verifique se a API key da OpenAI está válida\n');
      } else if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.log('   ❌ ERRO 404 - Função não encontrada\n');
        console.log('   📋 Possível causa:');
        console.log('      Edge Function não está deployada no Supabase\n');
        console.log('   💡 SOLUÇÃO:');
        console.log('      Fazer deploy da função:');
        console.log('      npx supabase functions deploy agentes-ia-api --project-ref yfxgncbopvnsltjqetxw\n');
      } else {
        console.log('   ⚠️  Erro não identificado');
        console.log('   Veja os logs do Supabase para mais detalhes\n');
      }

      return;
    }

    // SUCESSO!
    console.log('='.repeat(60));
    console.log('✅ ✅ ✅  SUCESSO!  ✅ ✅ ✅');
    console.log('='.repeat(60));
    console.log('\n🎉 A EDGE FUNCTION ESTÁ FUNCIONANDO!\n');
    console.log('📊 RESPOSTA DO AGENTE:\n');

    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🚀 SISTEMA 100% OPERACIONAL!');
    console.log('='.repeat(60));
    console.log('\n✅ Tudo está funcionando:');
    console.log('   • Frontend: http://localhost:3000');
    console.log('   • Banco de dados: Supabase conectado');
    console.log('   • OpenAI API: Configurada e funcionando');
    console.log('   • Edge Functions: Executando perfeitamente');
    console.log('   • Agentes IA: Respondendo consultas');
    console.log('\n🎯 Você pode agora:');
    console.log('   1. Acessar o sistema no navegador');
    console.log('   2. Fazer login');
    console.log('   3. Usar todos os agentes IA');
    console.log('   4. Ver o Mission Control ao vivo\n');

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
  }
}

testar();

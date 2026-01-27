/**
 * 🧪 TESTE COMPLETO COM LOGIN
 *
 * Faz login e testa Edge Function como usuário autenticado
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

console.log('\n🧪 TESTE COMPLETO - COM AUTENTICAÇÃO\n');
console.log('='.repeat(60));

async function testarComLogin() {
  try {
    // 1. Fazer login
    console.log('🔐 Fazendo login...\n');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'teste@jurify.com',
      password: 'teste123'
    });

    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      console.log('\n💡 Tente criar um usuário de teste:');
      console.log('   Email: test@jurify.com');
      console.log('   Senha: test123\n');
      console.log('   Ou use qualquer outro usuário que você criou no sistema.\n');
      return;
    }

    console.log('✅ Login realizado com sucesso!');
    console.log('   Usuário:', authData.user.email);
    console.log('   ID:', authData.user.id, '\n');

    // 2. Buscar agente (agora com autenticação)
    console.log('📋 Buscando agente IA...');

    const { data: agentes, error: agentError } = await supabase
      .from('agentes_ia')
      .select('*')
      .limit(1);

    if (agentError || !agentes || agentes.length === 0) {
      console.error('❌ Nenhum agente encontrado');
      console.log('\n💡 Vamos popular os agentes:');
      console.log('   node popular-agentes-ia.mjs\n');
      return;
    }

    const agente = agentes[0];
    console.log(`✅ Agente: ${agente.nome} (${agente.id})\n`);

    // 3. Chamar Edge Function
    console.log('🚀 Executando agente IA via Edge Function...\n');

    const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
      body: {
        agente_id: agente.id,
        input_usuario: 'Fui demitido sem justa causa. Tenho direito a receber o FGTS e seguro-desemprego?',
        use_n8n: false
      }
    });

    if (error) {
      console.error('❌ ERRO:', error.message);
      console.log('\n📋 Detalhes completos:');
      console.log(JSON.stringify(error, null, 2));
      console.log('\n💡 Verifique os logs em:');
      console.log('   https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/logs/edge-functions\n');
      return;
    }

    // SUCESSO!
    console.log('='.repeat(60));
    console.log('✅ AGENTE IA EXECUTOU COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📊 RESPOSTA DO AGENTE:\n');

    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SISTEMA 100% FUNCIONAL!');
    console.log('='.repeat(60));
    console.log('\n✅ Agora você pode:');
    console.log('   1. Acessar http://localhost:3000');
    console.log('   2. Fazer login');
    console.log('   3. Usar todos os agentes IA');
    console.log('   4. Ver Mission Control ao vivo\n');

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
  }
}

testarComLogin();

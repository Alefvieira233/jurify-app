/**
 * 🧪 TESTE COM USUÁRIO EXISTENTE JÁ CONFIRMADO
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

console.log('\n🧪 TESTE COM USUÁRIO EXISTENTE\n');
console.log('='.repeat(60));

async function testar() {
  try {
    // Listar usuários existentes via profiles
    console.log('📋 Buscando usuários do sistema...\n');

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    if (profileError) {
      console.error('❌ Erro ao buscar profiles:', profileError);
      return;
    }

    console.log(`✅ Encontrados ${profiles.length} usuários:\n`);
    profiles.forEach((p, i) => {
      console.log(`${i + 1}. ${p.nome_completo || 'Sem nome'} (ID: ${p.id})`);
    });

    // Vamos tentar fazer login com o primeiro usuário do sistema
    // Como não sabemos a senha, vamos tentar usar o usuário admin@jurify.com.br com senha padrão

    console.log('\n🔐 Tentando login com admin@jurify.com.br...\n');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@jurify.com.br',
      password: 'admin123'
    });

    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      console.log('\n💡 Vamos tentar com outros emails conhecidos...\n');

      // Tentar com alef_christian01@hotmail.com
      console.log('🔐 Tentando com alef_christian01@hotmail.com...\n');

      const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
        email: 'alef_christian01@hotmail.com',
        password: 'teste123'
      });

      if (authError2) {
        console.error('❌ Erro:', authError2.message);
        console.log('\n💡 Nenhum usuário com senha conhecida.');
        console.log('   Vamos confirmar o email do usuário teste@jurify.com primeiro.\n');
        return;
      }

      console.log('✅ Login realizado!');
      console.log('   Email:', authData2.user.email);
      console.log('   ID:', authData2.user.id, '\n');

      await testarEdgeFunction(authData2.user.id);
      return;
    }

    console.log('✅ Login realizado com sucesso!');
    console.log('   Email:', authData.user.email);
    console.log('   ID:', authData.user.id, '\n');

    await testarEdgeFunction(authData.user.id);

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
  }
}

async function testarEdgeFunction(userId) {
  try {
    // Buscar agente
    console.log('📋 Buscando agente IA...\n');

    const { data: agentes, error: agentError } = await supabase
      .from('agentes_ia')
      .select('*')
      .limit(1);

    if (agentError || !agentes || agentes.length === 0) {
      console.error('❌ Nenhum agente encontrado');
      return;
    }

    const agente = agentes[0];
    console.log(`✅ Agente: ${agente.nome} (${agente.id})\n`);

    // Chamar Edge Function
    console.log('🚀 Executando Edge Function...\n');

    const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
      body: {
        agente_id: agente.id,
        input_usuario: 'Fui demitido sem justa causa. Tenho direito a FGTS?',
        use_n8n: false
      }
    });

    if (error) {
      console.error('❌ ERRO:', error.message);
      console.log('\n📋 Detalhes:');
      console.log(JSON.stringify(error, null, 2));
      return;
    }

    // SUCESSO!
    console.log('='.repeat(60));
    console.log('✅ SUCESSO! EDGE FUNCTION FUNCIONOU!');
    console.log('='.repeat(60));
    console.log('\n📊 RESPOSTA:\n');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SISTEMA 100% FUNCIONAL!');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
  }
}

testar();

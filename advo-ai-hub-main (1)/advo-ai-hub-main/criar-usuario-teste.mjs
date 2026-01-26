/**
 * 👤 CRIAR USUÁRIO DE TESTE
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

console.log('\n👤 CRIANDO USUÁRIO DE TESTE\n');
console.log('='.repeat(60));

async function criarUsuario() {
  const email = 'teste@jurify.com';
  const password = 'teste123';

  console.log('Email:', email);
  console.log('Senha:', password);
  console.log();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome_completo: 'Usuário Teste',
        role: 'admin'
      }
    }
  });

  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }

  console.log('✅ Usuário criado com sucesso!');
  console.log('   Email:', email);
  console.log('   Senha:', password);
  console.log('   ID:', data.user?.id);
  console.log('\n💡 Use essas credenciais para fazer login!\n');
}

criarUsuario();

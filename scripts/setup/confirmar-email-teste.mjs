/**
 * ✅ CONFIRMAR EMAIL DO USUÁRIO DE TESTE
 *
 * Usa o service role key para confirmar o email do usuário teste@jurify.com
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
  Object.entries(process.env).forEach(([key, value]) => {
    if (value) env[key] = value;
  });
  return env;
}

const env = loadEnv();

// Usar SERVICE ROLE KEY para ter privilégios de admin
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in env.');
  console.error('Set it temporarily to confirm the test user email.');
  process.exit(1);
}

const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('\n✅ CONFIRMANDO EMAIL DO USUÁRIO TESTE\n');
console.log('='.repeat(60));

async function confirmarEmail() {
  try {
    const userId = '47a76291-8093-4ed9-a87f-f37044a99846';

    console.log('📋 Confirmando email para usuário:', userId);
    console.log('   Email: teste@jurify.com\n');

    // Atualizar usuário para confirmar email
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );

    if (error) {
      console.error('❌ Erro ao confirmar email:', error.message);
      console.log('\n💡 Detalhes:', JSON.stringify(error, null, 2));
      return;
    }

    console.log('✅ Email confirmado com sucesso!');
    console.log('   Usuário:', data.user.email);
    console.log('   Status:', data.user.email_confirmed_at ? 'CONFIRMADO' : 'PENDENTE');
    console.log('   ID:', data.user.id);
    console.log('\n🎉 Agora você pode fazer login com:');
    console.log('   Email: teste@jurify.com');
    console.log('   Senha: teste123\n');

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
  }
}

confirmarEmail();

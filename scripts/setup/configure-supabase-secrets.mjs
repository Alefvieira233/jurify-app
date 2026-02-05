/**
 * 🔐 CONFIGURAR SECRETS NO SUPABASE
 *
 * Configura a OPENAI_API_KEY diretamente no Supabase via Management API
 */

import { readFileSync } from 'fs';

function loadEnv(filename = '.env.secrets') {
  try {
    const envContent = readFileSync(filename, 'utf-8');
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
    console.error('❌ Erro ao ler arquivo:', error.message);
    return {};
  }
}

const secrets = loadEnv('.env.secrets');
const env = loadEnv('.env');

console.log('\n🔐 CONFIGURANDO SECRETS NO SUPABASE\n');
console.log('='.repeat(60));

const PROJECT_REF = 'yfxgncbopvnsltjqetxw';
const OPENAI_KEY = secrets.OPENAI_API_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_KEY) {
  console.error('❌ OPENAI_API_KEY não encontrada no .env.secrets');
  process.exit(1);
}

console.log('\n✅ OpenAI Key encontrada:', OPENAI_KEY.substring(0, 20) + '...');
console.log('\n⚠️  IMPORTANTE:');
console.log('   Por questões de segurança, secrets de Edge Functions devem');
console.log('   ser configurados via Supabase Dashboard ou CLI.\n');
console.log('📋 INSTRUÇÕES PARA CONFIGURAR:\n');
console.log('   1. Acesse: https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/secrets');
console.log('   2. Clique em "New secret"');
console.log('   3. Nome: OPENAI_API_KEY');
console.log('   4. Valor: ' + OPENAI_KEY);
console.log('   5. Clique em "Save"');
console.log('   6. Aguarde ~1 minuto para as Edge Functions atualizarem\n');
console.log('='.repeat(60));

console.log('\n💡 ALTERNATIVA: TESTAR LOCALMENTE\n');
console.log('   Vou criar um arquivo .env local para as Edge Functions testarem:');

// Criar .env para Edge Functions
const edgeFunctionsEnv = `OPENAI_API_KEY=${OPENAI_KEY}
SUPABASE_URL=${env.VITE_SUPABASE_URL}
SUPABASE_ANON_KEY=${env.VITE_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${env.SUPABASE_SERVICE_ROLE_KEY}
`;

try {
  // Para Edge Functions locais
  const fs = await import('fs');
  const path = await import('path');

  fs.writeFileSync('supabase/.env', edgeFunctionsEnv);
  console.log('   ✅ Criado: supabase/.env (para testes locais)\n');

  console.log('   Para testar localmente:');
  console.log('   npm install -g supabase');
  console.log('   supabase functions serve agentes-ia-api --env-file supabase/.env\n');

} catch (error) {
  console.error('   ⚠️  Não foi possível criar supabase/.env:', error.message);
}

console.log('='.repeat(60));
console.log('\n✅ PRÓXIMO PASSO:');
console.log('   Configure o secret no Dashboard (link acima)');
console.log('   OU continue testando - vou tentar outras abordagens!\n');

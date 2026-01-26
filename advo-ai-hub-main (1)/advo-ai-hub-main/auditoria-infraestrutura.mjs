import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env', 'utf-8').split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  const value = valueParts.join('=').trim();
  if (key && value) env[key.trim()] = value;
});

console.log('\n=== AUDITORIA 1: INFRAESTRUTURA BASE ===\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// 1. Validar JWT format
const isJWT = (token) => {
  const parts = token.split('.');
  return parts.length === 3 && parts[0].startsWith('eyJ');
};

console.log('1.1 Formato ANON_KEY:');
if (isJWT(env.VITE_SUPABASE_ANON_KEY)) {
  console.log('    ✅ JWT válido');
  results.passed++;
} else {
  console.log('    ❌ Formato inválido');
  results.failed++;
}

console.log('1.2 Formato SERVICE_ROLE_KEY:');
if (isJWT(env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.log('    ✅ JWT válido');
  results.passed++;
} else {
  console.log('    ❌ Formato inválido');
  results.failed++;
}

// 2. Testar conexão com ambas as chaves
const supabaseAnon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('1.3 Conexão com ANON_KEY:');
try {
  const { data, error } = await supabaseAnon.from('profiles').select('count').limit(1);
  if (error) {
    console.log('    ❌', error.message);
    results.failed++;
  } else {
    console.log('    ✅ Conectado');
    results.passed++;
  }
} catch (e) {
  console.log('    ❌', e.message);
  results.failed++;
}

console.log('1.4 Conexão com SERVICE_ROLE:');
try {
  const { data, error } = await supabaseAdmin.from('profiles').select('count').limit(1);
  if (error) {
    console.log('    ❌', error.message);
    results.failed++;
  } else {
    console.log('    ✅ Conectado');
    results.passed++;
  }
} catch (e) {
  console.log('    ❌', e.message);
  results.failed++;
}

// 3. Verificar tabelas críticas existem
const tabelas = [
  'profiles',
  'agentes_ia',
  'leads',
  'logs_execucao_agentes',
  'agent_executions',
  'agent_ai_logs'
];

console.log('\n1.5 Verificando existência de tabelas críticas:');
for (const tabela of tabelas) {
  try {
    const { error } = await supabaseAdmin.from(tabela).select('count').limit(0);
    if (error) {
      console.log('    ❌', tabela + ':', error.message);
      results.failed++;
    } else {
      console.log('    ✅', tabela);
      results.passed++;
    }
  } catch (e) {
    console.log('    ❌', tabela + ':', e.message);
    results.failed++;
  }
}

// 4. Verificar quantidade de dados
console.log('\n1.6 Verificando dados populados:');

const { data: profiles } = await supabaseAdmin.from('profiles').select('count');
const countProfiles = profiles?.[0]?.count || 0;
console.log('    - Profiles:', countProfiles, countProfiles > 0 ? '✅' : '⚠️');
if (countProfiles > 0) results.passed++; else results.warnings++;

const { data: agentes } = await supabaseAdmin.from('agentes_ia').select('count');
const countAgentes = agentes?.[0]?.count || 0;
console.log('    - Agentes IA:', countAgentes, countAgentes > 0 ? '✅' : '⚠️');
if (countAgentes > 0) results.passed++; else results.warnings++;

const { data: leads } = await supabaseAdmin.from('leads').select('count');
const countLeads = leads?.[0]?.count || 0;
console.log('    - Leads:', countLeads, countLeads > 0 ? '✅' : '⚠️');
if (countLeads > 0) results.passed++; else results.warnings++;

// 5. Verificar OPENAI_API_KEY
console.log('\n1.7 Verificando OPENAI_API_KEY:');
if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith('sk-')) {
  console.log('    ✅ Formato válido');
  results.passed++;
} else {
  console.log('    ❌ Chave não configurada ou inválida');
  results.failed++;
}

console.log('\n' + '='.repeat(50));
console.log('RESULTADO INFRAESTRUTURA:');
console.log('  ✅ Passou:', results.passed);
console.log('  ❌ Falhou:', results.failed);
console.log('  ⚠️  Avisos:', results.warnings);
console.log('='.repeat(50));

process.exit(results.failed > 0 ? 1 : 0);

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

const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

console.log('\n=== VERIFICANDO AGENTES ===\n');

// Com SERVICE_ROLE
console.log('1. Buscando com SERVICE_ROLE...');
const { data: adminData, error: adminError } = await supabaseAdmin
  .from('agentes_ia')
  .select('id, nome, ativo, tenant_id');

if (adminError) {
  console.error('Erro:', adminError.message);
} else {
  console.log(`✅ Total: ${adminData.length} agentes`);
  adminData.slice(0, 3).forEach(a => {
    console.log(`   - ${a.nome} (ativo: ${a.ativo})`);
  });
}

console.log('\n2. Buscando com ANON_KEY...');
const { data: anonData, error: anonError } = await supabaseAnon
  .from('agentes_ia')
  .select('id, nome, ativo, tenant_id')
  .eq('ativo', true);

if (anonError) {
  console.error('❌ Erro:', anonError.message);
  console.error('   Código:', anonError.code);
  console.error('   RLS pode estar bloqueando!');
} else {
  console.log(`✅ Total: ${anonData.length} agentes`);
  anonData.slice(0, 3).forEach(a => {
    console.log(`   - ${a.nome}`);
  });
}

console.log('\n');

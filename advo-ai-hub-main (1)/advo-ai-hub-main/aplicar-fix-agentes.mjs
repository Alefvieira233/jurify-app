import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

console.log('\n🔧 APLICANDO FIX: Policy SELECT para agentes_ia\n');
console.log('='.repeat(60));

const env = {};
readFileSync('.env', 'utf-8').split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  const value = valueParts.join('=').trim();
  if (key && value) env[key.trim()] = value;
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const sql = readFileSync('supabase/migrations/20251217000003_fix_agentes_select_policy.sql', 'utf-8');

// Executar statements individualmente
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`\n📝 ${statements.length} comandos SQL a executar\n`);

for (const stmt of statements) {
  // Pular comentários e blocos vazios
  if (stmt.startsWith('COMMENT ON') || stmt.length < 10) {
    continue;
  }

  const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';
  console.log(`Executando: ${preview}`);

  try {
    // Tentar executar diretamente
    const { error } = await supabase.rpc('query', { sql: stmt + ';' });

    if (error && !error.message.includes('does not exist')) {
      console.log(`   ⚠️  ${error.message}`);
    } else {
      console.log(`   ✅ OK`);
    }
  } catch (err) {
    // Ignorar erros de "não existe" pois são esperados ao dropar policies
    if (!err.message.includes('does not exist')) {
      console.log(`   ⚠️  ${err.message}`);
    } else {
      console.log(`   ✅ OK (já não existia)`);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n✅ Migration aplicada!\n');
console.log('Testando leitura de agentes...\n');

// Testar com ANON_KEY
const supabaseAnon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const { data, error } = await supabaseAnon
  .from('agentes_ia')
  .select('id, nome, ativo')
  .eq('ativo', true);

if (error) {
  console.error('❌ Ainda bloqueado:', error.message);
} else {
  console.log(`✅ Sucesso! ${data.length} agentes ativos encontrados:`);
  data.slice(0, 3).forEach(a => console.log(`   - ${a.nome}`));
}

console.log('\n');

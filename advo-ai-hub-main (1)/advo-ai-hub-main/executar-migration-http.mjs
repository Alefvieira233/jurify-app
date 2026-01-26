import { readFileSync } from 'fs';

console.log('\n🔧 EXECUTANDO MIGRATION VIA HTTP\n');
console.log('='.repeat(60));

const env = {};
readFileSync('.env', 'utf-8').split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  const value = valueParts.join('=').trim();
  if (key && value) env[key.trim()] = value;
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

// Comandos SQL
const sqls = [
  `DROP POLICY IF EXISTS "secure_agentes_select" ON public.agentes_ia`,

  `CREATE POLICY "agentes_read_active" ON public.agentes_ia FOR SELECT USING (ativo = true)`,

  `CREATE POLICY "agentes_read_own_tenant" ON public.agentes_ia FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))`
];

for (const sql of sqls) {
  const preview = sql.substring(0, 50) + '...';
  console.log(`\n📝 ${preview}`);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    const data = await response.text();

    if (!response.ok) {
      console.log(`   ⚠️  HTTP ${response.status}: ${data}`);
    } else {
      console.log(`   ✅ OK`);
    }
  } catch (err) {
    console.log(`   ⚠️  ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n🧪 Testando leitura de agentes...\n');

// Testar
const response = await fetch(`${supabaseUrl}/rest/v1/agentes_ia?ativo=eq.true&select=id,nome,ativo`, {
  headers: {
    'apikey': env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
  }
});

const agentes = await response.json();

if (!response.ok) {
  console.error('❌ Erro:', agentes);
} else {
  console.log(`✅ ${agentes.length} agentes encontrados!`);
  agentes.slice(0, 3).forEach(a => console.log(`   - ${a.nome}`));
}

console.log('\n');

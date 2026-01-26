/**
 * 🔧 ATUALIZAR NOMES DOS PROFILES
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
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('\n🔧 ATUALIZANDO NOMES DOS PROFILES\n');

async function atualizar() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .is('nome_completo', null);

  console.log(`Encontrados ${profiles?.length || 0} profiles sem nome\n`);

  for (const profile of profiles || []) {
    const nome = profile.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    console.log(`📝 ${profile.email} → ${nome}`);

    await supabase
      .from('profiles')
      .update({ nome_completo: nome })
      .eq('id', profile.id);
  }

  console.log('\n✅ Concluído!\n');
}

atualizar();

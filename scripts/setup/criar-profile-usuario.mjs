/**
 * 🔧 CRIAR PROFILE PARA USUÁRIO AUTENTICADO
 *
 * Cria um profile na tabela profiles para o usuário logado
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

console.log('\n🔧 CRIANDO PROFILE PARA USUÁRIO\n');
console.log('='.repeat(60));

async function criarProfile() {
  try {
    // 1. Listar usuários sem profile
    console.log('\n📋 Buscando usuários sem profile...\n');

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError.message);
      return;
    }

    console.log(`✅ Encontrados ${users.users.length} usuário(s)\n`);

    for (const user of users.users) {
      console.log(`\n👤 Usuário: ${user.email}`);
      console.log(`   ID: ${user.id}`);

      // Verificar se já tem profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        console.log('   ✅ Profile já existe');
        console.log(`   Nome: ${existingProfile.nome_completo}`);
        console.log(`   Role: ${existingProfile.role}`);
        console.log(`   Tenant: ${existingProfile.tenant_id}`);
        continue;
      }

      // Criar profile
      console.log('   🔄 Criando profile...');

      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          nome_completo: user.user_metadata?.nome_completo || user.email?.split('@')[0] || 'Usuário',
          role: 'admin', // Primeiro usuário é admin
          tenant_id: user.user_metadata?.tenant_id || null
        })
        .select()
        .single();

      if (profileError) {
        console.error('   ❌ Erro ao criar profile:', profileError.message);
        continue;
      }

      console.log('   ✅ Profile criado com sucesso!');
      console.log(`   Nome: ${newProfile.nome_completo}`);
      console.log(`   Role: ${newProfile.role}`);
      console.log(`   Tenant: ${newProfile.tenant_id || '(será criado automaticamente)'}`);

      // Se não tem tenant_id, atualizar para gerar um
      if (!newProfile.tenant_id) {
        console.log('   🔄 Gerando tenant_id...');

        const tenantId = crypto.randomUUID();

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ tenant_id: tenantId })
          .eq('id', user.id);

        if (updateError) {
          console.error('   ❌ Erro ao atualizar tenant_id:', updateError.message);
        } else {
          console.log(`   ✅ Tenant ID criado: ${tenantId}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCESSO CONCLUÍDO!\n');

  } catch (error) {
    console.error('\n❌ Erro inesperado:', error.message);
  }
}

criarProfile();

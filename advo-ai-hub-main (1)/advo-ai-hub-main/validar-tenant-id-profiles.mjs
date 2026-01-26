/**
 * 🏢 VALIDAR TENANT_ID EM PROFILES
 *
 * Verifica se todos os profiles têm tenant_id populado
 */

import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

console.log('\n🏢 VALIDAÇÃO DE TENANT_ID EM PROFILES\n');
console.log('='.repeat(60));

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

async function perguntarUsuario(mensagem) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(mensagem, (resposta) => {
      rl.close();
      resolve(resposta.trim().toLowerCase());
    });
  });
}

async function validar() {
  const resultados = [];

  try {
    console.log('📋 Lendo arquivo .env...\n');
    const env = loadEnv();

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Chaves não encontradas no .env');
      console.error('   Execute primeiro: node validar-chaves-supabase.mjs\n');
      return false;
    }

    console.log('✅ Conectando ao Supabase...\n');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Buscar todos os profiles
    console.log('1️⃣ Buscando todos os profiles...\n');

    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, email, nome_completo, tenant_id')
      .order('email');

    if (allError) {
      console.error('❌ Erro ao buscar profiles:', allError.message, '\n');
      return false;
    }

    console.log(`✅ Encontrados ${allProfiles.length} profiles no total\n`);
    resultados.push({ teste: 'Total de profiles', valor: allProfiles.length, status: 'INFO' });

    // 2. Buscar profiles sem tenant_id
    console.log('2️⃣ Verificando profiles sem tenant_id...\n');

    const { data: profilesSemTenant, error: semTenantError } = await supabase
      .from('profiles')
      .select('id, email, nome_completo, tenant_id')
      .is('tenant_id', null);

    if (semTenantError) {
      console.error('❌ Erro ao buscar profiles sem tenant:', semTenantError.message, '\n');
      return false;
    }

    if (profilesSemTenant.length === 0) {
      console.log('✅ TODOS os profiles têm tenant_id!\n');
      resultados.push({ teste: 'Profiles sem tenant_id', valor: 0, status: 'OK' });

      console.log('🎉 Nenhuma ação necessária!\n');

      // Salvar relatório
      const relatorio = `# Relatório de Validação de tenant_id

**Data:** ${new Date().toLocaleString('pt-BR')}

## Resultados

- **Total de profiles:** ${allProfiles.length}
- **Profiles sem tenant_id:** 0

## ✅ Status: TODOS OS PROFILES OK!

Todos os profiles têm tenant_id configurado corretamente.
`;

      writeFileSync('RELATORIO_TENANT_ID.md', relatorio);
      console.log('📄 Relatório salvo em: RELATORIO_TENANT_ID.md\n');

      return true;
    }

    // 3. Mostrar profiles problemáticos
    console.log(`⚠️  Encontrados ${profilesSemTenant.length} profiles SEM tenant_id:\n`);

    profilesSemTenant.forEach((profile, i) => {
      console.log(`   ${i + 1}. ${profile.email || 'Sem email'}`);
      console.log(`      Nome: ${profile.nome_completo || 'Sem nome'}`);
      console.log(`      ID: ${profile.id}`);
      console.log(`      tenant_id: ${profile.tenant_id || 'NULL'}\n`);
    });

    resultados.push({
      teste: 'Profiles sem tenant_id',
      valor: profilesSemTenant.length,
      status: 'PROBLEMA'
    });

    // 4. Perguntar se quer popular
    console.log('='.repeat(60));
    const resposta = await perguntarUsuario('\n💡 Deseja popular automaticamente os tenant_id? (s/n): ');

    if (resposta === 's' || resposta === 'sim' || resposta === 'y' || resposta === 'yes') {
      console.log('\n🔧 Populando tenant_id...\n');

      let sucessos = 0;
      let falhas = 0;

      for (const profile of profilesSemTenant) {
        const novoTenantId = crypto.randomUUID();

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ tenant_id: novoTenantId })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`   ❌ Falha ao atualizar ${profile.email}:`, updateError.message);
          falhas++;
        } else {
          console.log(`   ✅ ${profile.email} → tenant_id: ${novoTenantId.substring(0, 8)}...`);
          sucessos++;
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log(`\n📊 Resultado da atualização:`);
      console.log(`   Sucessos: ${sucessos}`);
      console.log(`   Falhas: ${falhas}\n`);

      if (falhas === 0) {
        console.log('🎉 TODOS OS PROFILES FORAM ATUALIZADOS!\n');
        resultados.push({ teste: 'Atualização de tenant_id', valor: sucessos, status: 'OK' });
      } else {
        console.log('⚠️  Algumas atualizações falharam. Verifique os erros acima.\n');
        resultados.push({ teste: 'Atualização de tenant_id', valor: `${sucessos}/${profilesSemTenant.length}`, status: 'PARCIAL' });
      }

      // Verificar novamente
      console.log('3️⃣ Verificando novamente...\n');

      const { data: verificacao } = await supabase
        .from('profiles')
        .select('id')
        .is('tenant_id', null);

      if (!verificacao || verificacao.length === 0) {
        console.log('✅ Confirmado: Todos os profiles têm tenant_id!\n');
      } else {
        console.log(`⚠️  Ainda existem ${verificacao.length} profiles sem tenant_id\n`);
      }

    } else {
      console.log('\n⏭️  Atualização pulada pelo usuário.\n');
      console.log('💡 Para popular depois, execute:');
      console.log('   node validar-tenant-id-profiles.mjs\n');
    }

    // Salvar relatório
    const relatorio = `# Relatório de Validação de tenant_id

**Data:** ${new Date().toLocaleString('pt-BR')}

## Resultados

- **Total de profiles:** ${allProfiles.length}
- **Profiles sem tenant_id:** ${profilesSemTenant.length}

## Profiles Sem tenant_id

${profilesSemTenant.map((p, i) => `${i + 1}. **${p.email || 'Sem email'}**
   - Nome: ${p.nome_completo || 'Sem nome'}
   - ID: ${p.id}
   - tenant_id: NULL
`).join('\n')}

## Status

${profilesSemTenant.length === 0 ? '✅ TODOS OS PROFILES TÊM tenant_id!' : `⚠️  ${profilesSemTenant.length} profiles precisam de tenant_id`}

## Próximos Passos

${profilesSemTenant.length > 0 ? 'Execute este script novamente e escolha "s" para popular automaticamente.' : 'Nenhuma ação necessária.'}
`;

    writeFileSync('RELATORIO_TENANT_ID.md', relatorio);
    console.log('📄 Relatório salvo em: RELATORIO_TENANT_ID.md\n');

    return profilesSemTenant.length === 0;

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
    return false;
  }
}

validar();

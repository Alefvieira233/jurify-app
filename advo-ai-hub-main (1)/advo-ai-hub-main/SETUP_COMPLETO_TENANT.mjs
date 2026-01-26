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

console.log('🔧 SETUP COMPLETO DO TENANT - RESOLVENDO RLS\n');
console.log('═'.repeat(60));

async function setupCompleto() {
  try {
    // 1. VERIFICAR SE JÁ EXISTE TENANT
    console.log('\n1️⃣ Verificando tenants existentes...');
    const { data: tenantsExistentes, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);

    let tenantId;

    if (!tenantsError && tenantsExistentes && tenantsExistentes.length > 0) {
      tenantId = tenantsExistentes[0].id;
      console.log(`✅ Tenant encontrado: ${tenantId}`);
      console.log(`   Nome: ${tenantsExistentes[0].name || 'N/A'}`);
    } else {
      // Criar novo tenant
      console.log('⚠️ Nenhum tenant encontrado. Criando novo tenant...');

      const newTenantId = crypto.randomUUID();
      const { data: novoTenant, error: createTenantError } = await supabase
        .from('tenants')
        .insert({
          id: newTenantId,
          name: 'Jurify Demo',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createTenantError) {
        console.error('❌ Erro ao criar tenant:', createTenantError.message);
        throw createTenantError;
      }

      tenantId = newTenantId;
      console.log(`✅ Tenant criado: ${tenantId}`);
    }

    // 2. VERIFICAR/CRIAR PROFILE
    console.log('\n2️⃣ Verificando profiles existentes...');
    const { data: profilesExistentes, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    let userId;

    if (!profilesError && profilesExistentes && profilesExistentes.length > 0) {
      userId = profilesExistentes[0].id;
      console.log(`✅ Profile encontrado: ${userId}`);

      // Atualizar profile com tenant_id se necessário
      if (profilesExistentes[0].tenant_id !== tenantId) {
        console.log('   → Atualizando tenant_id do profile...');
        await supabase
          .from('profiles')
          .update({ tenant_id: tenantId })
          .eq('id', userId);
        console.log('   ✅ Profile atualizado com tenant_id');
      }
    } else {
      console.log('⚠️ Nenhum profile encontrado.');
      console.log('ℹ️  Para criar um profile, você precisa fazer signup na aplicação.');
      console.log('ℹ️  Por agora, vou criar um profile temporário para teste.');

      const tempUserId = crypto.randomUUID();
      const { data: novoProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: tempUserId,
          tenant_id: tenantId,
          email: 'admin@jurify.demo',
          role: 'admin',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createProfileError) {
        console.error('❌ Erro ao criar profile:', createProfileError.message);
        throw createProfileError;
      }

      userId = tempUserId;
      console.log(`✅ Profile temporário criado: ${userId}`);
    }

    // 3. ATUALIZAR LEADS COM TENANT_ID
    console.log('\n3️⃣ Atualizando leads sem tenant_id...');
    const { data: leadsAtualizados, error: updateLeadsError } = await supabase
      .from('leads')
      .update({ tenant_id: tenantId })
      .is('tenant_id', null)
      .select();

    if (updateLeadsError) {
      console.error('❌ Erro ao atualizar leads:', updateLeadsError.message);
      throw updateLeadsError;
    }

    console.log(`✅ ${leadsAtualizados?.length || 0} leads atualizados com tenant_id!`);

    // 4. ATUALIZAR OUTRAS TABELAS (agendamentos, contratos, etc)
    console.log('\n4️⃣ Atualizando outras tabelas...');

    // Agendamentos
    try {
      const { data: agendamentosAtualizados, error: agendamentosError } = await supabase
        .from('agendamentos')
        .update({ tenant_id: tenantId })
        .is('tenant_id', null)
        .select();

      if (!agendamentosError) {
        console.log(`   ✅ Agendamentos: ${agendamentosAtualizados?.length || 0} atualizados`);
      }
    } catch (e) {
      console.log('   ⚠️ Agendamentos: tabela pode não ter coluna tenant_id');
    }

    // Contratos
    try {
      const { data: contratosAtualizados, error: contratosError } = await supabase
        .from('contratos')
        .update({ tenant_id: tenantId })
        .is('tenant_id', null)
        .select();

      if (!contratosError) {
        console.log(`   ✅ Contratos: ${contratosAtualizados?.length || 0} atualizados`);
      }
    } catch (e) {
      console.log('   ⚠️ Contratos: tabela pode não ter coluna tenant_id');
    }

    // Agentes IA
    try {
      const { data: agentesAtualizados, error: agentesError } = await supabase
        .from('agentes_ia')
        .update({ tenant_id: tenantId })
        .is('tenant_id', null)
        .select();

      if (!agentesError) {
        console.log(`   ✅ Agentes IA: ${agentesAtualizados?.length || 0} atualizados`);
      }
    } catch (e) {
      console.log('   ⚠️ Agentes IA: tabela pode não ter coluna tenant_id');
    }

    // 5. VERIFICAÇÃO FINAL
    console.log('\n' + '═'.repeat(60));
    console.log('5️⃣ VERIFICAÇÃO FINAL:\n');

    const { data: todosLeads, error: verifyError } = await supabase
      .from('leads')
      .select('id, nome, tenant_id, status');

    if (!verifyError && todosLeads) {
      console.log(`📊 Total de leads: ${todosLeads.length}`);
      console.log(`✅ Leads com tenant_id: ${todosLeads.filter(l => l.tenant_id).length}`);
      console.log(`❌ Leads SEM tenant_id: ${todosLeads.filter(l => !l.tenant_id).length}`);

      if (todosLeads.length > 0) {
        console.log('\n📋 Exemplo de lead:');
        console.log(`   ID: ${todosLeads[0].id}`);
        console.log(`   Nome: ${todosLeads[0].nome}`);
        console.log(`   Tenant ID: ${todosLeads[0].tenant_id}`);
        console.log(`   Status: ${todosLeads[0].status}`);
      }
    }

    // Contar outras tabelas
    const { count: agendamentosCount } = await supabase
      .from('agendamentos')
      .select('*', { count: 'exact', head: true });

    const { count: contratosCount } = await supabase
      .from('contratos')
      .select('*', { count: 'exact', head: true });

    const { count: agentesCount } = await supabase
      .from('agentes_ia')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 TOTAIS POR TABELA:');
    console.log(`   Leads: ${todosLeads?.length || 0}`);
    console.log(`   Agendamentos: ${agendamentosCount || 0}`);
    console.log(`   Contratos: ${contratosCount || 0}`);
    console.log(`   Agentes IA: ${agentesCount || 0}`);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ SETUP COMPLETO!');
    console.log('\n📋 INFORMAÇÕES IMPORTANTES:');
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   User ID: ${userId}`);
    console.log('\n🔐 PRÓXIMOS PASSOS:');
    console.log('   1. Acesse http://localhost:8080');
    console.log('   2. Faça login com qualquer conta');
    console.log('   3. O Dashboard agora deve mostrar os dados!');
    console.log('\n💡 DICA: Se ainda não aparecer, você pode precisar:');
    console.log('   - Fazer logout e login novamente');
    console.log('   - Limpar cache do navegador (Ctrl+Shift+R)');
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  }
}

setupCompleto();

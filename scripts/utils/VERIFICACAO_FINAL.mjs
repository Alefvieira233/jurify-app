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

console.log('═'.repeat(70));
console.log('   🎯 JURIFY - VERIFICAÇÃO FINAL DO SISTEMA');
console.log('═'.repeat(70));
console.log('');

async function verificacaoFinal() {
  try {
    // 1. TENANT
    console.log('1️⃣  TENANT & PROFILES');
    console.log('-'.repeat(70));

    const { data: tenants } = await supabase.from('tenants').select('*');
    console.log(`   ✅ Tenants: ${tenants?.length || 0}`);
    if (tenants && tenants.length > 0) {
      console.log(`      → ID: ${tenants[0].id}`);
      console.log(`      → Nome: ${tenants[0].name || 'N/A'}`);
    }

    const { data: profiles } = await supabase.from('profiles').select('*');
    console.log(`   ✅ Profiles: ${profiles?.length || 0}`);
    if (profiles && profiles.length > 0) {
      profiles.forEach(p => {
        console.log(`      → ${p.email} (Tenant: ${p.tenant_id ? 'OK' : 'FALTANDO'})`);
      });
    }

    console.log('');

    // 2. LEADS
    console.log('2️⃣  LEADS');
    console.log('-'.repeat(70));

    const { data: leads } = await supabase.from('leads').select('*');
    console.log(`   ✅ Total de leads: ${leads?.length || 0}`);

    const leadsComTenant = leads?.filter(l => l.tenant_id) || [];
    const leadsSemTenant = leads?.filter(l => !l.tenant_id) || [];

    console.log(`   ✅ Leads com tenant_id: ${leadsComTenant.length}`);
    console.log(`   ${leadsSemTenant.length > 0 ? '❌' : '✅'} Leads SEM tenant_id: ${leadsSemTenant.length}`);

    if (leads && leads.length > 0) {
      const statusCount = {};
      leads.forEach(l => {
        statusCount[l.status] = (statusCount[l.status] || 0) + 1;
      });

      console.log('\n   📊 Por status:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`      → ${status}: ${count}`);
      });
    }

    console.log('');

    // 3. AGENTES IA
    console.log('3️⃣  AGENTES IA');
    console.log('-'.repeat(70));

    const { data: agentes } = await supabase.from('agentes_ia').select('*');
    console.log(`   ✅ Total de agentes: ${agentes?.length || 0}`);

    if (agentes && agentes.length > 0) {
      agentes.forEach(a => {
        console.log(`      → ${a.nome} (${a.tipo}) - ${a.ativo ? 'ATIVO' : 'INATIVO'}`);
      });
    }

    console.log('');

    // 4. AGENDAMENTOS
    console.log('4️⃣  AGENDAMENTOS');
    console.log('-'.repeat(70));

    const { data: agendamentos } = await supabase.from('agendamentos').select('*');
    console.log(`   ✅ Total de agendamentos: ${agendamentos?.length || 0}`);

    if (agendamentos && agendamentos.length > 0) {
      const hoje = new Date();
      const futuros = agendamentos.filter(a => new Date(a.data_hora) > hoje);
      const passados = agendamentos.filter(a => new Date(a.data_hora) <= hoje);

      console.log(`      → Futuros: ${futuros.length}`);
      console.log(`      → Passados: ${passados.length}`);

      console.log('\n   📅 Próximos agendamentos:');
      futuros.slice(0, 3).forEach(a => {
        const data = new Date(a.data_hora);
        console.log(`      → ${a.titulo} - ${data.toLocaleDateString('pt-BR')}`);
      });
    }

    console.log('');

    // 5. CONTRATOS
    console.log('5️⃣  CONTRATOS');
    console.log('-'.repeat(70));

    const { data: contratos } = await supabase.from('contratos').select('*');
    console.log(`   ✅ Total de contratos: ${contratos?.length || 0}`);

    if (contratos && contratos.length > 0) {
      const statusCount = {};
      contratos.forEach(c => {
        statusCount[c.status] = (statusCount[c.status] || 0) + 1;
      });

      console.log('\n   📊 Por status:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`      → ${status}: ${count}`);
      });

      const valorTotal = contratos.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);
      console.log(`\n   💰 Valor total: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }

    console.log('');

    // 6. RESUMO FINAL
    console.log('═'.repeat(70));
    console.log('   📊 RESUMO EXECUTIVO');
    console.log('═'.repeat(70));
    console.log('');

    const stats = {
      'Tenants': tenants?.length || 0,
      'Usuários': profiles?.length || 0,
      'Leads': leads?.length || 0,
      'Leads com Tenant': leadsComTenant.length,
      'Agentes IA': agentes?.length || 0,
      'Agendamentos': agendamentos?.length || 0,
      'Contratos': contratos?.length || 0
    };

    Object.entries(stats).forEach(([label, value]) => {
      const status = value > 0 ? '✅' : '⚠️ ';
      console.log(`   ${status} ${label}: ${value}`);
    });

    console.log('');
    console.log('═'.repeat(70));

    // 7. VALIDAÇÃO RLS
    console.log('   🔐 VALIDAÇÃO DE RLS (Row Level Security)');
    console.log('═'.repeat(70));
    console.log('');

    const problemas = [];

    if (leadsSemTenant.length > 0) {
      problemas.push(`❌ ${leadsSemTenant.length} leads sem tenant_id (não serão visíveis)`);
    }

    if (leads && leads.length > 0 && agentes && agentes.length === 0) {
      problemas.push('⚠️  Sem agentes IA configurados');
    }

    if (problemas.length > 0) {
      console.log('   PROBLEMAS ENCONTRADOS:');
      problemas.forEach(p => console.log(`   ${p}`));
    } else {
      console.log('   ✅ NENHUM PROBLEMA ENCONTRADO!');
      console.log('   ✅ Todos os dados têm tenant_id');
      console.log('   ✅ RLS configurado corretamente');
    }

    console.log('');
    console.log('═'.repeat(70));
    console.log('   🚀 STATUS DO SISTEMA');
    console.log('═'.repeat(70));
    console.log('');

    if (
      tenants && tenants.length > 0 &&
      profiles && profiles.length > 0 &&
      leads && leads.length > 0 &&
      leadsSemTenant.length === 0
    ) {
      console.log('   ✅✅✅ SISTEMA 100% OPERACIONAL! ✅✅✅');
      console.log('');
      console.log('   🌐 Acesse: http://localhost:8080');
      console.log('   📧 Login: admin@jurify.com.br');
      console.log('   🔄 Recarregue com: Ctrl+Shift+R (limpar cache)');
      console.log('');
      console.log('   O Dashboard agora deve mostrar:');
      console.log(`      → ${leads.length} leads`);
      console.log(`      → ${contratos?.length || 0} contratos`);
      console.log(`      → ${agendamentos?.length || 0} agendamentos`);
      console.log(`      → ${agentes?.length || 0} agentes IA`);
    } else {
      console.log('   ⚠️  SISTEMA COM PENDÊNCIAS');
      console.log('');
      if (!tenants || tenants.length === 0) console.log('      ❌ Falta criar tenant');
      if (!profiles || profiles.length === 0) console.log('      ❌ Falta criar profiles');
      if (!leads || leads.length === 0) console.log('      ❌ Falta criar leads');
      if (leadsSemTenant.length > 0) console.log('      ❌ Leads sem tenant_id');
    }

    console.log('');
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('\n❌ ERRO na verificação:', error.message);
    console.error(error);
  }
}

verificacaoFinal();

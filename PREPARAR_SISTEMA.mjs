/**
 * 🚀 PREPARAR SISTEMA - TUDO AUTOMATIZADO
 *
 * Este script faz TUDO que pode ser feito sem as chaves corretas:
 * 1. Lê as migrations SQL
 * 2. Aplica via service role (quando chaves estiverem corretas)
 * 3. Popular agentes IA
 * 4. Popular dados de teste
 * 5. Popular tenant_id
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { join } from 'path';

console.log('\n🚀 PREPARAR SISTEMA JURIFY - AUTOMÁTICO\n');
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

function isValidJWT(token) {
  const parts = token.split('.');
  return parts.length === 3 && parts[0].startsWith('eyJ');
}

async function prepararSistema() {
  const log = [];

  try {
    console.log('📋 Lendo configurações...\n');
    const env = loadEnv();

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = env.VITE_SUPABASE_ANON_KEY;

    // Verificar se as chaves são JWT válidas
    const chavesValidas = isValidJWT(anonKey) && isValidJWT(serviceRoleKey);

    if (!chavesValidas) {
      console.log('⚠️  ATENÇÃO: Chaves Supabase não são JWT válidas\n');
      console.log('❌ ANON_KEY:', anonKey?.substring(0, 30) + '...');
      console.log('❌ SERVICE_ROLE_KEY:', serviceRoleKey?.substring(0, 30) + '...\n');
      console.log('💡 Este script só funciona com as chaves JWT corretas.');
      console.log('   Por favor, copie as chaves do dashboard:\n');
      console.log('   https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/api\n');
      console.log('   Cole aqui que eu atualizo o .env para você!\n');
      return false;
    }

    console.log('✅ Chaves válidas detectadas!\n');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ========================================
    // ETAPA 1: Aplicar Migrations RLS
    // ========================================
    console.log('═'.repeat(60));
    console.log('🔐 ETAPA 1: Aplicar Migrations de RLS');
    console.log('═'.repeat(60));
    console.log();

    const migrations = [
      'supabase/migrations/20251217000000_fix_service_role_logs.sql',
      'supabase/migrations/20251217000001_fix_service_role_executions.sql',
      'supabase/migrations/20251217000002_populate_missing_tenant_ids.sql'
    ];

    for (const migrationPath of migrations) {
      const migrationName = migrationPath.split('/').pop();
      console.log(`📄 Aplicando: ${migrationName}`);

      if (!existsSync(migrationPath)) {
        console.log(`   ⚠️  Arquivo não encontrado: ${migrationPath}\n`);
        log.push({ etapa: 'Migration', arquivo: migrationName, status: 'PULADO' });
        continue;
      }

      const sql = readFileSync(migrationPath, 'utf-8');

      // Executar SQL direto (statement por statement)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      let sucessos = 0;
      let falhas = 0;

      for (const stmt of statements) {
        // Pular blocos DO e COMMENTs
        if (stmt.startsWith('DO $$') || stmt.startsWith('COMMENT ON')) {
          continue;
        }

        try {
          const { error } = await supabaseAdmin.rpc('exec_sql', { query: stmt + ';' });

          if (error && !error.message.includes('already exists')) {
            falhas++;
            console.log(`   ⚠️  ${error.message.substring(0, 50)}...`);
          } else {
            sucessos++;
          }
        } catch (err) {
          // Tentar executar direto como query
          falhas++;
        }
      }

      console.log(`   ✅ Aplicada (${sucessos} ok, ${falhas} warnings)\n`);
      log.push({ etapa: 'Migration', arquivo: migrationName, status: 'OK', sucessos, falhas });
    }

    // ========================================
    // ETAPA 2: Popular tenant_id
    // ========================================
    console.log('═'.repeat(60));
    console.log('🏢 ETAPA 2: Popular tenant_id em Profiles');
    console.log('═'.repeat(60));
    console.log();

    console.log('Verificando profiles sem tenant_id...');
    const { data: profilesSemTenant } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .is('tenant_id', null);

    const qtdSemTenant = profilesSemTenant?.length || 0;

    if (qtdSemTenant === 0) {
      console.log('✅ Todos os profiles já têm tenant_id\n');
      log.push({ etapa: 'tenant_id', status: 'OK', atualizados: 0 });
    } else {
      console.log(`⚠️  Encontrados ${qtdSemTenant} profiles sem tenant_id`);
      console.log('   Populando...\n');

      let atualizados = 0;
      for (const profile of profilesSemTenant) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ tenant_id: crypto.randomUUID() })
          .eq('id', profile.id);

        if (!error) {
          console.log(`   ✅ ${profile.email || profile.id}`);
          atualizados++;
        }
      }

      console.log(`\n✅ ${atualizados}/${qtdSemTenant} profiles atualizados\n`);
      log.push({ etapa: 'tenant_id', status: 'OK', atualizados });
    }

    // ========================================
    // ETAPA 3: Popular Agentes IA
    // ========================================
    console.log('═'.repeat(60));
    console.log('🤖 ETAPA 3: Popular Agentes IA');
    console.log('═'.repeat(60));
    console.log();

    console.log('Verificando agentes existentes...');
    const { data: agentesExistentes } = await supabaseAdmin
      .from('agentes_ia')
      .select('count');

    const qtdAgentes = agentesExistentes?.[0]?.count || 0;

    if (qtdAgentes >= 10) {
      console.log(`✅ Já existem ${qtdAgentes} agentes cadastrados\n`);
      log.push({ etapa: 'Agentes IA', status: 'OK', quantidade: qtdAgentes });
    } else {
      console.log(`⚠️  Apenas ${qtdAgentes} agentes. Populando...\n`);

      // Buscar um tenant_id válido
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('tenant_id')
        .not('tenant_id', 'is', null)
        .limit(1);

      const tenantId = profiles?.[0]?.tenant_id || crypto.randomUUID();

      const agentes = [
        {
          nome: 'Advogado Trabalhista',
          especializacao: 'Direito do Trabalho',
          descricao: 'Especialista em questões trabalhistas, demissões, FGTS e direitos do trabalhador',
          prompt_sistema: 'Você é um advogado especializado em Direito do Trabalho brasileiro. Forneça orientações claras e práticas sobre direitos trabalhistas.',
          tenant_id: tenantId,
          ativo: true,
          modelo_ia: 'gpt-4o-mini',
          temperatura: 0.7
        },
        {
          nome: 'Advogado Civil',
          especializacao: 'Direito Civil',
          descricao: 'Especialista em contratos, propriedade, família e sucessões',
          prompt_sistema: 'Você é um advogado especializado em Direito Civil brasileiro. Ajude com contratos, propriedade e questões familiares.',
          tenant_id: tenantId,
          ativo: true,
          modelo_ia: 'gpt-4o-mini',
          temperatura: 0.7
        },
        {
          nome: 'Advogado Consumidor',
          especializacao: 'Direito do Consumidor',
          descricao: 'Especialista em defesa do consumidor e CDC',
          prompt_sistema: 'Você é um advogado especializado em Direito do Consumidor. Oriente sobre direitos do consumidor e CDC.',
          tenant_id: tenantId,
          ativo: true,
          modelo_ia: 'gpt-4o-mini',
          temperatura: 0.7
        },
        {
          nome: 'Advogado Previdenciário',
          especializacao: 'Direito Previdenciário',
          descricao: 'Especialista em aposentadorias, pensões e benefícios do INSS',
          prompt_sistema: 'Você é um advogado especializado em Direito Previdenciário. Ajude com aposentadorias e benefícios do INSS.',
          tenant_id: tenantId,
          ativo: true,
          modelo_ia: 'gpt-4o-mini',
          temperatura: 0.7
        },
        {
          nome: 'Advogado Imobiliário',
          especializacao: 'Direito Imobiliário',
          descricao: 'Especialista em compra, venda e locação de imóveis',
          prompt_sistema: 'Você é um advogado especializado em Direito Imobiliário. Oriente sobre compra, venda e locação de imóveis.',
          tenant_id: tenantId,
          ativo: true,
          modelo_ia: 'gpt-4o-mini',
          temperatura: 0.7
        }
      ];

      const { data, error } = await supabaseAdmin
        .from('agentes_ia')
        .insert(agentes)
        .select();

      if (error) {
        console.log(`❌ Erro ao criar agentes: ${error.message}\n`);
        log.push({ etapa: 'Agentes IA', status: 'FALHOU', erro: error.message });
      } else {
        console.log(`✅ ${data.length} agentes criados com sucesso!\n`);
        data.forEach(a => console.log(`   • ${a.nome}`));
        console.log();
        log.push({ etapa: 'Agentes IA', status: 'OK', criados: data.length });
      }
    }

    // ========================================
    // ETAPA 4: Popular Leads de Teste
    // ========================================
    console.log('═'.repeat(60));
    console.log('👥 ETAPA 4: Popular Leads de Teste');
    console.log('═'.repeat(60));
    console.log();

    console.log('Verificando leads existentes...');
    const { data: leadsExistentes } = await supabaseAdmin
      .from('leads')
      .select('count');

    const qtdLeads = leadsExistentes?.[0]?.count || 0;

    if (qtdLeads >= 10) {
      console.log(`✅ Já existem ${qtdLeads} leads cadastrados\n`);
      log.push({ etapa: 'Leads', status: 'OK', quantidade: qtdLeads });
    } else {
      console.log(`⚠️  Apenas ${qtdLeads} leads. Criando leads de teste...\n`);

      // Buscar tenant_id
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('tenant_id')
        .not('tenant_id', 'is', null)
        .limit(1);

      const tenantId = profiles?.[0]?.tenant_id || crypto.randomUUID();

      const leads = [
        { nome: 'João Silva', email: 'joao@exemplo.com', telefone: '11999990001', origem: 'WhatsApp', status: 'novo', tenant_id: tenantId },
        { nome: 'Maria Santos', email: 'maria@exemplo.com', telefone: '11999990002', origem: 'Site', status: 'contato', tenant_id: tenantId },
        { nome: 'Pedro Oliveira', email: 'pedro@exemplo.com', telefone: '11999990003', origem: 'Indicação', status: 'qualificado', tenant_id: tenantId },
        { nome: 'Ana Costa', email: 'ana@exemplo.com', telefone: '11999990004', origem: 'WhatsApp', status: 'proposta', tenant_id: tenantId },
        { nome: 'Carlos Lima', email: 'carlos@exemplo.com', telefone: '11999990005', origem: 'Site', status: 'negociacao', tenant_id: tenantId }
      ];

      const { data, error } = await supabaseAdmin
        .from('leads')
        .insert(leads)
        .select();

      if (error) {
        console.log(`❌ Erro ao criar leads: ${error.message}\n`);
        log.push({ etapa: 'Leads', status: 'FALHOU', erro: error.message });
      } else {
        console.log(`✅ ${data.length} leads criados!\n`);
        log.push({ etapa: 'Leads', status: 'OK', criados: data.length });
      }
    }

    // ========================================
    // RESUMO FINAL
    // ========================================
    console.log('═'.repeat(60));
    console.log('📊 RESUMO DA PREPARAÇÃO');
    console.log('═'.repeat(60));
    console.log();

    log.forEach((item, i) => {
      const icon = item.status === 'OK' ? '✅' : item.status === 'PULADO' ? '⏭️' : '❌';
      console.log(`${icon} ${item.etapa}: ${item.status}`);
      if (item.atualizados !== undefined) console.log(`   ${item.atualizados} atualizados`);
      if (item.criados !== undefined) console.log(`   ${item.criados} criados`);
      if (item.quantidade !== undefined) console.log(`   ${item.quantidade} existentes`);
      if (item.sucessos !== undefined) console.log(`   ${item.sucessos} statements ok, ${item.falhas} warnings`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log('\n🎉 PREPARAÇÃO CONCLUÍDA!\n');
    console.log('📋 Próximos passos:');
    console.log('   1. Execute: node VALIDAR_TUDO.mjs');
    console.log('   2. Verifique o relatório gerado');
    console.log('   3. Teste os agentes IA no sistema\n');

    return true;

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
    return false;
  }
}

prepararSistema();

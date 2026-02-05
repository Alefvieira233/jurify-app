/**
 * 🔍 DIAGNÓSTICO COMPLETO DO SISTEMA JURIFY
 *
 * Testa TODAS as funcionalidades e gera checklist do que falta
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

console.log('\n🔍 DIAGNÓSTICO COMPLETO - JURIFY v2.0\n');
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

async function diagnosticar() {
  const checklist = {
    infraestrutura: [],
    backend: [],
    frontend: [],
    integrações: [],
    agentesIA: []
  };

  try {
    console.log('📋 Carregando configurações...\n');
    const env = loadEnv();

    // ========================================
    // CATEGORIA 1: INFRAESTRUTURA
    // ========================================
    console.log('═'.repeat(60));
    console.log('📦 CATEGORIA 1: INFRAESTRUTURA');
    console.log('═'.repeat(60));
    console.log();

    // 1.1 Arquivo .env existe
    console.log('1.1 Verificando arquivo .env...');
    const envExiste = existsSync('.env');
    console.log(envExiste ? '   ✅ Arquivo .env existe' : '   ❌ Arquivo .env não encontrado');
    checklist.infraestrutura.push({
      item: 'Arquivo .env',
      status: envExiste ? 'OK' : 'FALTANDO',
      critico: true
    });

    // 1.2 Supabase URL
    console.log('\n1.2 Verificando Supabase URL...');
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const urlValida = supabaseUrl && supabaseUrl.includes('supabase.co');
    console.log(urlValida ? `   ✅ URL configurada: ${supabaseUrl}` : '   ❌ URL inválida ou faltando');
    checklist.infraestrutura.push({
      item: 'Supabase URL',
      status: urlValida ? 'OK' : 'FALTANDO',
      critico: true
    });

    // 1.3 Supabase ANON Key
    console.log('\n1.3 Verificando Supabase ANON Key...');
    const anonKey = env.VITE_SUPABASE_ANON_KEY;
    const anonValida = anonKey && isValidJWT(anonKey);
    console.log(anonValida ? '   ✅ ANON Key válida (JWT)' : '   ❌ ANON Key inválida ou não é JWT');
    checklist.infraestrutura.push({
      item: 'Supabase ANON Key (JWT)',
      status: anonValida ? 'OK' : 'INCORRETA',
      critico: true
    });

    // 1.4 Supabase Service Role Key
    console.log('\n1.4 Verificando Supabase Service Role Key...');
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const serviceRoleValida = serviceRoleKey && isValidJWT(serviceRoleKey);
    console.log(serviceRoleValida ? '   ✅ Service Role Key válida (JWT)' : '   ❌ Service Role Key inválida ou não é JWT');
    checklist.infraestrutura.push({
      item: 'Supabase Service Role Key (JWT)',
      status: serviceRoleValida ? 'OK' : 'INCORRETA',
      critico: true
    });

    // 1.5 OpenAI API Key
    console.log('\n1.5 Verificando OpenAI API Key...');
    const openaiKey = env.OPENAI_API_KEY;
    const openaiValida = openaiKey && openaiKey.startsWith('sk-');
    console.log(openaiValida ? '   ✅ OpenAI API Key configurada' : '   ❌ OpenAI API Key faltando ou inválida');
    checklist.infraestrutura.push({
      item: 'OpenAI API Key',
      status: openaiValida ? 'OK' : 'FALTANDO',
      critico: true
    });

    // Se chaves não são válidas, pular testes de conexão
    if (!urlValida || !anonValida || !serviceRoleValida) {
      console.log('\n⚠️  Chaves inválidas. Pulando testes de conexão.\n');

      // Adicionar testes pulados
      checklist.backend.push({ item: 'Conexão com Supabase', status: 'PULADO', critico: true });
      checklist.backend.push({ item: 'Tabelas do banco', status: 'PULADO', critico: true });
      checklist.backend.push({ item: 'RLS Policies', status: 'PULADO', critico: true });
      checklist.backend.push({ item: 'Dados de teste', status: 'PULADO', critico: false });
      checklist.agentesIA.push({ item: 'Edge Functions', status: 'PULADO', critico: true });
      checklist.agentesIA.push({ item: 'Agentes IA cadastrados', status: 'PULADO', critico: true });

      gerarResumo(checklist);
      return;
    }

    // ========================================
    // CATEGORIA 2: BACKEND (BANCO DE DADOS)
    // ========================================
    console.log('\n═'.repeat(60));
    console.log('🗄️  CATEGORIA 2: BACKEND (BANCO DE DADOS)');
    console.log('═'.repeat(60));
    console.log();

    const supabase = createClient(supabaseUrl, anonKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 2.1 Conexão com Supabase
    console.log('2.1 Testando conexão com Supabase...');
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      console.log('   ✅ Conexão estabelecida com sucesso');
      checklist.backend.push({ item: 'Conexão com Supabase', status: 'OK', critico: true });
    } catch (err) {
      console.log(`   ❌ Erro na conexão: ${err.message}`);
      checklist.backend.push({ item: 'Conexão com Supabase', status: 'FALHOU', critico: true });
    }

    // 2.2 Verificar tabelas principais
    console.log('\n2.2 Verificando tabelas principais...');
    const tabelas = [
      'profiles',
      'leads',
      'contratos',
      'agendamentos',
      'agentes_ia',
      'logs_execucao_agentes',
      'agent_executions',
      'agent_ai_logs',
      'user_roles',
      'notificacoes'
    ];

    let tabelasOK = 0;
    for (const tabela of tabelas) {
      try {
        const { error } = await supabase.from(tabela).select('count').limit(1);
        if (!error) {
          console.log(`   ✅ ${tabela}`);
          tabelasOK++;
        } else {
          console.log(`   ❌ ${tabela}: ${error.message}`);
        }
      } catch (err) {
        console.log(`   ❌ ${tabela}: erro`);
      }
    }

    checklist.backend.push({
      item: `Tabelas do banco (${tabelasOK}/${tabelas.length})`,
      status: tabelasOK === tabelas.length ? 'OK' : 'PARCIAL',
      critico: true
    });

    // 2.3 Verificar dados de teste
    console.log('\n2.3 Verificando dados de teste...');

    const { data: profiles } = await supabase.from('profiles').select('count');
    const { data: leads } = await supabase.from('leads').select('count');
    const { data: agentes } = await supabase.from('agentes_ia').select('count');

    const profilesCount = profiles?.[0]?.count || 0;
    const leadsCount = leads?.[0]?.count || 0;
    const agentesCount = agentes?.[0]?.count || 0;

    console.log(`   Profiles: ${profilesCount}`);
    console.log(`   Leads: ${leadsCount}`);
    console.log(`   Agentes IA: ${agentesCount}`);

    const temDados = profilesCount > 0 && agentesCount > 0;
    console.log(temDados ? '   ✅ Dados de teste existem' : '   ⚠️  Poucos dados de teste');

    checklist.backend.push({
      item: `Dados de teste (${profilesCount} users, ${leadsCount} leads, ${agentesCount} agentes)`,
      status: temDados ? 'OK' : 'FALTANDO',
      critico: false
    });

    // 2.4 Verificar tenant_id
    console.log('\n2.4 Verificando tenant_id em profiles...');
    const { data: profilesSemTenant } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .is('tenant_id', null);

    const qtdSemTenant = profilesSemTenant?.length || 0;
    console.log(qtdSemTenant === 0 ? '   ✅ Todos os profiles têm tenant_id' : `   ⚠️  ${qtdSemTenant} profiles sem tenant_id`);

    checklist.backend.push({
      item: 'tenant_id em profiles',
      status: qtdSemTenant === 0 ? 'OK' : 'FALTANDO',
      critico: true
    });

    // 2.5 Testar RLS Policies (service role insert)
    console.log('\n2.5 Testando RLS Policies (service role insert)...');

    const tabelasRLS = [
      { nome: 'logs_execucao_agentes', testData: { agente_id: '00000000-0000-0000-0000-000000000000', tenant_id: '00000000-0000-0000-0000-000000000000', status: 'test', input_usuario: 'test', output_agente: 'test', tokens_prompt: 0, tokens_completion: 0, tokens_total: 0, custo_usd: 0, tempo_execucao_ms: 0 }},
      { nome: 'agent_ai_logs', testData: { agent_id: 'test', tenant_id: '00000000-0000-0000-0000-000000000000', user_id: '00000000-0000-0000-0000-000000000000', prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, estimated_cost_usd: 0, execution_time_ms: 0, status: 'test', model: 'test' }},
      { nome: 'agent_executions', testData: { execution_id: 'test-' + Date.now(), tenant_id: '00000000-0000-0000-0000-000000000000', status: 'test', agents_involved: ['test'] }}
    ];

    let rlsOK = 0;
    for (const tabela of tabelasRLS) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tabela.nome)
          .insert([tabela.testData])
          .select();

        if (!error) {
          console.log(`   ✅ ${tabela.nome}: INSERT permitido`);
          // Limpar teste
          if (data && data[0]) {
            await supabaseAdmin.from(tabela.nome).delete().eq('id', data[0].id);
          }
          rlsOK++;
        } else {
          console.log(`   ❌ ${tabela.nome}: BLOQUEADO - ${error.message.substring(0, 50)}...`);
        }
      } catch (err) {
        console.log(`   ❌ ${tabela.nome}: ERRO - ${err.message.substring(0, 50)}...`);
      }
    }

    checklist.backend.push({
      item: `RLS Policies (${rlsOK}/${tabelasRLS.length} tabelas OK)`,
      status: rlsOK === tabelasRLS.length ? 'OK' : 'BLOQUEADO',
      critico: true
    });

    // ========================================
    // CATEGORIA 3: AGENTES IA (EDGE FUNCTIONS)
    // ========================================
    console.log('\n═'.repeat(60));
    console.log('🤖 CATEGORIA 3: AGENTES IA (EDGE FUNCTIONS)');
    console.log('═'.repeat(60));
    console.log();

    // 3.1 Verificar agentes cadastrados
    console.log('3.1 Verificando agentes IA cadastrados...');
    const { data: agentesData } = await supabase
      .from('agentes_ia')
      .select('id, nome, ativo')
      .eq('ativo', true);

    const qtdAgentes = agentesData?.length || 0;
    console.log(qtdAgentes > 0 ? `   ✅ ${qtdAgentes} agentes cadastrados` : '   ❌ Nenhum agente cadastrado');

    checklist.agentesIA.push({
      item: `Agentes IA cadastrados (${qtdAgentes})`,
      status: qtdAgentes > 0 ? 'OK' : 'FALTANDO',
      critico: true
    });

    // 3.2 Testar Edge Function (se tiver agentes)
    if (qtdAgentes > 0 && openaiValida) {
      console.log('\n3.2 Testando Edge Function agentes-ia-api...');
      try {
        const agente = agentesData[0];
        const startTime = Date.now();

        const { data: response, error } = await supabase.functions.invoke('agentes-ia-api', {
          body: {
            agente_id: agente.id,
            input_usuario: 'Teste diagnóstico',
            use_n8n: false
          }
        });

        const duracao = Date.now() - startTime;

        if (error) {
          console.log(`   ❌ Edge Function falhou: ${error.message}`);
          checklist.agentesIA.push({
            item: 'Edge Function agentes-ia-api',
            status: 'FALHOU',
            critico: true,
            erro: error.message
          });
        } else {
          console.log(`   ✅ Edge Function funcionando (${duracao}ms)`);
          checklist.agentesIA.push({
            item: `Edge Function agentes-ia-api (${duracao}ms)`,
            status: 'OK',
            critico: true
          });
        }
      } catch (err) {
        console.log(`   ❌ Erro: ${err.message}`);
        checklist.agentesIA.push({
          item: 'Edge Function agentes-ia-api',
          status: 'ERRO',
          critico: true,
          erro: err.message
        });
      }
    } else {
      console.log('\n3.2 Testando Edge Function agentes-ia-api...');
      console.log('   ⏭️  Pulado (sem agentes ou sem OpenAI key)');
      checklist.agentesIA.push({
        item: 'Edge Function agentes-ia-api',
        status: 'PULADO',
        critico: true
      });
    }

    // ========================================
    // CATEGORIA 4: FRONTEND
    // ========================================
    console.log('\n═'.repeat(60));
    console.log('🎨 CATEGORIA 4: FRONTEND');
    console.log('═'.repeat(60));
    console.log();

    // 4.1 Verificar componentes principais
    console.log('4.1 Verificando componentes principais...');
    const componentesPrincipais = [
      'src/App.tsx',
      'src/pages/Index.tsx',
      'src/features/ai-agents/AgentesIAManager.tsx',
      'src/features/ai-agents/EnhancedAIChat.tsx',
      'src/features/mission-control/MissionControl.tsx',
      'src/features/leads/LeadsPanel.tsx',
      'src/features/contracts/ContratosManager.tsx'
    ];

    let componentesOK = 0;
    for (const comp of componentesPrincipais) {
      const existe = existsSync(comp);
      console.log(existe ? `   ✅ ${comp}` : `   ❌ ${comp}`);
      if (existe) componentesOK++;
    }

    checklist.frontend.push({
      item: `Componentes principais (${componentesOK}/${componentesPrincipais.length})`,
      status: componentesOK === componentesPrincipais.length ? 'OK' : 'FALTANDO',
      critico: true
    });

    // 4.2 Verificar componentes faltantes (não críticos)
    console.log('\n4.2 Verificando componentes de formulário...');
    const componentesFormulario = [
      'src/features/users/NovoUsuarioForm.tsx',
      'src/features/users/EditarUsuarioForm.tsx',
      'src/features/users/GerenciarPermissoesForm.tsx',
      'src/features/settings/IntegracoesSection.tsx'
    ];

    let formulariosOK = 0;
    for (const comp of componentesFormulario) {
      const existe = existsSync(comp);
      console.log(existe ? `   ✅ ${comp}` : `   ⚠️  ${comp} (placeholder)`);
      if (existe) formulariosOK++;
    }

    checklist.frontend.push({
      item: `Formulários de usuário (${formulariosOK}/${componentesFormulario.length})`,
      status: formulariosOK === componentesFormulario.length ? 'OK' : 'FALTANDO',
      critico: false
    });

    // ========================================
    // CATEGORIA 5: INTEGRAÇÕES EXTERNAS
    // ========================================
    console.log('\n═'.repeat(60));
    console.log('🔌 CATEGORIA 5: INTEGRAÇÕES EXTERNAS');
    console.log('═'.repeat(60));
    console.log();

    console.log('5.1 Verificando credenciais de integrações...');

    const integracoes = [
      { nome: 'WhatsApp Z-API', vars: ['VITE_ZAPI_INSTANCE_ID', 'VITE_ZAPI_TOKEN'], critico: false },
      { nome: 'ZapSign', vars: ['VITE_ZAPSIGN_API_TOKEN'], critico: false },
      { nome: 'N8N', vars: ['VITE_N8N_API_KEY'], critico: false },
      { nome: 'Google Calendar', vars: ['VITE_GOOGLE_CLIENT_ID', 'VITE_GOOGLE_CLIENT_SECRET'], critico: false }
    ];

    for (const integ of integracoes) {
      const configurada = integ.vars.every(v => env[v] && env[v].length > 10);
      console.log(configurada ? `   ✅ ${integ.nome}` : `   ⚠️  ${integ.nome} (não configurada)`);

      checklist.integrações.push({
        item: integ.nome,
        status: configurada ? 'OK' : 'FALTANDO',
        critico: integ.critico
      });
    }

    // ========================================
    // RESUMO FINAL
    // ========================================
    gerarResumo(checklist);

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
  }
}

function gerarResumo(checklist) {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 RESUMO DO DIAGNÓSTICO');
  console.log('═'.repeat(60));
  console.log();

  // Contar status
  const todasCategorias = [
    ...checklist.infraestrutura,
    ...checklist.backend,
    ...checklist.agentesIA,
    ...checklist.frontend,
    ...checklist.integrações
  ];

  const total = todasCategorias.length;
  const ok = todasCategorias.filter(i => i.status === 'OK').length;
  const criticos = todasCategorias.filter(i => i.critico);
  const criticosOK = criticos.filter(i => i.status === 'OK').length;
  const criticosFalhos = criticos.filter(i => i.status !== 'OK' && i.status !== 'PULADO').length;

  // Por categoria
  console.log('📦 POR CATEGORIA:\n');

  const categorias = [
    { nome: 'Infraestrutura', items: checklist.infraestrutura },
    { nome: 'Backend', items: checklist.backend },
    { nome: 'Agentes IA', items: checklist.agentesIA },
    { nome: 'Frontend', items: checklist.frontend },
    { nome: 'Integrações', items: checklist.integrações }
  ];

  for (const cat of categorias) {
    const totalCat = cat.items.length;
    const okCat = cat.items.filter(i => i.status === 'OK').length;
    const percent = totalCat > 0 ? Math.round((okCat / totalCat) * 100) : 0;

    console.log(`   ${cat.nome}: ${okCat}/${totalCat} (${percent}%)`);
  }

  console.log('\n🎯 GERAL:\n');
  console.log(`   Total de itens: ${total}`);
  console.log(`   Itens OK: ${ok} ✅`);
  console.log(`   Itens com problema: ${total - ok} ❌`);
  console.log(`   Taxa de sucesso: ${Math.round((ok / total) * 100)}%`);

  console.log('\n🔴 CRÍTICOS:\n');
  console.log(`   Total críticos: ${criticos.length}`);
  console.log(`   Críticos OK: ${criticosOK} ✅`);
  console.log(`   Críticos falhando: ${criticosFalhos} ❌`);

  console.log('\n═'.repeat(60));

  // Avaliar status
  if (criticosFalhos === 0 && ok === total) {
    console.log('\n🎉 SISTEMA 100% PRONTO!\n');
    console.log('✅ Tudo funcionando perfeitamente');
    console.log('✅ Pode usar em produção\n');
  } else if (criticosFalhos === 0) {
    console.log('\n✅ SISTEMA FUNCIONAL (com pendências não críticas)\n');
    console.log(`⚠️  ${total - ok} item(ns) faltando mas não impedem uso\n`);
  } else {
    console.log('\n⚠️  SISTEMA COM PROBLEMAS CRÍTICOS\n');
    console.log(`❌ ${criticosFalhos} item(ns) críticos precisam ser corrigidos\n`);
  }

  // Lista de ações
  console.log('═'.repeat(60));
  console.log('🔧 AÇÕES NECESSÁRIAS:\n');

  let acaoNum = 1;

  // Infraestrutura
  const infraProblems = checklist.infraestrutura.filter(i => i.status !== 'OK');
  if (infraProblems.length > 0) {
    console.log(`${acaoNum}. INFRAESTRUTURA:`);
    infraProblems.forEach(p => {
      console.log(`   ❌ ${p.item}: ${p.status}`);
      if (p.item.includes('ANON Key') || p.item.includes('Service Role')) {
        console.log(`      → Copie as chaves JWT do Supabase Dashboard`);
        console.log(`      → https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/api`);
      }
    });
    console.log();
    acaoNum++;
  }

  // Backend
  const backendProblems = checklist.backend.filter(i => i.status !== 'OK' && i.status !== 'PULADO');
  if (backendProblems.length > 0) {
    console.log(`${acaoNum}. BACKEND:`);
    backendProblems.forEach(p => {
      console.log(`   ❌ ${p.item}: ${p.status}`);
      if (p.item.includes('RLS')) {
        console.log(`      → Execute: node aplicar-migrations.mjs`);
      }
      if (p.item.includes('tenant_id')) {
        console.log(`      → Execute: node validar-tenant-id-profiles.mjs`);
      }
    });
    console.log();
    acaoNum++;
  }

  // Agentes IA
  const agentesProblems = checklist.agentesIA.filter(i => i.status !== 'OK' && i.status !== 'PULADO');
  if (agentesProblems.length > 0) {
    console.log(`${acaoNum}. AGENTES IA:`);
    agentesProblems.forEach(p => {
      console.log(`   ❌ ${p.item}: ${p.status}`);
      if (p.item.includes('cadastrados')) {
        console.log(`      → Execute: node popular-agentes-ia.mjs`);
      }
      if (p.item.includes('Edge Function')) {
        console.log(`      → Verifique OPENAI_API_KEY no Supabase Secrets`);
        console.log(`      → Execute: node teste-completo-agentes-ia.mjs`);
      }
    });
    console.log();
    acaoNum++;
  }

  // Frontend
  const frontendProblems = checklist.frontend.filter(i => i.status !== 'OK' && i.critico);
  if (frontendProblems.length > 0) {
    console.log(`${acaoNum}. FRONTEND (CRÍTICO):`);
    frontendProblems.forEach(p => {
      console.log(`   ❌ ${p.item}: ${p.status}`);
    });
    console.log();
    acaoNum++;
  }

  console.log('═'.repeat(60));
  console.log();
  console.log('💡 COMANDO RÁPIDO PARA CORRIGIR:');
  console.log('   node VALIDAR_TUDO.mjs\n');
}

diagnosticar();

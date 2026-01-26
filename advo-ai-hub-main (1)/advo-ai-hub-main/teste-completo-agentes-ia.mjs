/**
 * 🧪 TESTE COMPLETO - AGENTES IA END-TO-END
 *
 * Testa o fluxo completo de execução de um agente IA
 */

import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

console.log('\n🧪 TESTE COMPLETO - AGENTES IA\n');
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
  Object.entries(process.env).forEach(([key, value]) => {
    if (value) env[key] = value;
  });
  return env;
}

async function testar() {
  const resultados = [];
  let startTime, endTime, duracao;

  try {
    console.log('📋 Carregando configurações...\n');
    const env = loadEnv();

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const anonKey = env.VITE_SUPABASE_ANON_KEY;
    const testEmail = env.TEST_USER_EMAIL || 'teste@jurify.com';
    const testPassword = env.TEST_USER_PASSWORD || 'teste123';

    const supabase = createClient(supabaseUrl, anonKey);

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('ƒ?O Falha no login de teste:', signInError.message);
      console.log('Execute: node criar-usuario-teste.mjs');
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      console.error('ƒ?O Nenhum tenant_id encontrado');
      if (profileError) console.error('   Erro:', profileError.message);
      return false;
    }

    // ========================================
    // TESTE 1: Buscar agente
    // ========================================
    console.log('1️⃣ Buscando agente IA...\n');

    const { data: agentes, error: agenteError } = await supabase
      .from('agentes_ia')
      .select('*')
      .eq('ativo', true)
      .eq('tenant_id', profile.tenant_id)
      .limit(1);

    if (agenteError || !agentes || agentes.length === 0) {
      console.error('❌ Nenhum agente encontrado');
      if (agenteError) console.error('   Erro:', agenteError.message);
      console.log('\n💡 Execute: node popular-agentes-ia.mjs\n');
      return false;
    }

    const agente = agentes[0];
    console.log(`✅ Agente encontrado: ${agente.nome}`);
    console.log(`   ID: ${agente.id}`);
    console.log(`   Especialização: ${agente.especializacao || 'Não especificada'}\n`);

    resultados.push({ teste: 'Buscar agente', status: 'OK', agente: agente.nome });

    // ========================================
    // TESTE 2: Chamar Edge Function
    // ========================================
    console.log('2️⃣ Chamando Edge Function...\n');

    const inputUsuario = 'Fui demitido sem justa causa. Tenho direito a FGTS e seguro-desemprego?';

    console.log(`   Agente: ${agente.nome}`);
    console.log(`   Input: "${inputUsuario}"\n`);

    startTime = Date.now();

    const systemPrompt = [
      agente.script_saudacao,
      agente.objetivo ? `Objetivo: ${agente.objetivo}` : null
    ].filter(Boolean).join('\n');

    const { data: response, error: execError } = await supabase.functions.invoke('ai-agent-processor', {
      body: {
        agentName: agente.nome,
        agentSpecialization: agente.area_juridica,
        systemPrompt,
        userPrompt: inputUsuario,
        tenantId: profile.tenant_id
      }
    });

    endTime = Date.now();
    duracao = endTime - startTime;

    if (execError) {
      console.error(`❌ Erro na execução: ${execError.message}\n`);

      if (execError.message.includes('401')) {
        console.error('💡 Erro 401: Problema de autenticação');
        console.error('   Verifique se as chaves Supabase estão corretas\n');
      } else if (execError.message.includes('500')) {
        console.error('💡 Erro 500: Problema no servidor');
        console.error('   Verifique os logs da Edge Function\n');
      }

      resultados.push({ teste: 'Chamar Edge Function', status: 'FALHOU', erro: execError.message });
      return false;
    }

    console.log(`✅ Edge Function respondeu em ${duracao}ms\n`);
    resultados.push({ teste: 'Chamar Edge Function', status: 'OK', duracao: `${duracao}ms` });

    // ========================================
    // TESTE 3: Validar resposta
    // ========================================
    console.log('3️⃣ Validando resposta...\n');

    if (!response) {
      console.error('❌ Resposta vazia\n');
      resultados.push({ teste: 'Validar resposta', status: 'FALHOU', erro: 'Resposta vazia' });
      return false;
    }

    console.log('📄 Resposta recebida:');
    console.log(JSON.stringify(response, null, 2));
    console.log();

    // Verificar se tem resposta do agente
    const temResposta = response.result || response.message;

    if (!temResposta) {
      console.error('❌ Resposta não contém output do agente\n');
      resultados.push({ teste: 'Validar resposta', status: 'FALHOU', erro: 'Sem output' });
      return false;
    }

    console.log('✅ Resposta contém output válido\n');
    resultados.push({ teste: 'Validar resposta', status: 'OK' });

    // ========================================
    // TESTE 4: Verificar logs
    // ========================================
    console.log('4️⃣ Verificando logs...\n');

    // Aguardar 2s para log ser inserido
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: logs, error: logError } = await supabase
      .from('agent_ai_logs')
      .select('*')
      .eq('agent_name', agente.nome)
      .order('created_at', { ascending: false })
      .limit(1);

    if (logError) {
      console.error(`⚠️  Erro ao buscar logs: ${logError.message}\n`);
      resultados.push({ teste: 'Verificar logs', status: 'ATENÇÃO', erro: logError.message });
    } else if (!logs || logs.length === 0) {
      console.log('⚠️  Nenhum log encontrado (pode ser normal se RLS ainda estiver bloqueando)\n');
      resultados.push({ teste: 'Verificar logs', status: 'ATENÇÃO', erro: 'Sem logs' });
    } else {
      const log = logs[0];
      console.log('✅ Log criado com sucesso!');
      console.log(`   Status: ${log.status}`);
      console.log(`   Tokens: ${log.total_tokens || 0}\n`);

      resultados.push({ teste: 'Verificar logs', status: 'OK' });
    }

    // ========================================
    // TESTE 5: Medir performance
    // ========================================
    console.log('5️⃣ Medindo performance...\n');

    const latenciaOK = duracao < 3000;  // < 3s
    const latenciaExcelente = duracao < 2000;  // < 2s

    if (latenciaExcelente) {
      console.log(`✅ Performance EXCELENTE: ${duracao}ms (<2s)\n`);
      resultados.push({ teste: 'Performance', status: 'EXCELENTE', duracao: `${duracao}ms` });
    } else if (latenciaOK) {
      console.log(`✅ Performance BOA: ${duracao}ms (<3s)\n`);
      resultados.push({ teste: 'Performance', status: 'OK', duracao: `${duracao}ms` });
    } else {
      console.log(`⚠️  Performance LENTA: ${duracao}ms (>3s)\n`);
      resultados.push({ teste: 'Performance', status: 'LENTO', duracao: `${duracao}ms` });
    }

    // ========================================
    // RESUMO FINAL
    // ========================================
    console.log('='.repeat(60));
    console.log('📊 RESUMO DO TESTE\n');

    const totalTestes = resultados.length;
    const testesOK = resultados.filter(r => r.status === 'OK' || r.status === 'EXCELENTE').length;
    const testesFalhos = resultados.filter(r => r.status === 'FALHOU').length;
    const testesAtencao = resultados.filter(r => r.status === 'ATENÇÃO' || r.status === 'LENTO').length;

    resultados.forEach((r, i) => {
      const icon = r.status === 'OK' || r.status === 'EXCELENTE' ? '✅' : r.status === 'FALHOU' ? '❌' : '⚠️';
      console.log(`${icon} ${r.teste}: ${r.status}`);
      if (r.erro) console.log(`   Erro: ${r.erro}`);
      if (r.duracao) console.log(`   Duração: ${r.duracao}`);
      if (r.agente) console.log(`   Agente: ${r.agente}`);
      if (r.tokens) console.log(`   Tokens: ${r.tokens}`);
    });

    console.log('\n' + '='.repeat(60));

    if (testesFalhos === 0 && testesAtencao === 0) {
      console.log('\n🎉 AGENTES IA FUNCIONANDO 100%!\n');
      console.log('✅ Todos os testes passaram com sucesso');
      console.log('✅ Performance excelente');
      console.log('✅ Logs sendo criados corretamente\n');
    } else if (testesFalhos === 0) {
      console.log('\n✅ AGENTES IA FUNCIONANDO!\n');
      console.log(`⚠️  ${testesAtencao} teste(s) com atenção`);
      console.log('   (não crítico, mas pode ser melhorado)\n');
    } else {
      console.log(`\n⚠️  ${testesFalhos}/${totalTestes} teste(s) falharam\n`);
      console.log('Corrija os problemas e execute novamente\n');
    }

    // Salvar relatório
    const relatorio = `# Relatório de Teste - Agentes IA

**Data:** ${new Date().toLocaleString('pt-BR')}

## Resultados

${resultados.map((r, i) => `### ${i + 1}. ${r.teste}
- **Status:** ${r.status}
${r.erro ? `- **Erro:** ${r.erro}` : ''}
${r.duracao ? `- **Duração:** ${r.duracao}` : ''}
${r.agente ? `- **Agente:** ${r.agente}` : ''}
${r.tokens ? `- **Tokens:** ${r.tokens}` : ''}
`).join('\n')}

## Resumo
- Total: ${totalTestes}
- Sucesso: ${testesOK}
- Falhas: ${testesFalhos}
- Atenção: ${testesAtencao}
- Taxa de sucesso: ${Math.round((testesOK / totalTestes) * 100)}%

${testesFalhos === 0 ? '## ✅ Resultado: AGENTES IA FUNCIONANDO!' : '## ⚠️ Resultado: CORREÇÕES NECESSÁRIAS'}
`;

    writeFileSync('RELATORIO_TESTE_AGENTES_IA.md', relatorio);
    console.log('📄 Relatório salvo em: RELATORIO_TESTE_AGENTES_IA.md\n');

    return testesFalhos === 0;

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
    return false;
  }
}

testar();

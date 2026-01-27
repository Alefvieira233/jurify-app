/**
 * ðŸŽ¯ TESTE MISSION CONTROL - REALTIME
 *
 * Testa se o Mission Control recebe updates em tempo real
 */

import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

console.log('\nðŸŽ¯ TESTE MISSION CONTROL - REALTIME\n');
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
  let subscription = null;
  let insertSubscription = null;

  try {
    console.log('ðŸ“‹ Carregando configuraÃ§Ãµes...\n');
    const env = loadEnv();

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const anonKey = env.VITE_SUPABASE_ANON_KEY;
    const testEmail = env.TEST_USER_EMAIL || 'teste@jurify.com';
    const testPassword = env.TEST_USER_PASSWORD || 'teste123';

    let supabase = createClient(supabaseUrl, anonKey);
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('Æ’?O Falha no login de teste:', signInError.message);
      console.log('Execute: node criar-usuario-teste.mjs');
      return false;
    }

    if (authData?.session?.access_token) {
      supabase.realtime.setAuth(authData.session.access_token);
    }

    const accessToken = authData?.session?.access_token;
    if (!accessToken) {
      console.error('Æ’?O Token de sessÃ£o nÃ£o encontrado');
      return false;
    }

    supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    if (supabase?.realtime?.setAuth) {
      supabase.realtime.setAuth(accessToken);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      console.error('Æ’?O Nenhum tenant_id encontrado\n');
      return false;
    }

    // ========================================
    // TESTE 1: Conectar ao Realtime
    // ========================================
    console.log('1ï¸âƒ£ Conectando ao Realtime...\n');

    let realtimeConnected = false;
    let updateRecebido = false;
    let latenciaRealtime = null;

    try {
      // Criar canal para agent_executions
      const channel = supabase
        .channel('mission-control-test')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agent_executions'
          },
          (payload) => {
            const tempoUpdate = Date.now();
            updateRecebido = true;
            latenciaRealtime = tempoUpdate - startExecTime;

            console.log('\n   ðŸ”” UPDATE RECEBIDO VIA REALTIME!');
            console.log(`      LatÃªncia: ${latenciaRealtime}ms`);
            console.log(`      Evento: ${payload.eventType}`);
            console.log(`      Dados:`, JSON.stringify(payload.new, null, 2).substring(0, 200) + '...\n');
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            realtimeConnected = true;
            console.log('âœ… Subscrito ao canal agent_executions\n');
          }
        });

      subscription = channel;

      // Aguardar conexÃ£o (max 5s)
      let tentativas = 0;
      while (!realtimeConnected && tentativas < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        tentativas++;
      }

      if (!realtimeConnected) {
        console.error('âŒ Timeout ao conectar no Realtime\n');
        resultados.push({ teste: 'Conectar Realtime', status: 'FALHOU', erro: 'Timeout' });
        return false;
      }

      resultados.push({ teste: 'Conectar Realtime', status: 'OK' });

    } catch (err) {
      console.error(`âŒ Erro ao conectar: ${err.message}\n`);
      resultados.push({ teste: 'Conectar Realtime', status: 'FALHOU', erro: err.message });
      return false;
    }

    // ========================================
        // ========================================
    // TESTE 2: Realtime insert direto
    // ========================================
    console.log('2) Teste Realtime com insert direto...\n');

    let insertRealtimeOk = false;
    let insertLatency = null;
    const insertStartTime = Date.now();
    const insertExecutionId = `realtime_test_${Date.now()}`;

    try {
      const insertChannel = supabase
        .channel('mission-control-test-insert')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'agent_executions',
            filter: `execution_id=eq.${insertExecutionId}`
          },
          () => {
            insertRealtimeOk = true;
            insertLatency = Date.now() - insertStartTime;
            console.log(`\n   OK - INSERT recebido via Realtime (${insertLatency}ms)\n`);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('   OK - Subscrito ao canal de insert direto\n');
          }
        });

      insertSubscription = insertChannel;

      const { error: insertError } = await supabase
        .from('agent_executions')
        .insert({
          execution_id: insertExecutionId,
          tenant_id: profile.tenant_id,
          user_id: authData.user.id,
          status: 'processing',
          current_agent: 'Realtime Test'
        });

      if (insertError) {
        console.error(`ERRO no insert direto: ${insertError.message}\n`);
        resultados.push({ teste: 'Realtime insert direto', status: 'FALHOU', erro: insertError.message });
        return false;
      }

      let aguardouInsert = 0;
      while (!insertRealtimeOk && aguardouInsert < 5000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        aguardouInsert += 100;
      }

      if (!insertRealtimeOk) {
        console.log('\nFALHA - INSERT nao recebido via Realtime\n');
        resultados.push({ teste: 'Realtime insert direto', status: 'FALHOU', erro: 'Timeout - sem update' });
        return false;
      }

      resultados.push({
        teste: 'Realtime insert direto',
        status: 'OK',
        latencia: `${insertLatency}ms`
      });

      await supabase
        .from('agent_executions')
        .delete()
        .eq('execution_id', insertExecutionId);
    } catch (err) {
      console.error(`ERRO no teste de insert direto: ${err.message}\n`);
      resultados.push({ teste: 'Realtime insert direto', status: 'FALHOU', erro: err.message });
      return false;
    }
// TESTE 2: Executar agente
    // ========================================
    console.log('2ï¸âƒ£ Executando agente IA...\n');

    // Buscar agente
    const { data: agentes } = await supabase
      .from('agentes_ia')
      .select('*')
      .eq('ativo', true)
      .eq('tenant_id', profile.tenant_id)
      .limit(1);

    if (!agentes || agentes.length === 0) {
      console.error('âŒ Nenhum agente encontrado\n');
      return false;
    }

    const agente = agentes[0];
    console.log(`   Agente: ${agente.nome}\n`);

    // Marcar tempo de execuÃ§Ã£o
    const startExecTime = Date.now();

    // Chamar Edge Function
    const systemPrompt = [
      agente.script_saudacao,
      agente.objetivo ? `Objetivo: ${agente.objetivo}` : null
    ].filter(Boolean).join('\n');

    const { data: response, error: execError } = await supabase.functions.invoke('ai-agent-processor', {
      body: {
        agentName: agente.nome,
        agentSpecialization: agente.area_juridica,
        systemPrompt,
        userPrompt: 'Teste de Mission Control - tempo real',
        tenantId: profile.tenant_id
      }
    });

    const execDuration = Date.now() - startExecTime;

    if (execError) {
      console.error(`âŒ Erro na execuÃ§Ã£o: ${execError.message}\n`);
      resultados.push({ teste: 'Executar agente', status: 'FALHOU', erro: execError.message });
      return false;
    }

    console.log(`âœ… Agente executado em ${execDuration}ms\n`);
    resultados.push({ teste: 'Executar agente', status: 'OK', duracao: `${execDuration}ms` });

    // ========================================
    // TESTE 3: Aguardar update realtime
    // ========================================
    console.log('3ï¸âƒ£ Aguardando update via Realtime...\n');
    console.log('   (aguardando atÃ© 5 segundos)\n');

    // Aguardar atÃ© 5s pelo update
    let aguardou = 0;
    while (!updateRecebido && aguardou < 5000) {
      await new Promise(resolve => setTimeout(resolve, 100));
      aguardou += 100;

      // Mostrar progresso
      if (aguardou % 1000 === 0) {
        console.log(`   â³ Aguardando... ${aguardou / 1000}s`);
      }
    }

    if (!updateRecebido) {
      console.log('\nâš ï¸  Update NÃƒO recebido via Realtime\n');
      console.log('ðŸ’¡ PossÃ­veis causas:');
      console.log('   1. Realtime nÃ£o habilitado na tabela agent_executions');
      console.log('   2. RLS bloqueando inserts (Edge Function nÃ£o conseguiu criar registro)');
      console.log('   3. ConfiguraÃ§Ã£o de Realtime no Supabase Dashboard\n');

      resultados.push({ teste: 'Receber update', status: 'FALHOU', erro: 'Timeout - sem update' });
    } else {
      console.log(`âœ… Update recebido com sucesso!\n`);
      resultados.push({ teste: 'Receber update', status: 'OK', latencia: `${latenciaRealtime}ms` });

      // ========================================
      // TESTE 4: Validar latÃªncia
      // ========================================
      console.log('4ï¸âƒ£ Validando latÃªncia do Realtime...\n');

      if (latenciaRealtime < 1000) {
        console.log(`âœ… LatÃªncia EXCELENTE: ${latenciaRealtime}ms (<1s)\n`);
        resultados.push({ teste: 'LatÃªncia Realtime', status: 'EXCELENTE', latencia: `${latenciaRealtime}ms` });
      } else if (latenciaRealtime < 2000) {
        console.log(`âœ… LatÃªncia BOA: ${latenciaRealtime}ms (<2s)\n`);
        resultados.push({ teste: 'LatÃªncia Realtime', status: 'OK', latencia: `${latenciaRealtime}ms` });
      } else {
        console.log(`âš ï¸  LatÃªncia ALTA: ${latenciaRealtime}ms (>2s)\n`);
        resultados.push({ teste: 'LatÃªncia Realtime', status: 'LENTA', latencia: `${latenciaRealtime}ms` });
      }
    }

    // ========================================
    // RESUMO FINAL
    // ========================================
    console.log('='.repeat(60));
    console.log('ðŸ“Š RESUMO DO TESTE\n');

    const totalTestes = resultados.length;
    const testesOK = resultados.filter(r => r.status === 'OK' || r.status === 'EXCELENTE').length;
    const testesFalhos = resultados.filter(r => r.status === 'FALHOU').length;
    const testesAtencao = resultados.filter(r => r.status === 'LENTA').length;

    resultados.forEach((r, i) => {
      const icon = r.status === 'OK' || r.status === 'EXCELENTE' ? 'âœ…' : r.status === 'FALHOU' ? 'âŒ' : 'âš ï¸';
      console.log(`${icon} ${r.teste}: ${r.status}`);
      if (r.erro) console.log(`   Erro: ${r.erro}`);
      if (r.duracao) console.log(`   DuraÃ§Ã£o: ${r.duracao}`);
      if (r.latencia) console.log(`   LatÃªncia: ${r.latencia}`);
    });

    console.log('\n' + '='.repeat(60));

    if (testesFalhos === 0 && testesAtencao === 0) {
      console.log('\nðŸŽ‰ MISSION CONTROL FUNCIONANDO EM TEMPO REAL!\n');
      console.log('âœ… Realtime conectado');
      console.log('âœ… Updates sendo recebidos');
      console.log('âœ… LatÃªncia excelente\n');
    } else if (testesFalhos === 0) {
      console.log('\nâœ… MISSION CONTROL FUNCIONANDO!\n');
      console.log(`âš ï¸  ${testesAtencao} teste(s) com latÃªncia alta\n`);
    } else {
      console.log(`\nâš ï¸  ${testesFalhos}/${totalTestes} teste(s) falharam\n`);
      console.log('ðŸ’¡ Verifique:');
      console.log('   1. Realtime habilitado no Supabase Dashboard');
      console.log('   2. RLS permitindo inserts em agent_executions');
      console.log('   3. Edge Functions conseguindo criar registros\n');
    }

    // Limpar subscription
    if (subscription) {
      await subscription.unsubscribe();
    }

    if (insertSubscription) {
      await insertSubscription.unsubscribe();
    }

    // Salvar relatÃ³rio
    const relatorio = `# RelatÃ³rio de Teste - Mission Control Realtime

**Data:** ${new Date().toLocaleString('pt-BR')}

## Resultados

${resultados.map((r, i) => `### ${i + 1}. ${r.teste}
- **Status:** ${r.status}
${r.erro ? `- **Erro:** ${r.erro}` : ''}
${r.duracao ? `- **DuraÃ§Ã£o:** ${r.duracao}` : ''}
${r.latencia ? `- **LatÃªncia:** ${r.latencia}` : ''}
`).join('\n')}

## Resumo
- Total: ${totalTestes}
- Sucesso: ${testesOK}
- Falhas: ${testesFalhos}
- AtenÃ§Ã£o: ${testesAtencao}
- Taxa de sucesso: ${Math.round((testesOK / totalTestes) * 100)}%

${testesFalhos === 0 ? '## âœ… Resultado: MISSION CONTROL FUNCIONANDO!' : '## âš ï¸ Resultado: CORREÃ‡Ã•ES NECESSÃRIAS'}

## PrÃ³ximos Passos

${testesFalhos === 0 ? 'Mission Control estÃ¡ operacional e recebendo updates em tempo real!' : `1. Habilite Realtime na tabela agent_executions no Dashboard
2. Verifique se RLS permite inserts via service role
3. Execute este teste novamente`}
`;

    writeFileSync('RELATORIO_TESTE_MISSION_CONTROL.md', relatorio);
    console.log('ðŸ“„ RelatÃ³rio salvo em: RELATORIO_TESTE_MISSION_CONTROL.md\n');

    return testesFalhos === 0;

  } catch (err) {
    console.error('\nâŒ Erro inesperado:', err.message);
    console.error(err);
    return false;
  } finally {
    // Garantir que subscription Ã© fechada
    if (subscription) {
      try {
        await subscription.unsubscribe();
      } catch (e) {
        // Ignorar erros ao desinscrever
      }
    }
    if (insertSubscription) {
      try {
        await insertSubscription.unsubscribe();
      } catch (e) {
        // Ignorar erros ao desinscrever
      }
    }
  }
}

testar();




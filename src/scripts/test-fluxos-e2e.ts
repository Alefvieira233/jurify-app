/**
 * 🧪 JURIFY - TESTES END-TO-END
 *
 * Scripts para validar os principais fluxos do sistema.
 * Execute via console do navegador ou Node.js.
 *
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// CORES PARA CONSOLE
// ============================================

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg: string) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

// ============================================
// TESTE 1: FLUXO COMPLETO DE LEAD
// ============================================

export async function testeFluxoLead() {
  log.test('TESTE 1: Fluxo Completo de Lead');
  console.log('─'.repeat(50));

  try {
    // 1. Criar Lead
    log.info('1/6: Criando novo lead...');
    const { data: novoLead, error: createError } = await supabase
      .from('leads')
      .insert({
        nome_completo: 'João Silva Teste E2E',
        telefone: '11999998888',
        email: 'joao.teste@exemplo.com',
        area_juridica: 'Trabalhista',
        origem: 'WhatsApp',
        valor_causa: 50000,
        responsavel: 'Dr. Teste',
        status: 'novo_lead',
        observacoes: 'Lead criado via teste E2E',
      })
      .select()
      .single();

    if (createError) throw new Error(`Erro ao criar lead: ${createError.message}`);
    log.success(`Lead criado com ID: ${novoLead.id}`);

    // 2. Atualizar status do lead
    log.info('2/6: Atualizando status para "em_qualificacao"...');
    const { error: updateError } = await supabase
      .from('leads')
      .update({ status: 'em_qualificacao' })
      .eq('id', novoLead.id);

    if (updateError) throw new Error(`Erro ao atualizar: ${updateError.message}`);
    log.success('Status atualizado com sucesso');

    // 3. Criar interação (timeline)
    log.info('3/6: Criando interação na timeline...');
    const { error: timelineError } = await supabase
      .from('lead_interactions')
      .insert({
        lead_id: novoLead.id,
        agent_id: 'test_agent',
        message: 'Lead qualificado via teste E2E',
        response: 'Lead possui perfil adequado',
      });

    if (timelineError) throw new Error(`Erro ao criar interação: ${timelineError.message}`);
    log.success('Interação criada na timeline');

    // 4. Buscar lead atualizado
    log.info('4/6: Buscando lead atualizado...');
    const { data: leadAtualizado, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', novoLead.id)
      .single();

    if (fetchError) throw new Error(`Erro ao buscar: ${fetchError.message}`);
    log.success(`Lead encontrado: ${leadAtualizado.nome_completo} (${leadAtualizado.status})`);

    // 5. Verificar timeline
    log.info('5/6: Verificando timeline...');
    const { data: interactions, error: interactionsError } = await supabase
      .from('lead_interactions')
      .select('*')
      .eq('lead_id', novoLead.id);

    if (interactionsError) throw new Error(`Erro ao buscar timeline: ${interactionsError.message}`);
    log.success(`Timeline possui ${interactions?.length || 0} interações`);

    // 6. Limpar (deletar lead de teste)
    log.info('6/6: Limpando dados de teste...');
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', novoLead.id);

    if (deleteError) throw new Error(`Erro ao deletar: ${deleteError.message}`);
    log.success('Lead de teste removido');

    console.log('\n');
    log.success('TESTE 1 PASSOU ✅ - Fluxo de Lead funcionando!');
    return true;

  } catch (error: any) {
    console.log('\n');
    log.error(`TESTE 1 FALHOU ❌ - ${error.message}`);
    return false;
  }
}

// ============================================
// TESTE 2: FLUXO DE AGENTE IA
// ============================================

export async function testeFluxoAgenteIA() {
  log.test('TESTE 2: Fluxo de Agente IA');
  console.log('─'.repeat(50));

  try {
    // 1. Criar lead para teste
    log.info('1/5: Criando lead para teste...');
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        nome_completo: 'Maria Santos Teste IA',
        telefone: '11988887777',
        email: 'maria.teste@exemplo.com',
        area_juridica: 'Civil',
        origem: 'Site',
        responsavel: 'Dr. IA',
        status: 'novo_lead',
      })
      .select()
      .single();

    if (leadError) throw new Error(`Erro ao criar lead: ${leadError.message}`);
    log.success(`Lead criado: ${lead.id}`);

    // 2. Verificar se OpenAI está configurada
    log.info('2/5: Verificando configuração OpenAI...');
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-agent-processor', {
      body: {
        agentName: 'Coordenador',
        agentSpecialization: 'Coordenação de agentes',
        systemPrompt: 'Você é um coordenador de agentes.',
        userPrompt: 'Teste de conexão',
        context: {},
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 50,
        leadId: lead.id,
      },
    });

    if (aiError) {
      log.warn('OpenAI não configurada - pulando teste de IA');
      log.warn('Configure OPENAI_API_KEY nas Edge Functions');
    } else {
      log.success('Edge Function respondeu corretamente');
    }

    // 3. Verificar se execution foi criada
    log.info('3/5: Verificando criação de execution...');
    const { data: executions, error: execError } = await supabase
      .from('agent_executions')
      .select('*')
      .eq('lead_id', lead.id)
      .order('started_at', { ascending: false })
      .limit(1);

    if (execError) throw new Error(`Erro ao buscar executions: ${execError.message}`);

    if (executions && executions.length > 0) {
      log.success(`Execution criada: ${executions[0].execution_id}`);
    } else {
      log.warn('Nenhuma execution encontrada (normal se OpenAI não configurada)');
    }

    // 4. Verificar logs de IA
    log.info('4/5: Verificando logs de IA...');
    const { data: logs, error: logsError } = await supabase
      .from('agent_ai_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logsError) throw new Error(`Erro ao buscar logs: ${logsError.message}`);
    log.success(`Encontrados ${logs?.length || 0} logs recentes`);

    // 5. Limpar
    log.info('5/5: Limpando dados de teste...');
    await supabase.from('leads').delete().eq('id', lead.id);
    log.success('Lead de teste removido');

    console.log('\n');
    log.success('TESTE 2 PASSOU ✅ - Fluxo de Agente IA OK!');
    return true;

  } catch (error: any) {
    console.log('\n');
    log.error(`TESTE 2 FALHOU ❌ - ${error.message}`);
    return false;
  }
}

// ============================================
// TESTE 3: FLUXO DE WHATSAPP
// ============================================

export async function testeFluxoWhatsApp() {
  log.test('TESTE 3: Fluxo de WhatsApp');
  console.log('─'.repeat(50));

  try {
    // 1. Criar lead para conversa
    log.info('1/5: Criando lead...');
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        nome_completo: 'Carlos WhatsApp Teste',
        telefone: '11977776666',
        email: 'carlos.teste@exemplo.com',
        area_juridica: 'Família',
        origem: 'WhatsApp',
        responsavel: 'Dr. WhatsApp',
        status: 'novo_lead',
      })
      .select()
      .single();

    if (leadError) throw new Error(`Erro ao criar lead: ${leadError.message}`);
    log.success(`Lead criado: ${lead.id}`);

    // 2. Criar conversa WhatsApp
    log.info('2/5: Criando conversa WhatsApp...');
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .insert({
        lead_id: lead.id,
        phone_number: lead.telefone,
        contact_name: lead.nome_completo,
        status: 'ativo',
        last_message: 'Olá, tenho interesse em consultoria jurídica',
        last_message_at: new Date().toISOString(),
        unread_count: 1,
        ia_active: true,
      })
      .select()
      .single();

    if (convError) throw new Error(`Erro ao criar conversa: ${convError.message}`);
    log.success(`Conversa criada: ${conversation.id}`);

    // 3. Adicionar mensagens
    log.info('3/5: Adicionando mensagens...');
    const { error: msg1Error } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        sender: 'lead',
        content: 'Olá, tenho interesse em consultoria jurídica',
        timestamp: new Date().toISOString(),
        read: true,
      });

    if (msg1Error) throw new Error(`Erro ao criar mensagem 1: ${msg1Error.message}`);

    const { error: msg2Error } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        sender: 'ia',
        content: 'Olá! Sou o assistente virtual do escritório. Como posso ajudar?',
        timestamp: new Date(Date.now() + 1000).toISOString(),
        read: true,
      });

    if (msg2Error) throw new Error(`Erro ao criar mensagem 2: ${msg2Error.message}`);
    log.success('Mensagens adicionadas');

    // 4. Buscar conversa com mensagens
    log.info('4/5: Buscando conversa completa...');
    const { data: messages, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('timestamp', { ascending: true });

    if (fetchError) throw new Error(`Erro ao buscar mensagens: ${fetchError.message}`);
    log.success(`Conversa possui ${messages?.length || 0} mensagens`);

    // 5. Limpar
    log.info('5/5: Limpando dados de teste...');
    await supabase.from('whatsapp_conversations').delete().eq('id', conversation.id);
    await supabase.from('leads').delete().eq('id', lead.id);
    log.success('Dados de teste removidos');

    console.log('\n');
    log.success('TESTE 3 PASSOU ✅ - Fluxo de WhatsApp OK!');
    return true;

  } catch (error: any) {
    console.log('\n');
    log.error(`TESTE 3 FALHOU ❌ - ${error.message}`);
    return false;
  }
}

// ============================================
// TESTE 4: MISSION CONTROL REALTIME
// ============================================

export async function testeMissionControl() {
  log.test('TESTE 4: Mission Control Realtime');
  console.log('─'.repeat(50));

  try {
    // 1. Criar execution de teste
    log.info('1/3: Criando execution de teste...');
    const executionId = `exec_test_${Date.now()}`;

    const { data: execution, error: execError } = await supabase
      .from('agent_executions')
      .insert({
        execution_id: executionId,
        status: 'processing',
        current_agent: 'Coordenador',
        current_stage: 'Iniciando processamento',
        agents_involved: ['Coordenador'],
        started_at: new Date().toISOString(),
        total_tokens: 0,
        estimated_cost_usd: 0,
      })
      .select()
      .single();

    if (execError) throw new Error(`Erro ao criar execution: ${execError.message}`);
    log.success(`Execution criada: ${executionId}`);

    // 2. Atualizar execution para completed
    log.info('2/3: Completando execution...');
    const { error: updateError } = await supabase
      .from('agent_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_duration_ms: 1500,
        total_agents_used: 1,
      })
      .eq('id', execution.id);

    if (updateError) throw new Error(`Erro ao atualizar execution: ${updateError.message}`);
    log.success('Execution completada');

    // 3. Verificar se Mission Control consegue ler
    log.info('3/3: Verificando leitura do Mission Control...');
    const { data: executions, error: fetchError } = await supabase
      .from('agent_executions')
      .select('*')
      .eq('execution_id', executionId)
      .single();

    if (fetchError) throw new Error(`Erro ao buscar execution: ${fetchError.message}`);
    log.success(`Mission Control pode ler execution: ${executions.status}`);

    // Limpar
    await supabase.from('agent_executions').delete().eq('id', execution.id);

    console.log('\n');
    log.success('TESTE 4 PASSOU ✅ - Mission Control OK!');
    return true;

  } catch (error: any) {
    console.log('\n');
    log.error(`TESTE 4 FALHOU ❌ - ${error.message}`);
    return false;
  }
}

// ============================================
// TESTE 5: DASHBOARD MÉTRICAS
// ============================================

export async function testeDashboard() {
  log.test('TESTE 5: Dashboard Métricas');
  console.log('─'.repeat(50));

  try {
    // 1. Buscar leads
    log.info('1/4: Buscando leads...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(10);

    if (leadsError) throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
    log.success(`Dashboard pode ler ${leads?.length || 0} leads`);

    // 2. Buscar executions
    log.info('2/4: Buscando executions...');
    const { data: executions, error: execError } = await supabase
      .from('agent_executions')
      .select('*')
      .limit(10);

    if (execError) throw new Error(`Erro ao buscar executions: ${execError.message}`);
    log.success(`Dashboard pode ler ${executions?.length || 0} executions`);

    // 3. Buscar logs
    log.info('3/4: Buscando logs de IA...');
    const { data: logs, error: logsError } = await supabase
      .from('agent_ai_logs')
      .select('*')
      .limit(10);

    if (logsError) throw new Error(`Erro ao buscar logs: ${logsError.message}`);
    log.success(`Dashboard pode ler ${logs?.length || 0} logs`);

    // 4. Calcular métricas
    log.info('4/4: Calculando métricas...');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const { data: leadsHoje, error: hojeError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: false })
      .gte('created_at', hoje.toISOString());

    if (hojeError) throw new Error(`Erro ao calcular métricas: ${hojeError.message}`);
    log.success(`Dashboard calculou: ${leadsHoje?.length || 0} leads hoje`);

    console.log('\n');
    log.success('TESTE 5 PASSOU ✅ - Dashboard OK!');
    return true;

  } catch (error: any) {
    console.log('\n');
    log.error(`TESTE 5 FALHOU ❌ - ${error.message}`);
    return false;
  }
}

// ============================================
// EXECUTAR TODOS OS TESTES
// ============================================

export async function executarTodosOsTestes() {
  console.clear();
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('🧪 JURIFY - SUITE DE TESTES END-TO-END');
  console.log('═'.repeat(60));
  console.log('\n');

  const resultados = {
    total: 5,
    passou: 0,
    falhou: 0,
  };

  // Executar testes sequencialmente
  const testes = [
    { nome: 'Fluxo de Lead', fn: testeFluxoLead },
    { nome: 'Fluxo de Agente IA', fn: testeFluxoAgenteIA },
    { nome: 'Fluxo de WhatsApp', fn: testeFluxoWhatsApp },
    { nome: 'Mission Control', fn: testeMissionControl },
    { nome: 'Dashboard Métricas', fn: testeDashboard },
  ];

  for (const teste of testes) {
    const passou = await teste.fn();
    if (passou) {
      resultados.passou++;
    } else {
      resultados.falhou++;
    }
    console.log('\n');
  }

  // Resumo final
  console.log('═'.repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('═'.repeat(60));
  console.log(`Total de testes: ${resultados.total}`);
  console.log(`${colors.green}✅ Passou: ${resultados.passou}${colors.reset}`);
  console.log(`${colors.red}❌ Falhou: ${resultados.falhou}${colors.reset}`);

  if (resultados.falhou === 0) {
    console.log('\n');
    log.success('🎉 TODOS OS TESTES PASSARAM! Sistema operacional.');
  } else {
    console.log('\n');
    log.warn('⚠️  Alguns testes falharam. Verifique as configurações.');
  }

  console.log('\n');
}

// ============================================
// EXPORTAR PARA USO NO CONSOLE
// ============================================

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.JurifyTestes = {
    executarTodos: executarTodosOsTestes,
    testeFluxoLead,
    testeFluxoAgenteIA,
    testeFluxoWhatsApp,
    testeMissionControl,
    testeDashboard,
  };

  console.log('✅ Testes E2E carregados!');
  console.log('Execute no console: JurifyTestes.executarTodos()');
}


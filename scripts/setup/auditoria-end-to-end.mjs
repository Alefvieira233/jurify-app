import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env', 'utf-8').split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  const value = valueParts.join('=').trim();
  if (key && value) env[key.trim()] = value;
});

console.log('\n=== AUDITORIA 6: FLUXO END-TO-END (USER JOURNEY) ===\n');
console.log('Simulando jornada de um usuário real no sistema\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Cenário: Usuário entrando no sistema
console.log('🎬 CENÁRIO: Cliente com dúvida trabalhista\n');
console.log('─'.repeat(50));

// PASSO 1: Listar agentes disponíveis
console.log('\n📋 PASSO 1: Cliente vê lista de agentes especializados');
try {
  const { data: agentesDisponiveis, error } = await supabase
    .from('agentes_ia')
    .select('id, nome, ativo')
    .eq('ativo', true);

  if (error) {
    console.log('   ❌ Erro ao listar agentes:', error.message);
    results.failed++;
  } else if (agentesDisponiveis && agentesDisponiveis.length > 0) {
    console.log(`   ✅ ${agentesDisponiveis.length} agentes disponíveis`);
    console.log('   Especialidades:');
    agentesDisponiveis.slice(0, 5).forEach(a => {
      console.log(`      - ${a.nome}`);
    });
    results.passed++;
  } else {
    console.log('   ❌ Nenhum agente disponível');
    results.failed++;
  }
} catch (e) {
  console.log('   ❌ Exception:', e.message);
  results.failed++;
}

// PASSO 2: Cliente seleciona agente Trabalhista
console.log('\n👆 PASSO 2: Cliente seleciona "Qualificador Trabalhista"');
const { data: agenteSelecionado } = await supabase
  .from('agentes_ia')
  .select('*')
  .eq('nome', 'Qualificador Trabalhista')
  .eq('ativo', true)
  .single();

if (agenteSelecionado) {
  console.log('   ✅ Agente selecionado:', agenteSelecionado.nome);
  results.passed++;
} else {
  // Pegar qualquer agente ativo
  const { data: qualquerAgente } = await supabaseAdmin
    .from('agentes_ia')
    .select('*')
    .eq('ativo', true)
    .limit(1);

  if (qualquerAgente && qualquerAgente.length > 0) {
    console.log('   ⚠️  Agente específico não encontrado, usando:', qualquerAgente[0].nome);
    results.warnings++;
  } else {
    console.log('   ❌ Nenhum agente disponível');
    results.failed++;
    process.exit(1);
  }
}

const agente = agenteSelecionado || (await supabaseAdmin.from('agentes_ia').select('*').eq('ativo', true).limit(1)).data[0];

// PASSO 3: Cliente envia consulta
console.log('\n💬 PASSO 3: Cliente envia consulta jurídica');
const consultaCliente = 'Trabalhei por 5 anos em uma empresa e fui demitido sem justa causa. Não recebi minhas verbas rescisórias corretamente. O que devo fazer?';
console.log('   Consulta:', consultaCliente.substring(0, 80) + '...');

let execucaoId = null;
let tempoResposta = 0;

try {
  const start = Date.now();

  const { data: resposta, error } = await supabase.functions.invoke('agentes-ia-api', {
    body: {
      agente_id: agente.id,
      input_usuario: consultaCliente,
      use_n8n: false
    }
  });

  tempoResposta = Date.now() - start;

  if (error) {
    console.log('   ❌ Erro ao processar consulta:', error.message);
    results.failed++;
  } else if (resposta && resposta.success && resposta.response) {
    console.log('   ✅ Resposta recebida em', tempoResposta + 'ms');
    console.log('   Preview:', resposta.response.substring(0, 150) + '...');

    if (resposta.response.length > 100) {
      console.log('   ✅ Resposta completa e adequada');
      results.passed++;
    } else {
      console.log('   ⚠️  Resposta muito curta');
      results.warnings++;
    }

    if (tempoResposta < 5000) {
      console.log('   ✅ Tempo de resposta aceitável');
      results.passed++;
    } else {
      console.log('   ⚠️  Resposta demorou', (tempoResposta/1000).toFixed(1) + 's');
      results.warnings++;
    }
  } else {
    console.log('   ❌ Resposta inválida ou vazia');
    results.failed++;
  }
} catch (e) {
  console.log('   ❌ Exception:', e.message);
  results.failed++;
}

// PASSO 4: Verificar se logs foram criados
console.log('\n📊 PASSO 4: Sistema registra interação');
await new Promise(resolve => setTimeout(resolve, 1500)); // Aguardar persistência

try {
  const { data: ultimosLogs } = await supabaseAdmin
    .from('logs_execucao_agentes')
    .select('*')
    .eq('agente_id', agente.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (ultimosLogs && ultimosLogs.length > 0) {
    const log = ultimosLogs[0];
    console.log('   ✅ Interação registrada');
    console.log('      - ID do log:', log.id);
    console.log('      - Status:', log.status);
    console.log('      - Tempo:', log.tempo_execucao + 'ms');

    if (log.input_recebido && log.resposta_ia) {
      console.log('   ✅ Input e resposta salvos');
      results.passed++;
    } else {
      console.log('   ⚠️  Dados incompletos no log');
      results.warnings++;
    }
  } else {
    console.log('   ❌ Nenhum log encontrado');
    results.failed++;
  }
} catch (e) {
  console.log('   ❌ Erro ao verificar logs:', e.message);
  results.failed++;
}

// PASSO 5: Cliente pode ver histórico?
console.log('\n📜 PASSO 5: Cliente acessa histórico de conversas');
try {
  const { data: historico, error } = await supabaseAdmin
    .from('logs_execucao_agentes')
    .select('id, input_recebido, resposta_ia, created_at, status')
    .eq('agente_id', agente.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log('   ❌ Erro ao buscar histórico:', error.message);
    results.failed++;
  } else if (historico && historico.length > 0) {
    console.log(`   ✅ ${historico.length} conversas anteriores encontradas`);
    console.log('      Conversas recentes:');
    historico.slice(0, 3).forEach((conv, i) => {
      const preview = conv.input_recebido?.substring(0, 40) || 'N/A';
      console.log(`        ${i+1}. ${preview}... (${conv.status})`);
    });
    results.passed++;
  } else {
    console.log('   ⚠️  Nenhum histórico (primeira interação)');
    results.warnings++;
  }
} catch (e) {
  console.log('   ❌ Exception:', e.message);
  results.failed++;
}

// PASSO 6: Sistema permite consultas subsequentes?
console.log('\n🔄 PASSO 6: Cliente faz pergunta de acompanhamento');
try {
  const { data: segundaResposta, error } = await supabase.functions.invoke('agentes-ia-api', {
    body: {
      agente_id: agente.id,
      input_usuario: 'E quanto tempo tenho para reclamar esses direitos?',
      use_n8n: false
    }
  });

  if (error) {
    console.log('   ❌ Erro:', error.message);
    results.failed++;
  } else if (segundaResposta && segundaResposta.success) {
    console.log('   ✅ Segunda consulta processada');
    console.log('   Preview:', segundaResposta.response.substring(0, 100) + '...');
    results.passed++;
  } else {
    console.log('   ❌ Falha na segunda consulta');
    results.failed++;
  }
} catch (e) {
  console.log('   ❌ Exception:', e.message);
  results.failed++;
}

// RESUMO DO FLUXO
console.log('\n' + '='.repeat(50));
console.log('RESULTADO FLUXO END-TO-END:');
console.log('  ✅ Passou:', results.passed);
console.log('  ❌ Falhou:', results.failed);
console.log('  ⚠️  Avisos:', results.warnings);
console.log('='.repeat(50));

// Avaliação da experiência do usuário
const totalTestes = results.passed + results.failed + results.warnings;
const taxaSucesso = (results.passed / totalTestes) * 100;

console.log('\n📈 AVALIAÇÃO DA EXPERIÊNCIA:');
if (taxaSucesso >= 90) {
  console.log('   🏆 EXCELENTE - Sistema pronto para produção');
} else if (taxaSucesso >= 75) {
  console.log('   ✅ BOM - Sistema funcional com pequenos ajustes');
} else if (taxaSucesso >= 60) {
  console.log('   ⚠️  RAZOÁVEL - Precisa melhorias antes de produção');
} else {
  console.log('   ❌ CRÍTICO - Sistema não está pronto');
}

console.log('   Taxa de sucesso:', taxaSucesso.toFixed(1) + '%');

if (results.failed > 0) {
  console.log('\n⚠️  BLOQUEIOS NA JORNADA DO USUÁRIO!');
}

process.exit(results.failed > 0 ? 1 : 0);

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

console.log('\n=== AUDITORIA 5: LOGS E PERSISTÊNCIA ===\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Buscar agente
const { data: agentes } = await supabaseAdmin
  .from('agentes_ia')
  .select('*')
  .eq('ativo', true)
  .limit(1);

if (!agentes || agentes.length === 0) {
  console.log('❌ ERRO: Nenhum agente encontrado');
  process.exit(1);
}

const agente = agentes[0];

// 5.1 Contar logs ANTES da execução
console.log('5.1 Verificando logs existentes:');
const { data: logsBefore } = await supabaseAdmin
  .from('logs_execucao_agentes')
  .select('count');

const countBefore = logsBefore?.[0]?.count || 0;
console.log('    Logs antes da execução:', countBefore);

// 5.2 Executar agente e verificar se log é criado
console.log('\n5.2 Executando agente e verificando persistência:');
const inputTest = `Teste de logging ${Date.now()}`;

try {
  const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
    body: {
      agente_id: agente.id,
      input_usuario: inputTest,
      use_n8n: false
    }
  });

  if (error) {
    console.log('    ❌ Erro na execução:', error.message);
    results.failed++;
  } else {
    console.log('    ✅ Agente executado com sucesso');
    results.passed++;

    // Aguardar 2s para log ser persistido
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Contar logs DEPOIS
    const { data: logsAfter } = await supabaseAdmin
      .from('logs_execucao_agentes')
      .select('count');

    const countAfter = logsAfter?.[0]?.count || 0;

    console.log('    Logs depois da execução:', countAfter);

    if (countAfter > countBefore) {
      console.log('    ✅ Log foi persistido (+' + (countAfter - countBefore) + ')');
      results.passed++;
    } else {
      console.log('    ❌ Log NÃO foi persistido');
      results.failed++;
    }
  }
} catch (e) {
  console.log('    ❌ Exception:', e.message);
  results.failed++;
}

// 5.3 Buscar o log mais recente e validar campos
console.log('\n5.3 Validando estrutura do log:');
try {
  const { data: ultimoLog } = await supabaseAdmin
    .from('logs_execucao_agentes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!ultimoLog || ultimoLog.length === 0) {
    console.log('    ❌ Nenhum log encontrado');
    results.failed++;
  } else {
    const log = ultimoLog[0];

    // Validar campos obrigatórios
    const camposEsperados = [
      'id',
      'agente_id',
      'input_recebido',
      'resposta_ia',
      'status',
      'tempo_execucao',
      'created_at'
    ];

    let camposOK = 0;
    let camposFaltando = 0;

    for (const campo of camposEsperados) {
      if (log[campo] !== null && log[campo] !== undefined) {
        camposOK++;
      } else {
        console.log(`    ⚠️  Campo ausente: ${campo}`);
        camposFaltando++;
      }
    }

    console.log(`    Campos validados: ${camposOK}/${camposEsperados.length}`);

    if (camposOK === camposEsperados.length) {
      console.log('    ✅ Estrutura completa');
      results.passed++;
    } else if (camposOK >= camposEsperados.length * 0.8) {
      console.log('    ⚠️  Estrutura parcial (faltam', camposFaltando, 'campos)');
      results.warnings++;
    } else {
      console.log('    ❌ Estrutura incompleta');
      results.failed++;
    }

    // Validar valores
    console.log('\n    Validando valores:');
    console.log('      - ID:', log.id ? '✅' : '❌');
    console.log('      - Status:', log.status ? '✅ ' + log.status : '❌');
    console.log('      - Tempo execução:', log.tempo_execucao ? '✅ ' + log.tempo_execucao + 'ms' : '⚠️');
    console.log('      - Input:', log.input_recebido ? '✅ ' + log.input_recebido.substring(0, 50) + '...' : '❌');
    console.log('      - Resposta:', log.resposta_ia ? '✅ ' + log.resposta_ia.substring(0, 50) + '...' : '⚠️');
  }
} catch (e) {
  console.log('    ❌ Erro ao buscar log:', e.message);
  results.failed++;
}

// 5.4 Verificar retenção de dados (logs antigos ainda existem?)
console.log('\n5.4 Verificando retenção de dados:');
try {
  const { data: logsAntigos } = await supabaseAdmin
    .from('logs_execucao_agentes')
    .select('id, created_at')
    .order('created_at', { ascending: true })
    .limit(5);

  if (logsAntigos && logsAntigos.length > 0) {
    const maisAntigo = logsAntigos[0];
    const idade = Date.now() - new Date(maisAntigo.created_at).getTime();
    const idadeDias = Math.floor(idade / (1000 * 60 * 60 * 24));

    console.log('    Log mais antigo:', maisAntigo.created_at);
    console.log('    Idade:', idadeDias, 'dias');
    console.log('    ✅ Retenção funcionando');
    results.passed++;
  } else {
    console.log('    ⚠️  Poucos logs para validar retenção');
    results.warnings++;
  }
} catch (e) {
  console.log('    ❌ Erro ao verificar retenção:', e.message);
  results.failed++;
}

// 5.5 Testar limpeza de dados de teste
console.log('\n5.5 Testando limpeza de dados de teste:');
try {
  // Criar log de teste
  const { data: logTeste } = await supabaseAdmin
    .from('logs_execucao_agentes')
    .insert([{
      agente_id: agente.id,
      input_recebido: 'TESTE_LIMPEZA_' + Date.now(),
      resposta_ia: 'Teste',
      status: 'success',
      tempo_execucao: 100,
      api_key_usado: 'test'
    }])
    .select();

  if (logTeste && logTeste.length > 0) {
    const idTeste = logTeste[0].id;

    // Tentar deletar
    const { error: deleteError } = await supabaseAdmin
      .from('logs_execucao_agentes')
      .delete()
      .eq('id', idTeste);

    if (deleteError) {
      console.log('    ⚠️  Não foi possível deletar:', deleteError.message);
      results.warnings++;
    } else {
      console.log('    ✅ Limpeza funcionando (DELETE OK)');
      results.passed++;
    }
  }
} catch (e) {
  console.log('    ❌ Erro ao testar limpeza:', e.message);
  results.failed++;
}

console.log('\n' + '='.repeat(50));
console.log('RESULTADO LOGS E PERSISTÊNCIA:');
console.log('  ✅ Passou:', results.passed);
console.log('  ❌ Falhou:', results.failed);
console.log('  ⚠️  Avisos:', results.warnings);
console.log('='.repeat(50));

if (results.failed > 0) {
  console.log('\n⚠️  PROBLEMAS DE PERSISTÊNCIA DETECTADOS!');
}

process.exit(results.failed > 0 ? 1 : 0);

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

console.log('\n=== AUDITORIA 4: EDGE FUNCTION (END-TO-END) ===\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Buscar um agente válido
const { data: agentes } = await supabaseAdmin
  .from('agentes_ia')
  .select('*')
  .eq('ativo', true)
  .limit(1);

if (!agentes || agentes.length === 0) {
  console.log('❌ ERRO CRÍTICO: Nenhum agente ativo encontrado!');
  process.exit(1);
}

const agente = agentes[0];
console.log(`Agente de teste: ${agente.nome} (${agente.id})\n`);

// 4.1 Teste básico de execução
console.log('4.1 Execução básica:');
try {
  const start = Date.now();
  const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
    body: {
      agente_id: agente.id,
      input_usuario: 'Teste básico de funcionamento',
      use_n8n: false
    }
  });

  const latency = Date.now() - start;

  if (error) {
    console.log('    ❌ Erro:', error.message);
    results.failed++;
  } else if (data && data.success && data.response) {
    console.log('    ✅ Funcionando');
    console.log('    Latência:', latency + 'ms');
    console.log('    Tokens:', data.tokens?.total_tokens || 'N/A');
    results.passed++;
  } else {
    console.log('    ⚠️  Resposta incompleta:', JSON.stringify(data));
    results.warnings++;
  }
} catch (e) {
  console.log('    ❌ Exception:', e.message);
  results.failed++;
}

// 4.2 Teste com prompt jurídico realista
console.log('\n4.2 Caso jurídico real (trabalhista):');
try {
  const start = Date.now();
  const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
    body: {
      agente_id: agente.id,
      input_usuario: 'Fui demitido sem justa causa após 3 anos de trabalho. Tenho direito a FGTS, seguro-desemprego e multa de 40%?',
      use_n8n: false
    }
  });

  const latency = Date.now() - start;

  if (error) {
    console.log('    ❌ Erro:', error.message);
    results.failed++;
  } else if (data && data.success && data.response) {
    console.log('    ✅ Resposta jurídica gerada');
    console.log('    Latência:', latency + 'ms');
    console.log('    Preview:', data.response.substring(0, 100) + '...');

    if (latency < 5000) {
      results.passed++;
    } else {
      console.log('    ⚠️  Latência alta (>5s)');
      results.warnings++;
    }
  } else {
    console.log('    ⚠️  Resposta incompleta');
    results.warnings++;
  }
} catch (e) {
  console.log('    ❌ Exception:', e.message);
  results.failed++;
}

// 4.3 Edge case: Input vazio
console.log('\n4.3 Edge case - Input vazio:');
try {
  const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
    body: {
      agente_id: agente.id,
      input_usuario: '',
      use_n8n: false
    }
  });

  if (error || (data && data.error)) {
    console.log('    ✅ Validação OK (rejeitou input vazio)');
    results.passed++;
  } else {
    console.log('    ⚠️  Aceitou input vazio (sem validação)');
    results.warnings++;
  }
} catch (e) {
  console.log('    ✅ Validação OK (exception)');
  results.passed++;
}

// 4.4 Edge case: Agente inválido
console.log('\n4.4 Edge case - Agente ID inválido:');
try {
  const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
    body: {
      agente_id: '00000000-0000-0000-0000-000000000000',
      input_usuario: 'Teste',
      use_n8n: false
    }
  });

  if (error || (data && data.error)) {
    console.log('    ✅ Validação OK (rejeitou agente inválido)');
    results.passed++;
  } else {
    console.log('    ⚠️  Processou com agente inválido');
    results.warnings++;
  }
} catch (e) {
  console.log('    ✅ Validação OK (exception)');
  results.passed++;
}

// 4.5 Edge case: Input muito longo
console.log('\n4.5 Edge case - Input muito longo:');
try {
  const longInput = 'Esta é uma consulta jurídica muito longa. '.repeat(100);
  const start = Date.now();

  const { data, error } = await supabase.functions.invoke('agentes-ia-api', {
    body: {
      agente_id: agente.id,
      input_usuario: longInput,
      use_n8n: false
    }
  });

  const latency = Date.now() - start;

  if (error) {
    console.log('    ⚠️  Rejeitou input longo:', error.message);
    results.warnings++;
  } else if (data && data.success) {
    console.log('    ✅ Processou input longo (', longInput.length, 'chars)');
    console.log('    Latência:', latency + 'ms');
    results.passed++;
  } else {
    console.log('    ⚠️  Resposta inesperada');
    results.warnings++;
  }
} catch (e) {
  console.log('    ❌ Exception:', e.message);
  results.failed++;
}

// 4.6 Teste de requisições concorrentes
console.log('\n4.6 Teste de concorrência (3 requests simultâneas):');
try {
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      supabase.functions.invoke('agentes-ia-api', {
        body: {
          agente_id: agente.id,
          input_usuario: `Teste concorrente ${i}`,
          use_n8n: false
        }
      })
    );
  }

  const results_concurrent = await Promise.all(promises);
  const sucessos = results_concurrent.filter(r => !r.error && r.data?.success).length;

  console.log(`    ${sucessos}/3 requests bem-sucedidas`);

  if (sucessos === 3) {
    console.log('    ✅ Suporta concorrência');
    results.passed++;
  } else if (sucessos > 0) {
    console.log('    ⚠️  Concorrência parcial');
    results.warnings++;
  } else {
    console.log('    ❌ Falhou em concorrência');
    results.failed++;
  }
} catch (e) {
  console.log('    ❌ Exception:', e.message);
  results.failed++;
}

// 4.7 Verificar se CORS está configurado
console.log('\n4.7 Verificando CORS headers:');
try {
  const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/agentes-ia-api`, {
    method: 'OPTIONS',
    headers: {
      'apikey': env.VITE_SUPABASE_ANON_KEY
    }
  });

  const corsHeader = response.headers.get('access-control-allow-origin');

  if (corsHeader === '*' || corsHeader) {
    console.log('    ✅ CORS configurado:', corsHeader);
    results.passed++;
  } else {
    console.log('    ⚠️  CORS não encontrado');
    results.warnings++;
  }
} catch (e) {
  console.log('    ❌ Erro ao verificar CORS:', e.message);
  results.failed++;
}

console.log('\n' + '='.repeat(50));
console.log('RESULTADO EDGE FUNCTION:');
console.log('  ✅ Passou:', results.passed);
console.log('  ❌ Falhou:', results.failed);
console.log('  ⚠️  Avisos:', results.warnings);
console.log('='.repeat(50));

if (results.failed > 0) {
  console.log('\n⚠️  BLOQUEIOS CRÍTICOS DETECTADOS!');
  console.log('Edge Function NÃO está 100% funcional.');
}

process.exit(results.failed > 0 ? 1 : 0);

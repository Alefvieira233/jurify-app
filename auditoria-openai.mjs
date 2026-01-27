import { readFileSync } from 'fs';
import OpenAI from 'openai';

const env = {};
readFileSync('.env', 'utf-8').split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  const value = valueParts.join('=').trim();
  if (key && value) env[key.trim()] = value;
});

console.log('\n=== AUDITORIA 2: OPENAI API INTEGRATION ===\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

// 2.1 Teste básico de completion
console.log('2.1 Teste básico de completion:');
try {
  const start = Date.now();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Responda apenas: OK' }],
    max_tokens: 10
  });

  const latency = Date.now() - start;
  const response = completion.choices[0]?.message?.content;

  console.log('    Resposta:', response);
  console.log('    Latência:', latency + 'ms');
  console.log('    Tokens:', completion.usage.total_tokens);

  if (response && latency < 5000) {
    console.log('    ✅ Funcionando (latência OK)');
    results.passed++;
  } else if (response) {
    console.log('    ⚠️  Funcionando mas lento (>' + latency + 'ms)');
    results.warnings++;
  } else {
    console.log('    ❌ Sem resposta');
    results.failed++;
  }
} catch (e) {
  console.log('    ❌', e.message);
  results.failed++;
}

// 2.2 Teste com prompt jurídico realista
console.log('\n2.2 Teste com prompt jurídico (caso real):');
try {
  const start = Date.now();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Você é um advogado trabalhista brasileiro. Responda de forma objetiva e prática.'
      },
      {
        role: 'user',
        content: 'Fui demitido sem justa causa. Tenho direito a FGTS?'
      }
    ],
    max_tokens: 200,
    temperature: 0.7
  });

  const latency = Date.now() - start;
  const response = completion.choices[0]?.message?.content;

  console.log('    Resposta (preview):', response?.substring(0, 100) + '...');
  console.log('    Latência:', latency + 'ms');
  console.log('    Tokens:', completion.usage.total_tokens);

  if (response && response.length > 50 && latency < 10000) {
    console.log('    ✅ Resposta jurídica adequada');
    results.passed++;
  } else {
    console.log('    ⚠️  Resposta incompleta ou muito lenta');
    results.warnings++;
  }
} catch (e) {
  console.log('    ❌', e.message);
  results.failed++;
}

// 2.3 Teste de handling de temperatura
console.log('\n2.3 Teste com diferentes temperaturas:');
const temperaturas = [0.3, 0.7, 1.0];
for (const temp of temperaturas) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Teste' }],
      max_tokens: 5,
      temperature: temp
    });

    console.log('    ✅ Temperatura', temp, '- OK');
    results.passed++;
  } catch (e) {
    console.log('    ❌ Temperatura', temp, '-', e.message);
    results.failed++;
  }
}

// 2.4 Teste de custo estimado
console.log('\n2.4 Validando cálculo de custos:');
try {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Teste de custo' }],
    max_tokens: 50
  });

  const promptTokens = completion.usage.prompt_tokens;
  const completionTokens = completion.usage.completion_tokens;

  // GPT-4o-mini pricing (aproximado)
  const costPerPromptToken = 0.00015 / 1000; // $0.15 per 1M tokens
  const costPerCompletionToken = 0.00060 / 1000; // $0.60 per 1M tokens

  const estimatedCost = (promptTokens * costPerPromptToken) + (completionTokens * costPerCompletionToken);

  console.log('    Prompt tokens:', promptTokens);
  console.log('    Completion tokens:', completionTokens);
  console.log('    Custo estimado: $' + estimatedCost.toFixed(6));

  if (estimatedCost > 0 && estimatedCost < 0.01) {
    console.log('    ✅ Custo dentro do esperado (<$0.01)');
    results.passed++;
  } else {
    console.log('    ⚠️  Custo fora do padrão');
    results.warnings++;
  }
} catch (e) {
  console.log('    ❌', e.message);
  results.failed++;
}

// 2.5 Teste de rate limiting (burst)
console.log('\n2.5 Teste de rate limiting (3 requests rápidas):');
try {
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Teste ' + i }],
        max_tokens: 5
      })
    );
  }

  const results_burst = await Promise.all(promises);
  console.log('    ✅ 3 requests processadas (sem rate limit)');
  results.passed++;
} catch (e) {
  if (e.message.includes('rate_limit')) {
    console.log('    ⚠️  Rate limit atingido (normal)');
    results.warnings++;
  } else {
    console.log('    ❌', e.message);
    results.failed++;
  }
}

console.log('\n' + '='.repeat(50));
console.log('RESULTADO OPENAI API:');
console.log('  ✅ Passou:', results.passed);
console.log('  ❌ Falhou:', results.failed);
console.log('  ⚠️  Avisos:', results.warnings);
console.log('='.repeat(50));

process.exit(results.failed > 0 ? 1 : 0);

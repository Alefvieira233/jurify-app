/**
 * 🤖 LOAD TEST 3: AI Agents Performance Test
 *
 * Testa processamento de agentes IA sob carga
 * - Target: 20 execuções concorrentes (limitado para economizar custos OpenAI)
 * - Duração: 3 minutos
 * - Objetivo: Verificar latência e throughput dos agentes
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Métricas customizadas
const aiExecutionFailures = new Rate('ai_execution_failures');
const aiExecutionDuration = new Trend('ai_execution_duration');
const aiTokensUsed = new Counter('ai_tokens_used');

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Warm up (economizar tokens)
    { duration: '2m', target: 20 },   // Peak load
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    ai_execution_duration: ['p(90)<10000'], // 90% das execuções < 10s
    ai_execution_failures: ['rate<0.1'],     // Taxa de falha < 10%
    http_req_duration: ['p(95)<12000'],      // 95% requests < 12s
  },
};

const SUPABASE_URL = __ENV.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = __ENV.VITE_SUPABASE_ANON_KEY || '';

// Teste payloads variados
const TEST_PROMPTS = [
  {
    agentName: 'qualifier',
    input: 'Cliente relata problema trabalhista, demissão sem justa causa.',
  },
  {
    agentName: 'legal',
    input: 'Análise de contrato de prestação de serviços com cláusula abusiva.',
  },
  {
    agentName: 'commercial',
    input: 'Proposta comercial para consultoria jurídica empresarial mensal.',
  },
  {
    agentName: 'analyst',
    input: 'Análise de histórico de leads convertidos nos últimos 30 dias.',
  },
];

export default function () {
  const prompt = TEST_PROMPTS[Math.floor(Math.random() * TEST_PROMPTS.length)];

  group('AI Agent Execution', function () {
    const startTime = Date.now();

    const payload = JSON.stringify({
      agent: prompt.agentName,
      prompt: prompt.input,
      leadId: `load-test-${Date.now()}`,
      temperature: 0.7,
    });

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    };

    const res = http.post(
      `${SUPABASE_URL}/functions/v1/agentes-ia-api`,
      payload,
      { headers, timeout: '30s' }
    );

    const duration = Date.now() - startTime;
    aiExecutionDuration.add(duration);

    const success = check(res, {
      'Execution status 200': (r) => r.status === 200,
      'Has response': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.response !== undefined;
        } catch {
          return false;
        }
      },
      'Execution < 15s': (r) => r.timings.duration < 15000,
    });

    if (!success) {
      aiExecutionFailures.add(1);
      console.error(`AI execution failed (${prompt.agentName}): ${res.status}`);
    } else {
      try {
        const body = JSON.parse(res.body);
        if (body.tokensUsed) {
          aiTokensUsed.add(body.tokensUsed);
        }
      } catch (e) {
        console.warn('Failed to parse response body');
      }
    }
  });

  // Think time (simular usuário lendo resposta)
  sleep(Math.random() * 5 + 3); // Random 3-8s
}

export function handleSummary(data) {
  const totalExecutions = data.metrics.http_reqs?.values.count || 0;
  const failureRate = (data.metrics.ai_execution_failures?.values.rate || 0) * 100;
  const avgDuration = data.metrics.ai_execution_duration?.values.avg || 0;
  const p90Duration = data.metrics.ai_execution_duration?.values['p(90)'] || 0;
  const totalTokens = data.metrics.ai_tokens_used?.values.count || 0;

  console.log('\n🤖 AI AGENTS PERFORMANCE TEST SUMMARY\n');
  console.log(`✅ Total Executions: ${totalExecutions}`);
  console.log(`⏱️  Avg Execution Time: ${(avgDuration / 1000).toFixed(2)}s`);
  console.log(`⏱️  P90 Execution Time: ${(p90Duration / 1000).toFixed(2)}s`);
  console.log(`❌ Failure Rate: ${failureRate.toFixed(2)}%`);
  console.log(`🪙 Total Tokens Used: ${totalTokens}`);
  console.log(`💰 Estimated Cost (GPT-4): $${(totalTokens * 0.00003).toFixed(4)}\n`);

  return {
    'load-test-ai-agents-summary.json': JSON.stringify(data, null, 2),
    'load-test-ai-agents-summary.html': generateHTMLReport(data),
  };
}

function generateHTMLReport(data) {
  const totalExecutions = data.metrics.http_reqs?.values.count || 0;
  const failureRate = (data.metrics.ai_execution_failures?.values.rate || 0) * 100;
  const avgDuration = data.metrics.ai_execution_duration?.values.avg || 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <title>K6 Load Test - AI Agents</title>
  <style>
    body { font-family: Arial; margin: 40px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    .metric { margin: 15px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #2196F3; border-radius: 4px; }
    .metric strong { color: #555; display: block; margin-bottom: 5px; }
    .metric .value { font-size: 24px; color: #333; }
    .pass { border-left-color: #4CAF50; }
    .fail { border-left-color: #f44336; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 AI Agents Performance Test</h1>
    <div class="metric ${failureRate < 10 ? 'pass' : 'fail'}">
      <strong>Failure Rate</strong>
      <div class="value">${failureRate.toFixed(2)}%</div>
    </div>
    <div class="metric">
      <strong>Total Executions</strong>
      <div class="value">${totalExecutions}</div>
    </div>
    <div class="metric">
      <strong>Average Execution Time</strong>
      <div class="value">${(avgDuration / 1000).toFixed(2)}s</div>
    </div>
  </div>
</body>
</html>
  `;
}

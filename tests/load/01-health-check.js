/**
 * 🔍 LOAD TEST 1: Health Check
 *
 * Testa disponibilidade básica da aplicação
 * - Target: 100 VUs por 30 segundos
 * - Objetivo: Verificar se servidor aguenta carga básica
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');

// Configuração do teste
export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp up: 20 VUs
    { duration: '30s', target: 100 }, // Stay: 100 VUs
    { duration: '10s', target: 0 },   // Ramp down: 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% das requests < 500ms
    http_req_failed: ['rate<0.01'],                  // Taxa de erro < 1%
    errors: ['rate<0.1'],                            // Taxa de erro customizada < 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const SUPABASE_URL = __ENV.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = __ENV.VITE_SUPABASE_ANON_KEY || '';

export default function () {
  // Test 1: Frontend health
  const frontendRes = http.get(BASE_URL);
  check(frontendRes, {
    'Frontend status 200': (r) => r.status === 200,
    'Frontend loads in <500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Supabase health check (edge function)
  const headers = {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
  };

  const healthRes = http.get(`${SUPABASE_URL}/functions/v1/health-check`, { headers });
  check(healthRes, {
    'Health check status 200': (r) => r.status === 200,
    'Health check < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(2);
}

export function handleSummary(data) {
  return {
    'load-test-health-check-summary.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>K6 Load Test - Health Check</title>
  <style>
    body { font-family: Arial; margin: 40px; }
    .metric { margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 5px; }
    .pass { background: #d4edda; }
    .fail { background: #f8d7da; }
  </style>
</head>
<body>
  <h1>Load Test Results - Health Check</h1>
  <div class="metric ${data.metrics.http_req_failed.values.rate < 0.01 ? 'pass' : 'fail'}">
    <strong>HTTP Failures:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
  </div>
  <div class="metric">
    <strong>Avg Response Time:</strong> ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
  </div>
  <div class="metric">
    <strong>P95 Response Time:</strong> ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
  </div>
  <div class="metric">
    <strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}
  </div>
</body>
</html>
  `;
}

function textSummary(data, options) {
  let summary = '\n📊 LOAD TEST SUMMARY - HEALTH CHECK\n\n';
  summary += `✅ Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `⏱️  Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `⏱️  P95 Duration: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `❌ Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  return summary;
}

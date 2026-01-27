/**
 * 🔐 LOAD TEST 2: Authentication Stress Test
 *
 * Testa sistema de autenticação sob carga
 * - Target: 50 usuários concorrentes
 * - Duração: 2 minutos
 * - Objetivo: Verificar se auth aguenta múltiplos logins simultâneos
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
const loginFailures = new Rate('login_failures');
const loginDuration = new Trend('login_duration');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Warm up
    { duration: '1m', target: 50 },   // Peak load
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    login_duration: ['p(95)<2000'],      // 95% dos logins < 2s
    login_failures: ['rate<0.05'],        // Taxa de falha < 5%
    http_req_duration: ['p(99)<3000'],   // 99% requests < 3s
  },
};

const SUPABASE_URL = __ENV.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = __ENV.VITE_SUPABASE_ANON_KEY || '';

// Test users (criar esses usuários no Supabase primeiro)
const TEST_USERS = [
  { email: 'loadtest1@jurify.com', password: 'LoadTest@2024' },
  { email: 'loadtest2@jurify.com', password: 'LoadTest@2024' },
  { email: 'loadtest3@jurify.com', password: 'LoadTest@2024' },
];

export default function () {
  // Selecionar usuário aleatório
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];

  group('Login Flow', function () {
    const startTime = Date.now();

    const payload = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    };

    const res = http.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, payload, { headers });

    const duration = Date.now() - startTime;
    loginDuration.add(duration);

    const success = check(res, {
      'Login status 200': (r) => r.status === 200,
      'Has access_token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.access_token !== undefined;
        } catch {
          return false;
        }
      },
      'Login < 2s': (r) => r.timings.duration < 2000,
    });

    if (!success) {
      loginFailures.add(1);
      console.error(`Login failed for ${user.email}: ${res.status}`);
    }

    // Simular navegação pós-login
    if (res.status === 200) {
      const token = JSON.parse(res.body).access_token;
      const authHeaders = {
        ...headers,
        'Authorization': `Bearer ${token}`,
      };

      // Fetch profile
      http.get(`${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${JSON.parse(res.body).user.id}`, { headers: authHeaders });
    }
  });

  sleep(Math.random() * 3 + 2); // Random 2-5s think time
}

export function handleSummary(data) {
  console.log('\n📊 AUTH STRESS TEST SUMMARY\n');
  console.log(`✅ Total Logins Attempted: ${data.metrics.http_reqs.values.count}`);
  console.log(`⏱️  Avg Login Duration: ${data.metrics.login_duration?.values.avg?.toFixed(2) || 'N/A'}ms`);
  console.log(`⏱️  P95 Login Duration: ${data.metrics.login_duration?.values['p(95)']?.toFixed(2) || 'N/A'}ms`);
  console.log(`❌ Login Failure Rate: ${((data.metrics.login_failures?.values.rate || 0) * 100).toFixed(2)}%\n`);

  return {
    'load-test-auth-summary.json': JSON.stringify(data, null, 2),
  };
}

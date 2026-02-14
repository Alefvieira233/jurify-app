#!/usr/bin/env node
// Jurify — Health check script for production verification

const https = require('https');
const http = require('http');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const APP_URL = process.env.VITE_APP_URL || process.argv[2];

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const start = Date.now();
    const req = mod.request(url, { method: 'GET', timeout: 10000, ...options }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, ms: Date.now() - start }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function main() {
  console.log('=== JURIFY HEALTH CHECK ===\n');
  let failures = 0;

  // 1. Check Supabase API
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await request(`${SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      if (res.status >= 200 && res.status < 400) {
        console.log(`  OK   Supabase API (${res.ms}ms)`);
      } else {
        console.log(`  FAIL Supabase API — HTTP ${res.status}`);
        failures++;
      }
    } catch (e) {
      console.log(`  FAIL Supabase API — ${e.message}`);
      failures++;
    }

    // 2. Check Edge Function health
    try {
      const res = await request(`${SUPABASE_URL}/functions/v1/health-check`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      if (res.status >= 200 && res.status < 400) {
        console.log(`  OK   Edge Functions (${res.ms}ms)`);
      } else {
        console.log(`  WARN Edge Functions — HTTP ${res.status} (may need deploy)`);
      }
    } catch (e) {
      console.log(`  WARN Edge Functions — ${e.message}`);
    }
  } else {
    console.log('  SKIP Supabase checks (no VITE_SUPABASE_URL set)');
  }

  // 3. Check frontend if URL provided
  if (APP_URL) {
    try {
      const res = await request(APP_URL);
      if (res.status >= 200 && res.status < 400) {
        console.log(`  OK   Frontend (${res.ms}ms)`);
      } else {
        console.log(`  FAIL Frontend — HTTP ${res.status}`);
        failures++;
      }
    } catch (e) {
      console.log(`  FAIL Frontend — ${e.message}`);
      failures++;
    }
  } else {
    console.log('  SKIP Frontend check (pass URL as argument or set VITE_APP_URL)');
  }

  console.log('\n---');
  if (failures === 0) {
    console.log('Health check PASSED');
  } else {
    console.log(`Health check: ${failures} failure(s)`);
    process.exit(1);
  }
}

main();

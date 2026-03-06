#!/usr/bin/env node
/**
 * Jurify — Validate Secrets / Environment Variables
 *
 * Verifies that all required environment variables are configured.
 * Works both locally (reads .env) and in CI (reads process.env).
 *
 * Usage:
 *   node scripts/validate-secrets.cjs          # local check
 *   node scripts/validate-secrets.cjs --ci     # CI mode (no .env file)
 */

const fs = require('fs');
const path = require('path');

const isCI = process.argv.includes('--ci') || process.env.CI === 'true';
const ROOT = path.resolve(__dirname, '..');

// ── Required for the app to function ────────────────────────────────
const REQUIRED = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

// ── Required for production deploy ──────────────────────────────────
const PRODUCTION = [
  'VITE_SENTRY_DSN',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_ENCRYPTION_KEY',
];

// ── Required for CI E2E tests ───────────────────────────────────────
const E2E = [
  'E2E_TEST_EMAIL',
  'E2E_TEST_PASSWORD',
];

// ── Required for deploy workflow (GitHub Secrets) ───────────────────
const DEPLOY = [
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
];

// ── Optional integrations ───────────────────────────────────────────
const OPTIONAL = [
  'VITE_GOOGLE_CLIENT_ID',
  'VITE_SALES_WHATSAPP',
  'EVOLUTION_API_KEY',
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ZAPSIGN_API_TOKEN',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
];

// ── Load .env file if not in CI ─────────────────────────────────────
let envVars = { ...process.env };

if (!isCI) {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (val && val !== '""' && val !== "''") {
        envVars[key] = val;
      }
    }
  } else {
    console.log('⚠️  .env file not found — checking process.env only\n');
  }
}

// ── Check variables ─────────────────────────────────────────────────
function check(label, vars, required) {
  const missing = [];
  const present = [];

  for (const v of vars) {
    if (envVars[v]) {
      present.push(v);
    } else {
      missing.push(v);
    }
  }

  const icon = missing.length === 0 ? '✅' : required ? '❌' : '⚠️';
  console.log(`${icon} ${label}: ${present.length}/${vars.length} configurados`);

  if (missing.length > 0) {
    for (const m of missing) {
      console.log(`   → falta: ${m}`);
    }
  }

  return { missing, present, required };
}

console.log(`\n=== JURIFY — Validação de Secrets (${isCI ? 'CI' : 'Local'}) ===\n`);

const results = [
  check('Obrigatórios (App)', REQUIRED, true),
  check('Produção', PRODUCTION, true),
  check('E2E Tests', E2E, false),
  check('Deploy (GitHub Secrets)', DEPLOY, false),
  check('Integrações (Opcional)', OPTIONAL, false),
];

const criticalMissing = results
  .filter(r => r.required)
  .flatMap(r => r.missing);

console.log('\n---');

if (criticalMissing.length === 0) {
  console.log('✅ Todas as variáveis obrigatórias estão configuradas!');
  console.log('\nℹ️  Para GitHub Secrets, configure em:');
  console.log('   Settings → Secrets and variables → Actions\n');
} else {
  console.log(`❌ ${criticalMissing.length} variável(is) obrigatória(s) faltando!`);
  console.log('\nConfigure no .env (local) ou GitHub Secrets (CI):\n');
  for (const v of criticalMissing) {
    console.log(`  export ${v}="seu_valor_aqui"`);
  }
  console.log('');
  if (!isCI) process.exit(1);
}

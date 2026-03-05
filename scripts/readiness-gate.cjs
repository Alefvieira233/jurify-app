#!/usr/bin/env node
/**
 * Jurify SaaS — Readiness Gate
 * Single pass/fail gate with machine-readable JSON output.
 * Produces a score 0-100 and exits non-zero if below threshold.
 *
 * Usage:
 *   node scripts/readiness-gate.cjs              # threshold=90 (default)
 *   node scripts/readiness-gate.cjs --threshold 80
 *   node scripts/readiness-gate.cjs --json        # JSON-only output
 *
 * Idempotent, safe for dry-run, CI-friendly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const thresholdIdx = args.indexOf('--threshold');
const THRESHOLD = thresholdIdx !== -1 ? parseInt(args[thresholdIdx + 1], 10) : 90;

function log(msg) {
  if (!jsonOnly) console.log(msg);
}

function run(cmd, opts = {}) {
  try {
    return {
      ok: true,
      output: execSync(cmd, {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120_000,
        stdio: ['pipe', 'pipe', 'pipe'],
        ...opts,
      }).trim(),
    };
  } catch (e) {
    return { ok: false, output: (e.stderr || e.stdout || e.message || '').trim() };
  }
}

const checks = [];
const startTime = Date.now();

// ── CHECK 1: TypeScript ──────────────────────────────────────────────
log('  [1/8] TypeScript type-check...');
const tsc = run('npx tsc --noEmit --skipLibCheck');
checks.push({
  name: 'typescript',
  pass: tsc.ok,
  weight: 15,
  detail: tsc.ok ? '0 errors' : tsc.output.split('\n').slice(-3).join(' '),
});

// ── CHECK 2: Unit tests ─────────────────────────────────────────────
log('  [2/8] Unit tests...');
const test = run('npx vitest run --reporter=verbose');
const testMatch = test.output.match(/(\d+) passed/);
const testCount = testMatch ? parseInt(testMatch[1], 10) : 0;
const testFailed = test.output.match(/(\d+) failed/);
const failCount = testFailed ? parseInt(testFailed[1], 10) : 0;
checks.push({
  name: 'unit-tests',
  pass: test.ok && failCount === 0,
  weight: 20,
  detail: `${testCount} passed, ${failCount} failed`,
});

// ── CHECK 3: Build ───────────────────────────────────────────────────
log('  [3/8] Production build...');
const build = run('npx vite build --mode production');
checks.push({
  name: 'build',
  pass: build.ok,
  weight: 15,
  detail: build.ok ? 'success' : 'build failed',
});

// ── CHECK 4: Bundle size ─────────────────────────────────────────────
log('  [4/8] Bundle size...');
let bundleSizeKB = 0;
const distDir = path.join(ROOT, 'dist', 'assets');
if (fs.existsSync(distDir)) {
  const jsFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.js') && !f.endsWith('.map'));
  for (const f of jsFiles) {
    bundleSizeKB += fs.statSync(path.join(distDir, f)).size / 1024;
  }
}
const bundleOk = bundleSizeKB > 0 && bundleSizeKB < 3072;
checks.push({
  name: 'bundle-size',
  pass: bundleOk,
  weight: 10,
  detail: `${Math.round(bundleSizeKB)}KB JS (limit: 3072KB)`,
});

// ── CHECK 5: Security audit ─────────────────────────────────────────
log('  [5/8] npm audit...');
const audit = run('npm audit --audit-level=high --omit=dev');
checks.push({
  name: 'npm-audit',
  pass: audit.ok,
  weight: 15,
  detail: audit.ok ? '0 high/critical' : 'vulnerabilities found',
});

// ── CHECK 6: Custom security scan ───────────────────────────────────
log('  [6/8] Custom security scan...');
const secScan = run('node scripts/security-audit.cjs');
checks.push({
  name: 'security-scan',
  pass: secScan.ok,
  weight: 10,
  detail: secScan.ok ? 'all checks passed' : 'issues found',
});

// ── CHECK 7: Critical files ─────────────────────────────────────────
log('  [7/8] Critical files...');
const criticalFiles = [
  'src/pages/Index.tsx',
  'src/pages/Pricing.tsx',
  'src/components/billing/SubscriptionManager.tsx',
  'src/features/whatsapp/WhatsAppEvolutionSetup.tsx',
  'src/features/ai-agents/AgentesIAManager.tsx',
  'src/features/scheduling/AgendamentosManager.tsx',
  'src/features/dashboard/Dashboard.tsx',
  'src/features/pipeline/PipelineJuridico.tsx',
  'src/lib/multiagents/core/MultiAgentSystem.ts',
  'supabase/functions/create-checkout-session/index.ts',
  'supabase/functions/health-check/index.ts',
  'supabase/functions/_shared/logger.ts',
  'supabase/functions/send-whatsapp-message/index.ts',
  'supabase/functions/evolution-manager/index.ts',
];
const missing = criticalFiles.filter(f => !fs.existsSync(path.join(ROOT, f)));
checks.push({
  name: 'critical-files',
  pass: missing.length === 0,
  weight: 10,
  detail: missing.length === 0 ? `${criticalFiles.length} present` : `missing: ${missing.join(', ')}`,
});

// ── CHECK 8: CI workflow integrity ──────────────────────────────────
log('  [8/8] CI workflow integrity...');
const ciFile = path.join(ROOT, '.github', 'workflows', 'ci.yml');
let ciOk = false;
let ciDetail = 'ci.yml not found';
if (fs.existsSync(ciFile)) {
  const ci = fs.readFileSync(ciFile, 'utf8');
  const hasPinnedTrufflehog = /trufflehog@v3\.\d+\.\d+/.test(ci);
  const hasNoContinueOnErrorSecurity = !/security-scan[\s\S]{0,500}continue-on-error:\s*true/.test(ci);
  const hasBundleGate = ci.includes('Enforce bundle size');
  ciOk = hasPinnedTrufflehog && hasNoContinueOnErrorSecurity && hasBundleGate;
  ciDetail = [
    hasPinnedTrufflehog ? 'trufflehog pinned' : 'trufflehog NOT pinned',
    hasNoContinueOnErrorSecurity ? 'security fail-closed' : 'security NOT fail-closed',
    hasBundleGate ? 'bundle gate present' : 'bundle gate MISSING',
  ].join(', ');
}
checks.push({
  name: 'ci-integrity',
  pass: ciOk,
  weight: 5,
  detail: ciDetail,
});

// ── SCORE CALCULATION ────────────────────────────────────────────────
const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
const earnedWeight = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
const score = Math.round((earnedWeight / totalWeight) * 100);
const passed = score >= THRESHOLD;
const duration = ((Date.now() - startTime) / 1000).toFixed(1);

// ── OUTPUT ───────────────────────────────────────────────────────────
const report = {
  timestamp: new Date().toISOString(),
  score,
  threshold: THRESHOLD,
  verdict: passed ? 'PASS' : 'FAIL',
  duration: `${duration}s`,
  checks: checks.map(c => ({
    name: c.name,
    status: c.pass ? 'PASS' : 'FAIL',
    weight: c.weight,
    detail: c.detail,
  })),
};

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     JURIFY SAAS — READINESS GATE         ║');
  console.log('╚══════════════════════════════════════════╝\n');

  for (const c of checks) {
    const icon = c.pass ? '✅' : '❌';
    console.log(`  ${icon}  ${c.name.padEnd(18)} ${c.detail}`);
  }

  console.log(`\n  Score: ${score}/100 (threshold: ${THRESHOLD})`);
  console.log(`  Duration: ${duration}s`);
  console.log(`  Verdict: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
}

process.exit(passed ? 0 : 1);

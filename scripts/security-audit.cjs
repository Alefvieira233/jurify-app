#!/usr/bin/env node
// Jurify — Custom security audit script

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let issues = 0;

function check(label, passed, detail) {
  if (passed) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label} — ${detail}`);
    issues++;
  }
}

console.log('=== JURIFY SECURITY AUDIT ===\n');

// 1. Check no secrets in VITE_ env vars
console.log('[Env Vars]');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  const env = fs.readFileSync(envFile, 'utf8');
  const forbidden = ['SERVICE_ROLE', 'SECRET_KEY', 'sk-', 'sk_live', 'PRIVATE_KEY'];
  const viteLines = env.split('\n').filter(l => l.startsWith('VITE_') && !l.startsWith('#'));
  let envClean = true;
  for (const line of viteLines) {
    for (const pattern of forbidden) {
      if (line.includes(pattern)) {
        check(`VITE_ var contains "${pattern}"`, false, line.split('=')[0]);
        envClean = false;
      }
    }
  }
  if (envClean) check('No secrets in VITE_ variables', true);
} else {
  // In CI/containers, .env might not exist by design. Not a security failure.
  check('.env file optional in CI/local container', true);
}

// 2. Check .gitignore includes .env
console.log('\n[Git Safety]');
const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
check('.env in .gitignore', gitignore.includes('.env'));
check('.env.secrets in .gitignore', gitignore.includes('.env.secrets'));
check('.env.production in .gitignore', gitignore.includes('.env.production'));

// 3. Check no console.log in production build config
console.log('\n[Build Config]');
const viteConfig = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8');
check('console.log dropped in prod', viteConfig.includes("drop: isProd ? ['console'") || viteConfig.includes("drop: isProd ? [\"console\""));
check('sourcemap set to hidden', viteConfig.includes("sourcemap: 'hidden'") || viteConfig.includes('sourcemap: "hidden"'));

// 4. Check security headers in vercel.json
console.log('\n[Security Headers]');
const vercelJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const headerEntries = Array.isArray(vercelJson.headers) ? vercelJson.headers : [];
const headerKeys = headerEntries
  .flatMap((entry) => Array.isArray(entry.headers) ? entry.headers : [])
  .map(h => h.key);
check('X-Content-Type-Options', headerKeys.includes('X-Content-Type-Options'));
check('X-Frame-Options', headerKeys.includes('X-Frame-Options'));
check('Strict-Transport-Security', headerKeys.includes('Strict-Transport-Security'));
check('Content-Security-Policy', headerKeys.includes('Content-Security-Policy'));
check('Referrer-Policy', headerKeys.includes('Referrer-Policy'));
check('Permissions-Policy', headerKeys.includes('Permissions-Policy'));

// 5. Check no hardcoded keys in source
console.log('\n[Source Code]');
const SCAN_DIRS = ['src', 'supabase', 'scripts', '.github'];
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const EXCLUDE_FILES = new Set(['/src/tests/setup.ts']);

function scanDir(dir, patterns) {
  const found = [];
  if (!fs.existsSync(dir)) return found;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !EXCLUDE_DIRS.has(entry.name)) {
      found.push(...scanDir(fullPath, patterns));
    } else if (entry.isFile() && /\.(ts|tsx|js)$/.test(entry.name)) {
      const normalizedPath = fullPath.replace(ROOT, '').replace(/\\/g, '/');
      if (EXCLUDE_FILES.has(normalizedPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const { pattern, label } of patterns) {
        if (pattern.test(content)) {
          found.push({ file: normalizedPath, label });
        }
      }
    }
  }
  return found;
}

const dangerousPatterns = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/, label: 'OpenAI API key' },
  { pattern: /sk_live_[a-zA-Z0-9]+/, label: 'Stripe live key' },
  { pattern: /\b(sb_secret|sbp)_[A-Za-z0-9_-]{20,}\b/, label: 'Supabase secret key token' },
  { pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"](?:eyJ|sb_secret|sbp)/, label: 'Hardcoded Supabase service role key' },
  { pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9._-]{50,}/, label: 'Hardcoded JWT' },
];

const findings = SCAN_DIRS.flatMap((dir) => scanDir(path.join(ROOT, dir), dangerousPatterns));
if (findings.length === 0) {
  check('No hardcoded secrets in scanned dirs (src/supabase/scripts/.github)', true);
} else {
  for (const f of findings) {
    check(`${f.label} in ${f.file}`, false, 'Remove hardcoded secret');
  }
}

// Summary
console.log('\n---');
if (issues === 0) {
  console.log('Security audit PASSED — 0 issues found');
  process.exit(0);
} else {
  console.log(`Security audit FAILED — ${issues} issue(s) found`);
  process.exit(1);
}

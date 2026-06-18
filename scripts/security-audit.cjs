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
  console.log('  INFO  .env file not found — skipping local env check');
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
// Check all header blocks to find security headers (often defined for /(.*))
const allHeaders = (vercelJson.headers || []).flatMap(h => h.headers || []);
const headerKeys = allHeaders.map(h => h.key);
check('X-Content-Type-Options', headerKeys.includes('X-Content-Type-Options'), 'Check vercel.json headers');
check('X-Frame-Options', headerKeys.includes('X-Frame-Options'), 'Check vercel.json headers');
check('Strict-Transport-Security', headerKeys.includes('Strict-Transport-Security'), 'Check vercel.json headers');
check('Content-Security-Policy', headerKeys.includes('Content-Security-Policy'), 'Check vercel.json headers');
check('Referrer-Policy', headerKeys.includes('Referrer-Policy'), 'Check vercel.json headers');
check('Permissions-Policy', headerKeys.includes('Permissions-Policy'), 'Check vercel.json headers');

// 5. Check no hardcoded keys in source
console.log('\n[Source Code]');
const srcDir = path.join(ROOT, 'src');
function scanDir(dir, patterns) {
  const found = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // Ignore node_modules and test directories to avoid false positives
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'tests' && entry.name !== '__tests__') {
      found.push(...scanDir(fullPath, patterns));
    } else if (entry.isFile() && /\.(ts|tsx|js)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const { pattern, label } of patterns) {
        if (pattern.test(content)) {
          found.push({ file: fullPath.replace(ROOT, ''), label });
        }
      }
    }
  }
  return found;
}

const dangerousPatterns = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/, label: 'OpenAI API key' },
  { pattern: /sk_live_[a-zA-Z0-9]+/, label: 'Stripe live key' },
  { pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9._-]{50,}/, label: 'Hardcoded JWT' },
];

const findings = scanDir(srcDir, dangerousPatterns);
if (findings.length === 0) {
  check('No hardcoded secrets in src/', true);
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

#!/usr/bin/env node
/**
 * Local secrets scanner — run before committing.
 * Scans src/, supabase/, scripts/, .github/ for known dangerous patterns.
 * Exits 1 if anything is found. Safe to run offline.
 *
 * Usage: node scripts/check-secrets.cjs  OR  npm run check:secrets
 */

const fs = require('fs');
const path = require('path');

const SCAN_DIRS = ['src', 'supabase', 'scripts', '.github'];
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'tests', 'integration']);
const EXCLUDE_FILES = new Set([
  // Known fake test fixtures
  path.join('src', 'tests', 'setup.ts'),
]);

const PATTERNS = [
  {
    name: 'Supabase/JWT token',
    regex: /eyJ[a-zA-Z0-9_-]{30,}\.eyJ[a-zA-Z0-9_-]{30,}\.[a-zA-Z0-9_-]{20,}/g,
    allowInTest: true,
    allowInSnippet: /stripe-test-redaction-key/i,
  },
  {
    name: 'OpenAI API key',
    regex: /sk-[a-zA-Z0-9_-]{20,}/g,
  },
  {
    name: 'Stripe key',
    regex: /(sk|pk|rk)_(live|test)_[a-zA-Z0-9]{20,}/g,
  },
  {
    name: 'Google OAuth client secret',
    regex: /GOCSPX-[a-zA-Z0-9_-]{28,}/g,
  },
  {
    name: 'Supabase service role literal',
    regex: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]eyJ/g,
  },
];

const issues = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    if (EXCLUDE_FILES.has(full)) continue;
    // Skip .env files — they are expected to hold secrets and must be gitignored, not source-scanned.
    // If an .env is about to be committed, git will block it via .gitignore and the CI check.
    if (/^\.env(\..+)?$/.test(entry.name)) continue;
    // Skip binary-ish extensions
    if (/\.(png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot|pdf|zip|lock)$/i.test(entry.name)) continue;

    let content;
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }

    // Skip files over 2MB
    if (content.length > 2_000_000) continue;

    for (const p of PATTERNS) {
      p.regex.lastIndex = 0;
      let match;
      while ((match = p.regex.exec(content)) !== null) {
        const line = content.slice(0, match.index).split('\n').length;
        const snippet = content.split('\n')[line - 1].trim().slice(0, 120);

        // Allow fake test tokens containing obvious markers
        if (p.allowInTest && /test-key|supabase-test|fake|example|abcde/i.test(snippet)) continue;
        if (/sk_live_abcde/i.test(snippet)) continue;

        issues.push({
          file: full.replace(/\\/g, '/'),
          line,
          pattern: p.name,
          snippet,
        });
      }
    }
  }
}

console.log('🔍 Scanning for secrets in:', SCAN_DIRS.join(', '));
for (const dir of SCAN_DIRS) {
  if (fs.existsSync(dir)) walk(dir);
}

if (issues.length === 0) {
  console.log('✅ No secrets detected in scanned directories.');
  process.exit(0);
}

console.error('❌ Potential secrets detected:');
for (const i of issues) {
  console.error(`  ${i.file}:${i.line}  [${i.pattern}]`);
  console.error(`    ${i.snippet}`);
}
console.error('');
console.error(`Found ${issues.length} issue(s). Move values to env vars before committing.`);
process.exit(1);

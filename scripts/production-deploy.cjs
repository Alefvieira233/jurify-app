#!/usr/bin/env node
// Jurify — Production deploy script

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  console.log(`  > ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function preDeployChecks() {
  console.log('\n[1/5] Pre-deploy checks...');

  // Verify required env vars exist (only public frontend vars)
  const envFile = path.join(ROOT, '.env');
  if (!fs.existsSync(envFile)) {
    console.error('ERROR: .env file not found. Copy .env.example and fill in values.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envFile, 'utf8');
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing = required.filter(v => !envContent.includes(`${v}=`) || envContent.includes(`${v}=https://YOUR`));

  if (missing.length > 0) {
    console.error(`ERROR: Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Ensure no secrets are exposed in VITE_ vars
  const lines = envContent.split('\n').filter(l => l.startsWith('VITE_'));
  const dangerousPatterns = ['SERVICE_ROLE', 'SECRET_KEY', 'OPENAI_API_KEY', 'PRIVATE_KEY'];
  for (const line of lines) {
    for (const pattern of dangerousPatterns) {
      if (line.includes(pattern)) {
        console.error(`SECURITY ERROR: "${pattern}" found in a VITE_ variable. Server secrets must NEVER be in frontend env.`);
        process.exit(1);
      }
    }
  }

  console.log('  Pre-deploy checks passed');
}

function runQualityGates() {
  console.log('\n[2/5] Quality gates...');
  run('npm run lint');
  run('npm run type-check');
  run('npm test -- --run');
  console.log('  Quality gates passed');
}

function securityAudit() {
  console.log('\n[3/5] Security audit...');
  try {
    run('npm audit --audit-level=high');
    console.log('  Security audit passed');
  } catch {
    console.warn('  WARNING: npm audit found issues — review before deploying');
  }
}

function buildProduction() {
  console.log('\n[4/5] Building for production...');
  run('npm run build');

  const distPath = path.join(ROOT, 'dist');
  if (!fs.existsSync(distPath)) {
    console.error('ERROR: Build failed — dist/ directory not found');
    process.exit(1);
  }

  // Report bundle size
  const files = fs.readdirSync(path.join(distPath, 'assets')).filter(f => f.endsWith('.js'));
  let totalSize = 0;
  for (const f of files) {
    const size = fs.statSync(path.join(distPath, 'assets', f)).size;
    totalSize += size;
  }
  console.log(`  Build complete — ${files.length} JS chunks, ${(totalSize / 1024 / 1024).toFixed(2)} MB total`);
}

function postBuildReport() {
  console.log('\n[5/5] Post-build report...');
  console.log('  -----------------------------------------------');
  console.log('  DEPLOY CHECKLIST:');
  console.log('  -----------------------------------------------');
  console.log('  [ ] Configure GitHub Secrets (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.)');
  console.log('  [ ] Configure Supabase Edge Function Secrets (OPENAI_API_KEY, STRIPE_SECRET_KEY, etc.)');
  console.log('  [ ] Deploy Edge Functions: supabase functions deploy');
  console.log('  [ ] Run migrations: supabase db push');
  console.log('  [ ] Deploy frontend: vercel --prod OR upload dist/ to hosting');
  console.log('  [ ] Verify health: curl https://your-domain.com/health');
  console.log('  -----------------------------------------------');
  console.log('  dist/ folder is ready for deployment.');
}

async function main() {
  const startTime = Date.now();
  console.log('=== JURIFY PRODUCTION DEPLOY ===');

  preDeployChecks();
  runQualityGates();
  securityAudit();
  buildProduction();
  postBuildReport();

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone in ${duration}s`);
}

if (require.main === module) {
  main();
}

module.exports = { main };

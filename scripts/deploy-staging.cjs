#!/usr/bin/env node
// Jurify — Staging deploy script

const { execSync } = require('child_process');

function run(cmd) {
  console.log(`  > ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

console.log('=== JURIFY STAGING DEPLOY ===\n');

console.log('[1/3] Building for staging...');
run('npm run build:staging');

console.log('\n[2/3] Running smoke tests...');
run('npm test -- --run');

console.log('\n[3/3] Deploying...');
// Vercel preview deploy (non-prod)
try {
  run('npx vercel');
  console.log('\nStaging deploy complete.');
} catch {
  console.log('\nVercel CLI not configured. Upload dist/ manually to staging environment.');
  console.log('Alternatives:');
  console.log('  npx netlify deploy --dir=dist');
  console.log('  npx vercel --confirm');
}

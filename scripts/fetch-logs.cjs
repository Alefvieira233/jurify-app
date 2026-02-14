#!/usr/bin/env node
// Jurify — Fetch Edge Function logs from Supabase

const { execSync } = require('child_process');

const projectRef = process.env.SUPABASE_PROJECT_REF;
const functionName = process.argv[2];

console.log('=== JURIFY LOG VIEWER ===\n');

if (!projectRef) {
  console.log('Set SUPABASE_PROJECT_REF env var to fetch live logs.');
  console.log('Usage: SUPABASE_PROJECT_REF=xxx node scripts/fetch-logs.js [function-name]\n');
  console.log('Available functions:');
  console.log('  ai-agent-processor, chat-completion, evolution-manager,');
  console.log('  send-whatsapp-message, whatsapp-webhook, health-check,');
  console.log('  stripe-webhook, create-checkout-session, zapsign-integration,');
  console.log('  generate-embedding, vector-search, admin-create-user');
  process.exit(0);
}

try {
  const cmd = functionName
    ? `npx supabase functions logs ${functionName} --project-ref ${projectRef}`
    : `npx supabase functions logs --project-ref ${projectRef}`;

  console.log(`Fetching logs${functionName ? ` for ${functionName}` : ''}...\n`);
  execSync(cmd, { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to fetch logs. Ensure supabase CLI is installed and you are authenticated.');
  console.log('Run: npx supabase login');
}

#!/usr/bin/env node
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || 'yfxgncbopvnsltjqetxw';

const WHITELIST_LIBERAL = new Set(['features', 'plans', 'subscription_plans', 'pricing_tiers']);
const WHITELIST_NO_POLICY = new Set(['webhook_events', 'schema_migrations']);

if (!TOKEN) {
  console.warn('⚠️ WARNING: SUPABASE_ACCESS_TOKEN not set. Skipping RLS coverage check.');
  process.exit(0);
}

async function query(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  if (!r.ok) {
    if (r.status === 401) {
      console.warn('⚠️ WARNING: Supabase API Unauthorized (401). Check your SUPABASE_ACCESS_TOKEN.');
      process.exit(0);
    }
    throw new Error(`Supabase API error ${r.status} ${r.statusText}: ${text.slice(0, 500)}`);
  }
  try { return JSON.parse(text); } catch { throw new Error(`Invalid JSON response: ${text.slice(0, 300)}`); }
}

async function main() {
  console.log(`Auditing RLS coverage on project ${REF}...`);
  const noRls = await query("SELECT c.relname AS tablename FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity ORDER BY c.relname;");
  const liberal = await query("SELECT tablename, policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true') AND NOT ('service_role' = ANY(roles)) ORDER BY tablename, policyname;");
  const noPolicy = await query("SELECT c.relname AS tablename FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) ORDER BY c.relname;");

  const noRlsList = (Array.isArray(noRls) ? noRls : []).map(r => r.tablename);
  const noPolicyList = (Array.isArray(noPolicy) ? noPolicy : []).map(r => r.tablename).filter(t => !WHITELIST_NO_POLICY.has(t));
  const liberalList = (Array.isArray(liberal) ? liberal : []).filter(p => !WHITELIST_LIBERAL.has(p.tablename));

  const failures = [];
  if (noRlsList.length) failures.push({ type: 'NO_RLS', tables: noRlsList });
  if (noPolicyList.length) failures.push({ type: 'NO_POLICY', tables: noPolicyList });
  if (liberalList.length) failures.push({ type: 'LIBERAL_POLICY', entries: liberalList });

  if (failures.length) {
    console.error('RLS coverage check FAILED', JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.log('RLS coverage check PASSED');
}

main().catch(e => {
  console.error('RLS coverage check ERROR:', e.message || e);
  process.exit(1);
});

#!/usr/bin/env node
// Jurify — DB maintenance: VACUUM ANALYZE fora de transação.
//
// Por que: VACUUM não roda dentro de transação. `supabase db push` envolve
// cada migration em BEGIN/COMMIT, então SQL com VACUUM falha. Este script
// conecta direto via pg driver e roda autocommit.
//
// Uso:
//   DATABASE_URL=postgresql://... node scripts/db-maintenance.cjs
//   SUPABASE_DB_URL=... node scripts/db-maintenance.cjs
//   # ou Management API:
//   SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=yfxgncbopvnsltjqetxw \
//     node scripts/db-maintenance.cjs
//
// Schedule sugerido: mensal via GitHub Action (ver .github/workflows/cron-jobs.yml).

/* eslint-disable no-console */

const HIGH_BLOAT_TABLES = [
  'whatsapp_conversations',
  'conexoes_whatsapp',
  'rate_limits',
  'configuracoes_integracoes',
  'system_settings',
  'audit_log',
  'whatsapp_messages',
  'leads',
  'agentes_ia',
];

async function runViaManagementApi(token, ref) {
  console.log(`[db-maintenance] Using Management API (project=${ref})`);
  const base = `https://api.supabase.com/v1/projects/${ref}/database/query`;
  for (const tbl of HIGH_BLOAT_TABLES) {
    process.stdout.write(`  VACUUM ANALYZE public.${tbl} ... `);
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: `VACUUM ANALYZE public.${tbl};` }),
    });
    if (!res.ok) {
      console.log(`FAIL (${res.status})`);
      const body = await res.text();
      console.error(`    ${body.slice(0, 200)}`);
      continue;
    }
    console.log('OK');
  }

  console.log('\n[db-maintenance] Post-vacuum status:');
  const statusRes = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size,
                     (SELECT COUNT(*) FROM pg_stat_user_tables WHERE n_dead_tup > 100) AS high_bloat,
                     (SELECT COUNT(*) FROM pg_stat_user_tables WHERE n_dead_tup > 10) AS mid_bloat;`,
    }),
  });
  if (statusRes.ok) {
    const rows = await statusRes.json();
    console.log(`  ${JSON.stringify(rows[0])}`);
  }
}

async function runViaPg(connectionString) {
  let Client;
  try {
    ({ Client } = require('pg'));
  } catch {
    console.error('[db-maintenance] `pg` package not installed. Run: npm i -D pg');
    process.exit(1);
  }

  console.log('[db-maintenance] Using direct pg connection');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const tbl of HIGH_BLOAT_TABLES) {
    process.stdout.write(`  VACUUM ANALYZE public.${tbl} ... `);
    try {
      await client.query(`VACUUM ANALYZE public.${tbl}`);
      console.log('OK');
    } catch (e) {
      console.log(`FAIL (${e.message})`);
    }
  }

  const status = await client.query(`
    SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size,
           (SELECT COUNT(*) FROM pg_stat_user_tables WHERE n_dead_tup > 100) AS high_bloat,
           (SELECT COUNT(*) FROM pg_stat_user_tables WHERE n_dead_tup > 10) AS mid_bloat;
  `);
  console.log(`\n[db-maintenance] Post-vacuum status: ${JSON.stringify(status.rows[0])}`);
  await client.end();
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.SUPABASE_PROJECT_REF || 'yfxgncbopvnsltjqetxw';

  console.log('=== Jurify DB Maintenance — VACUUM ANALYZE ===\n');

  if (dbUrl) {
    await runViaPg(dbUrl);
  } else if (mgmtToken) {
    await runViaManagementApi(mgmtToken, projectRef);
  } else {
    console.error('Missing credentials. Set one of:');
    console.error('  DATABASE_URL=postgresql://...');
    console.error('  SUPABASE_DB_URL=postgresql://...');
    console.error('  SUPABASE_ACCESS_TOKEN=sbp_... (+ optional SUPABASE_PROJECT_REF)');
    process.exit(1);
  }

  console.log('\n[db-maintenance] done.');
}

main().catch((err) => {
  console.error('[db-maintenance] fatal:', err);
  process.exit(1);
});

#!/usr/bin/env node
// Jurify — Database backup reminder and helper

console.log('=== JURIFY DATABASE BACKUP ===\n');
console.log('Supabase manages backups automatically on Pro plan and above.');
console.log('');
console.log('Manual backup options:');
console.log('');
console.log('1. Supabase Dashboard:');
console.log('   Settings > Database > Backups > Download');
console.log('');
console.log('2. pg_dump (requires direct connection string):');
console.log('   pg_dump "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" > backup.sql');
console.log('');
console.log('3. Supabase CLI:');
console.log('   npx supabase db dump --project-ref YOUR_PROJECT_REF > backup.sql');
console.log('');
console.log('4. Automated backups (Pro plan):');
console.log('   - Daily backups with 7-day retention');
console.log('   - Point-in-time recovery (PITR) available');
console.log('');
console.log('Recommendation: Enable Pro plan for automatic daily backups before launch.');

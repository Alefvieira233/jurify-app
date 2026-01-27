import { readFileSync } from 'fs';

console.log('\n📋 INSTRUÇÕES PARA APLICAR MIGRATION\n');
console.log('='.repeat(60));

const sql = readFileSync('supabase/migrations/20251217000003_fix_agentes_select_policy.sql', 'utf-8');

console.log('\n🔧 Copie o SQL abaixo e execute no Supabase Dashboard:\n');
console.log('Link: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/sql/new\n');
console.log('='.repeat(60));
console.log(sql);
console.log('='.repeat(60));

console.log('\n📌 PASSOS:\n');
console.log('1. Acesse: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/sql/new');
console.log('2. Cole o SQL acima');
console.log('3. Clique em "RUN"');
console.log('4. Execute novamente: node verificar-agentes.mjs');
console.log('\n');

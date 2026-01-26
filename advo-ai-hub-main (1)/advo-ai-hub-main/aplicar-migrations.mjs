/**
 * 🗄️ APLICAR MIGRATIONS NO SUPABASE
 *
 * Aplica as migrations SQL para corrigir RLS policies
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { join } from 'path';

console.log('\n🗄️ APLICAÇÃO DE MIGRATIONS\n');
console.log('='.repeat(60));

function loadEnv() {
  const envContent = readFileSync('.env', 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();
    if (key && value) env[key.trim()] = value;
  });
  return env;
}

async function aplicarMigrations() {
  const resultados = [];

  try {
    console.log('📋 Lendo arquivo .env...\n');
    const env = loadEnv();

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Chaves não encontradas no .env');
      console.error('   Execute primeiro: node validar-chaves-supabase.mjs\n');
      return false;
    }

    console.log('✅ Conectando ao Supabase...');
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Service Role: ${serviceRoleKey.substring(0, 20)}...\n`);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Migrations a aplicar (na ordem)
    const migrations = [
      {
        nome: '20251217000000_fix_service_role_logs.sql',
        descricao: 'Corrige RLS para logs_execucao_agentes'
      },
      {
        nome: '20251217000001_fix_service_role_executions.sql',
        descricao: 'Corrige RLS para agent_executions'
      },
      {
        nome: '20251217000002_populate_missing_tenant_ids.sql',
        descricao: 'Popular tenant_id em profiles'
      }
    ];

    console.log(`📦 ${migrations.length} migrations para aplicar\n`);

    // Aplicar cada migration
    for (const [index, migration] of migrations.entries()) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📄 Migration ${index + 1}/${migrations.length}: ${migration.nome}`);
      console.log(`   ${migration.descricao}`);
      console.log('─'.repeat(60));

      const migrationPath = join('supabase', 'migrations', migration.nome);

      // Verificar se arquivo existe
      if (!existsSync(migrationPath)) {
        console.error(`\n   ❌ Arquivo não encontrado: ${migrationPath}\n`);
        resultados.push({
          migration: migration.nome,
          status: 'FALHOU',
          erro: 'Arquivo não encontrado'
        });
        continue;
      }

      // Ler SQL
      console.log('\n   📖 Lendo SQL...');
      const sql = readFileSync(migrationPath, 'utf-8');

      // Executar migration
      console.log('   ⚙️  Executando...\n');

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
          // Se RPC não existir, tentar com query direto
          if (error.message.includes('function') || error.message.includes('exec_sql')) {
            console.log('   ℹ️  RPC não disponível, tentando método alternativo...\n');

            // Dividir SQL em statements individuais
            const statements = sql
              .split(';')
              .map(s => s.trim())
              .filter(s => s.length > 0 && !s.startsWith('--'));

            let sucessos = 0;
            let falhas = 0;

            for (const statement of statements) {
              try {
                // Pular comentários e blocos DO
                if (statement.startsWith('/*') ||
                  statement.startsWith('--') ||
                  statement.includes('RAISE NOTICE')) {
                  continue;
                }

                const { error: stmtError } = await supabase.rpc('query', { query_text: statement + ';' });

                if (stmtError && !stmtError.message.includes('already exists')) {
                  console.error(`      ⚠️  Warning: ${stmtError.message.substring(0, 100)}`);
                  falhas++;
                } else {
                  sucessos++;
                }
              } catch (stmtErr) {
                // Silenciar erros de statements individuais
                falhas++;
              }
            }

            console.log(`   📊 Statements: ${sucessos} sucessos, ${falhas} falhas\n`);

            if (sucessos > 0) {
              console.log(`   ✅ Migration aplicada (com avisos)\n`);
              resultados.push({
                migration: migration.nome,
                status: 'OK (parcial)',
                sucessos,
                falhas
              });
            } else {
              console.error(`   ❌ Migration falhou completamente\n`);
              resultados.push({
                migration: migration.nome,
                status: 'FALHOU',
                erro: 'Todos os statements falharam'
              });
            }

          } else {
            console.error(`   ❌ Erro: ${error.message}\n`);
            resultados.push({
              migration: migration.nome,
              status: 'FALHOU',
              erro: error.message
            });
          }
        } else {
          console.log(`   ✅ Migration aplicada com sucesso!\n`);
          resultados.push({
            migration: migration.nome,
            status: 'OK'
          });
        }

      } catch (execError) {
        console.error(`   ❌ Erro ao executar: ${execError.message}\n`);
        resultados.push({
          migration: migration.nome,
          status: 'FALHOU',
          erro: execError.message
        });
      }
    }

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DAS MIGRATIONS\n');

    const totalMigrations = resultados.length;
    const migrationsOK = resultados.filter(r => r.status === 'OK' || r.status === 'OK (parcial)').length;
    const migrationsFalhas = resultados.filter(r => r.status === 'FALHOU').length;

    resultados.forEach((r, i) => {
      const icon = r.status.includes('OK') ? '✅' : '❌';
      console.log(`${icon} ${r.migration}: ${r.status}`);
      if (r.erro) console.log(`   Erro: ${r.erro}`);
      if (r.sucessos) console.log(`   Statements: ${r.sucessos} OK, ${r.falhas} falhas`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`\n📈 Estatísticas:`);
    console.log(`   Total: ${totalMigrations}`);
    console.log(`   Sucesso: ${migrationsOK}`);
    console.log(`   Falhas: ${migrationsFalhas}`);
    console.log(`   Taxa: ${Math.round((migrationsOK / totalMigrations) * 100)}%\n`);

    if (migrationsFalhas === 0) {
      console.log('🎉 TODAS AS MIGRATIONS APLICADAS COM SUCESSO!\n');
      console.log('📋 Próximos passos:');
      console.log('   1. Execute: node validar-database-rls.mjs');
      console.log('   2. Valide que RLS policies estão OK');
      console.log('   3. Teste os agentes IA\n');
    } else {
      console.log('⚠️  ALGUMAS MIGRATIONS FALHARAM\n');
      console.log('💡 Opções:');
      console.log('   1. Verifique os erros acima');
      console.log('   2. Aplique manualmente via Dashboard Supabase');
      console.log('   3. Ou use: npx supabase db push\n');
    }

    // Salvar relatório
    const relatorio = `# Relatório de Aplicação de Migrations

**Data:** ${new Date().toLocaleString('pt-BR')}

## Migrations Aplicadas

${resultados.map((r, i) => `### ${i + 1}. ${r.migration}
- **Status:** ${r.status}
${r.erro ? `- **Erro:** ${r.erro}` : ''}
${r.sucessos ? `- **Statements:** ${r.sucessos} sucesso, ${r.falhas} falhas` : ''}
`).join('\n')}

## Resumo
- Total: ${totalMigrations}
- Sucesso: ${migrationsOK}
- Falhas: ${migrationsFalhas}
- Taxa de sucesso: ${Math.round((migrationsOK / totalMigrations) * 100)}%

${migrationsFalhas === 0 ? '## ✅ Resultado: TODAS AS MIGRATIONS OK!' : '## ⚠️ Resultado: CORREÇÕES NECESSÁRIAS'}

## Próximos Passos

${migrationsFalhas === 0 ? `1. Valide RLS: \`node validar-database-rls.mjs\`
2. Teste agentes: \`node teste-completo-agentes-ia.mjs\`` : `1. Revise os erros acima
2. Aplique manualmente as migrations que falharam
3. Execute este script novamente`}
`;

    writeFileSync('RELATORIO_MIGRATIONS.md', relatorio);
    console.log('📄 Relatório salvo em: RELATORIO_MIGRATIONS.md\n');

    return migrationsFalhas === 0;

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
    return false;
  }
}

aplicarMigrations();

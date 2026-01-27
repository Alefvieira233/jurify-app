/**
 * 🔐 VALIDAR RLS POLICIES NO BANCO DE DADOS
 *
 * Testa se as RLS policies permitem inserções via SERVICE_ROLE
 */

import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

console.log('\n🔐 VALIDAÇÃO DE RLS POLICIES\n');
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

async function validar() {
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

    console.log('✅ Chaves carregadas');
    console.log('   URL:', supabaseUrl);
    console.log('   Service Role: ' + serviceRoleKey.substring(0, 20) + '...\n');

    // Criar cliente com SERVICE_ROLE (bypassa RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Tabelas a testar
    const tabelas = [
      {
        nome: 'logs_execucao_agentes',
        dados: {
          agente_id: '00000000-0000-0000-0000-000000000000',
          input_recebido: 'Teste de RLS',
          resposta_ia: 'Resposta de teste',
          status: 'success',
          tempo_execucao: 100,
          api_key_usado: 'test-key'
        }
      },
      {
        nome: 'agent_ai_logs',
        dados: {
          agent_name: 'test-agent',
          tenant_id: '00000000-0000-0000-0000-000000000000',
          model: 'gpt-4o-mini',
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
          result_preview: 'Teste de RLS'
        }
      },
      {
        nome: 'agent_executions',
        dados: {
          execution_id: 'test-exec-' + Date.now(),
          tenant_id: '00000000-0000-0000-0000-000000000000',
          status: 'pending',
          current_agent: 'test-agent',
          agents_involved: ['test-agent'],
          total_agents_used: 1
        }
      }
    ];

    // Testar cada tabela
    for (const tabela of tabelas) {
      console.log(`\n📋 Testando: ${tabela.nome}`);
      console.log('   ' + '-'.repeat(40));

      try {
        // Tentar INSERT
        const { data, error } = await supabase
          .from(tabela.nome)
          .insert([tabela.dados])
          .select();

        if (error) {
          console.error(`   ❌ BLOQUEADO: ${error.message}`);

          if (error.message.includes('auth.uid') || error.message.includes('policy')) {
            console.error(`\n   💡 CAUSA: Policy exige auth.uid() mas SERVICE_ROLE não tem uid`);
            console.error(`   💡 SOLUÇÃO: Criar policy para service role:`);
            console.error(`\n   CREATE POLICY "service_role_insert_${tabela.nome}"`);
            console.error(`     ON public.${tabela.nome}`);
            console.error(`     FOR INSERT`);
            console.error(`     WITH CHECK (true);\n`);
          }

          resultados.push({
            tabela: tabela.nome,
            status: 'BLOQUEADO',
            erro: error.message,
            precisaFix: true
          });
        } else {
          console.log('   ✅ INSERT PERMITIDO');

          // Limpar registro de teste
          if (data && data.length > 0) {
            const id = data[0].id;
            await supabase
              .from(tabela.nome)
              .delete()
              .eq('id', id);
            console.log('   🧹 Registro de teste removido');
          }

          resultados.push({
            tabela: tabela.nome,
            status: 'OK',
            precisaFix: false
          });
        }

      } catch (err) {
        console.error(`   ❌ ERRO: ${err.message}`);
        resultados.push({
          tabela: tabela.nome,
          status: 'ERRO',
          erro: err.message,
          precisaFix: true
        });
      }
    }

    // Resumo
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA VALIDAÇÃO DE RLS\n');

    const totalTabelas = resultados.length;
    const tabelasOK = resultados.filter(r => r.status === 'OK').length;
    const tabelasBloqueadas = resultados.filter(r => r.status === 'BLOQUEADO').length;
    const tabelasErro = resultados.filter(r => r.status === 'ERRO').length;

    resultados.forEach(r => {
      const icon = r.status === 'OK' ? '✅' : '❌';
      console.log(`${icon} ${r.tabela}: ${r.status}`);
      if (r.erro) console.log(`   Erro: ${r.erro}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`\n📈 Estatísticas:`);
    console.log(`   Total de tabelas: ${totalTabelas}`);
    console.log(`   Tabelas OK: ${tabelasOK}`);
    console.log(`   Tabelas bloqueadas: ${tabelasBloqueadas}`);
    console.log(`   Tabelas com erro: ${tabelasErro}\n`);

    if (tabelasBloqueadas > 0 || tabelasErro > 0) {
      console.log('⚠️  AÇÃO NECESSÁRIA:\n');
      console.log('   Tabelas bloqueadas precisam de policies corrigidas.');
      console.log('   Execute: node aplicar-migrations.mjs\n');
    } else {
      console.log('🎉 TODAS AS TABELAS PERMITEM INSERT VIA SERVICE_ROLE!\n');
    }

    // Salvar relatório
    const relatorio = `# Relatório de Validação de RLS Policies

**Data:** ${new Date().toLocaleString('pt-BR')}

## Resultados por Tabela

${resultados.map((r, i) => `### ${i + 1}. ${r.tabela}
- **Status:** ${r.status}
${r.erro ? `- **Erro:** ${r.erro}` : ''}
${r.precisaFix ? `- **Precisa Fix:** ✅ Sim` : `- **Precisa Fix:** ❌ Não`}
`).join('\n')}

## Resumo
- Total de tabelas testadas: ${totalTabelas}
- Tabelas OK: ${tabelasOK}
- Tabelas bloqueadas: ${tabelasBloqueadas}
- Tabelas com erro: ${tabelasErro}
- Taxa de sucesso: ${Math.round((tabelasOK / totalTabelas) * 100)}%

${tabelasBloqueadas === 0 && tabelasErro === 0 ? '## ✅ Resultado: TODAS AS POLÍTICAS OK!' : '## ⚠️ Resultado: CORREÇÕES NECESSÁRIAS\n\nExecute as migrations para corrigir as policies bloqueadas.'}

## Próximos Passos

${tabelasBloqueadas > 0 || tabelasErro > 0 ? `1. Execute: \`node aplicar-migrations.mjs\`
2. Aguarde confirmação
3. Execute este script novamente para validar` : 'Nenhuma ação necessária. Sistema pronto para uso!'}
`;

    writeFileSync('RELATORIO_RLS_POLICIES.md', relatorio);
    console.log('📄 Relatório salvo em: RELATORIO_RLS_POLICIES.md\n');

    return tabelasBloqueadas === 0 && tabelasErro === 0;

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
    return false;
  }
}

validar();

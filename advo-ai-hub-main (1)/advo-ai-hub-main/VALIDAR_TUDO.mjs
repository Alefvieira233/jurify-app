/**
 * 🎯 VALIDAÇÃO COMPLETA DO SISTEMA JURIFY
 *
 * Executa TODOS os scripts de validação e teste em sequência
 * Gera relatório consolidado final
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

console.log('\n🎯 VALIDAÇÃO COMPLETA DO SISTEMA JURIFY\n');
console.log('='.repeat(60));

const scripts = [
  {
    id: '1',
    nome: 'Validar Chaves Supabase',
    arquivo: 'validar-chaves-supabase.mjs',
    critico: true,
    descricao: 'Verifica se as chaves JWT do Supabase estão corretas'
  },
  {
    id: '2',
    nome: 'Validar OpenAI API Key',
    arquivo: 'validar-openai-api-key.mjs',
    critico: true,
    descricao: 'Testa se a OpenAI API Key está funcionando'
  },
  {
    id: '3',
    nome: 'Validar RLS Policies',
    arquivo: 'validar-database-rls.mjs',
    critico: true,
    descricao: 'Verifica se service role pode inserir em todas as tabelas'
  },
  {
    id: '4',
    nome: 'Validar tenant_id',
    arquivo: 'validar-tenant-id-profiles.mjs',
    critico: false,
    descricao: 'Verifica se todos os profiles têm tenant_id'
  },
  {
    id: '5',
    nome: 'Testar Agentes IA',
    arquivo: 'teste-completo-agentes-ia.mjs',
    critico: true,
    descricao: 'Teste end-to-end de execução de agente'
  },
  {
    id: '6',
    nome: 'Testar Mission Control',
    arquivo: 'teste-mission-control-realtime.mjs',
    critico: false,
    descricao: 'Teste de updates em tempo real'
  }
];

const resultados = [];
let scriptAtual = 0;

console.log(`📋 ${scripts.length} testes a executar\n`);

async function executarScript(script) {
  return new Promise((resolve) => {
    console.log(`\n${'━'.repeat(60)}`);
    console.log(`🧪 ${script.id}/${scripts.length}: ${script.nome}`);
    console.log(`   ${script.descricao}`);
    console.log(`   Arquivo: ${script.arquivo}`);
    console.log(`   Crítico: ${script.critico ? 'SIM' : 'Não'}`);
    console.log('━'.repeat(60));
    console.log();

    const startTime = Date.now();

    const child = spawn('node', [script.arquivo], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const status = code === 0 ? 'OK' : 'FALHOU';

      resultados.push({
        script: script.nome,
        arquivo: script.arquivo,
        status,
        critico: script.critico,
        duracao: duration,
        exitCode: code
      });

      if (code === 0) {
        console.log(`\n✅ ${script.nome} - PASSOU (${Math.round(duration / 1000)}s)\n`);
      } else {
        console.log(`\n❌ ${script.nome} - FALHOU (${Math.round(duration / 1000)}s)\n`);

        if (script.critico) {
          console.log('⚠️  Este teste é CRÍTICO. Sistema pode não funcionar corretamente.\n');
        }
      }

      resolve();
    });

    child.on('error', (err) => {
      console.error(`\n❌ Erro ao executar script: ${err.message}\n`);

      resultados.push({
        script: script.nome,
        arquivo: script.arquivo,
        status: 'ERRO',
        critico: script.critico,
        duracao: Date.now() - startTime,
        erro: err.message
      });

      resolve();
    });
  });
}

async function validarTudo() {
  const startTotal = Date.now();

  // Executar cada script em sequência
  for (const script of scripts) {
    await executarScript(script);
    scriptAtual++;
  }

  const durationTotal = Date.now() - startTotal;

  // ========================================
  // RESUMO FINAL
  // ========================================
  console.log('\n' + '═'.repeat(60));
  console.log('🎯 VALIDAÇÃO COMPLETA FINALIZADA');
  console.log('═'.repeat(60));
  console.log();

  const totalScripts = resultados.length;
  const scriptsOK = resultados.filter(r => r.status === 'OK').length;
  const scriptsFalhos = resultados.filter(r => r.status === 'FALHOU').length;
  const scriptsErro = resultados.filter(r => r.status === 'ERRO').length;
  const criticosFalhos = resultados.filter(r => r.critico && r.status !== 'OK').length;

  console.log('📊 RESUMO GERAL\n');

  resultados.forEach((r, i) => {
    const icon = r.status === 'OK' ? '✅' : r.status === 'FALHOU' ? '❌' : '⚠️';
    const critico = r.critico ? ' [CRÍTICO]' : '';
    const tempo = Math.round(r.duracao / 1000);

    console.log(`${icon} ${r.script}${critico}`);
    console.log(`   Status: ${r.status} | Tempo: ${tempo}s`);
    if (r.erro) console.log(`   Erro: ${r.erro}`);
    console.log();
  });

  console.log('═'.repeat(60));
  console.log();
  console.log('📈 ESTATÍSTICAS:\n');
  console.log(`   Total de testes: ${totalScripts}`);
  console.log(`   Sucesso: ${scriptsOK} ✅`);
  console.log(`   Falhas: ${scriptsFalhos} ❌`);
  console.log(`   Erros: ${scriptsErro} ⚠️`);
  console.log(`   Taxa de sucesso: ${Math.round((scriptsOK / totalScripts) * 100)}%`);
  console.log(`   Tempo total: ${Math.round(durationTotal / 1000)}s\n`);

  console.log('═'.repeat(60));
  console.log();

  // Avaliar status geral
  if (criticosFalhos === 0 && scriptsOK === totalScripts) {
    console.log('🎉 SISTEMA 100% OPERACIONAL!\n');
    console.log('✅ CHAVES SUPABASE       [OK]');
    console.log('✅ OPENAI API KEY        [OK]');
    console.log('✅ RLS POLICIES          [OK]');
    console.log('✅ TENANT_ID             [OK]');
    console.log('✅ EDGE FUNCTIONS        [OK]');
    console.log('✅ MISSION CONTROL       [OK]');
    console.log();
    console.log('═'.repeat(60));
    console.log();
    console.log('🚀 PRÓXIMOS PASSOS:\n');
    console.log('   1. Acesse: http://localhost:3000');
    console.log('   2. Faça login no sistema');
    console.log('   3. Navegue para Agentes IA');
    console.log('   4. Selecione um agente e teste');
    console.log('   5. Veja Mission Control em tempo real\n');

  } else if (criticosFalhos === 0) {
    console.log('✅ SISTEMA OPERACIONAL (com alertas não críticos)\n');
    console.log(`⚠️  ${scriptsFalhos + scriptsErro} teste(s) não críticos falharam\n`);
    console.log('💡 O sistema está funcionando mas pode ser melhorado\n');

  } else {
    console.log('⚠️  SISTEMA COM PROBLEMAS CRÍTICOS\n');
    console.log(`❌ ${criticosFalhos} teste(s) críticos falharam\n`);
    console.log('🔧 AÇÕES NECESSÁRIAS:\n');

    const chavesSupabaseFalhou = resultados.find(r =>
      r.arquivo === 'validar-chaves-supabase.mjs' && r.status !== 'OK'
    );

    const openAIFalhou = resultados.find(r =>
      r.arquivo === 'validar-openai-api-key.mjs' && r.status !== 'OK'
    );

    const rlsFalhou = resultados.find(r =>
      r.arquivo === 'validar-database-rls.mjs' && r.status !== 'OK'
    );

    const agentesFalhou = resultados.find(r =>
      r.arquivo === 'teste-completo-agentes-ia.mjs' && r.status !== 'OK'
    );

    if (chavesSupabaseFalhou) {
      console.log('   1️⃣ Corrigir chaves Supabase:');
      console.log('      - Acesse: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/api');
      console.log('      - Copie as chaves JWT corretas');
      console.log('      - Atualize o .env\n');
    }

    if (openAIFalhou) {
      console.log('   2️⃣ Corrigir OpenAI API Key:');
      console.log('      - Verifique se a chave está correta');
      console.log('      - Teste em: https://platform.openai.com/api-keys');
      console.log('      - Atualize o .env\n');
    }

    if (rlsFalhou) {
      console.log('   3️⃣ Corrigir RLS Policies:');
      console.log('      - Execute: node aplicar-migrations.mjs');
      console.log('      - Aguarde conclusão');
      console.log('      - Valide novamente\n');
    }

    if (agentesFalhou) {
      console.log('   4️⃣ Testar agentes novamente:');
      console.log('      - Execute: node teste-completo-agentes-ia.mjs');
      console.log('      - Verifique os logs de erro');
      console.log('      - Corrija os problemas encontrados\n');
    }

    console.log('   📝 Após corrigir, execute novamente: node VALIDAR_TUDO.mjs\n');
  }

  // Salvar relatório consolidado
  const relatorio = `# Relatório Final de Validação - Jurify v2.0

**Data:** ${new Date().toLocaleString('pt-BR')}
**Duração Total:** ${Math.round(durationTotal / 1000)}s

## Resumo Executivo

${criticosFalhos === 0 && scriptsOK === totalScripts ? `### ✅ SISTEMA 100% OPERACIONAL

Todos os testes passaram com sucesso. O sistema está pronto para uso.` : criticosFalhos === 0 ? `### ✅ SISTEMA OPERACIONAL (com alertas)

Sistema funcional, mas ${scriptsFalhos + scriptsErro} teste(s) não críticos falharam.` : `### ⚠️ SISTEMA COM PROBLEMAS CRÍTICOS

${criticosFalhos} teste(s) críticos falharam. Correções necessárias antes do uso.`}

## Estatísticas

| Métrica | Valor |
|---------|-------|
| Total de testes | ${totalScripts} |
| Sucesso | ${scriptsOK} ✅ |
| Falhas | ${scriptsFalhos} ❌ |
| Erros | ${scriptsErro} ⚠️ |
| Taxa de sucesso | ${Math.round((scriptsOK / totalScripts) * 100)}% |
| Tempo total | ${Math.round(durationTotal / 1000)}s |

## Resultados Detalhados

${resultados.map((r, i) => `### ${i + 1}. ${r.script} ${r.critico ? '⚡ CRÍTICO' : ''}
- **Status:** ${r.status}
- **Arquivo:** \`${r.arquivo}\`
- **Duração:** ${Math.round(r.duracao / 1000)}s
${r.erro ? `- **Erro:** ${r.erro}` : ''}
${r.exitCode !== undefined ? `- **Exit Code:** ${r.exitCode}` : ''}
`).join('\n')}

## Próximos Passos

${criticosFalhos === 0 && scriptsOK === totalScripts ? `### Sistema Pronto!

1. Acesse: http://localhost:3000
2. Faça login
3. Teste os Agentes IA
4. Monitore via Mission Control

### Arquivos de Log Gerados

- \`RELATORIO_VALIDACAO_CHAVES.md\`
- \`RELATORIO_VALIDACAO_OPENAI.md\`
- \`RELATORIO_RLS_POLICIES.md\`
- \`RELATORIO_TENANT_ID.md\`
- \`RELATORIO_TESTE_AGENTES_IA.md\`
- \`RELATORIO_TESTE_MISSION_CONTROL.md\`
- \`RELATORIO_FINAL_VALIDACAO.md\` (este arquivo)` : `### Correções Necessárias

${resultados.filter(r => r.status !== 'OK').map(r => `- ${r.script}: ${r.status === 'FALHOU' ? 'Falhou' : 'Erro'}`).join('\n')}

Execute os scripts de correção e rode novamente: \`node VALIDAR_TUDO.mjs\``}

---

**Gerado por:** VALIDAR_TUDO.mjs
**Jurify v2.0** - Sistema de Gestão Jurídica com IA
`;

  writeFileSync('RELATORIO_FINAL_VALIDACAO.md', relatorio);
  console.log('📄 Relatório consolidado salvo em: RELATORIO_FINAL_VALIDACAO.md\n');

  process.exit(criticosFalhos > 0 ? 1 : 0);
}

validarTudo();

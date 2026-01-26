/**
 * 🤖 VALIDAR OPENAI API KEY
 *
 * Valida se a OpenAI API Key está configurada e funcionando
 */

import { readFileSync, writeFileSync } from 'fs';
import OpenAI from 'openai';

console.log('\n🤖 VALIDAÇÃO DA OPENAI API KEY\n');
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
  let apiKey = null;

  try {
    console.log('📋 Lendo arquivo .env...\n');
    const env = loadEnv();

    // 1. Verificar se existe
    console.log('1️⃣ Verificando OPENAI_API_KEY...');
    apiKey = env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('   ❌ OPENAI_API_KEY não encontrada no .env\n');
      console.error('   💡 SOLUÇÃO:');
      console.error('   1. Acesse: https://platform.openai.com/api-keys');
      console.error('   2. Crie ou copie uma API key');
      console.error('   3. Adicione no .env linha 14: OPENAI_API_KEY=sk-...\n');
      resultados.push({ teste: 'OPENAI_API_KEY existe', status: 'FALHOU', erro: 'Não encontrada' });
      return false;
    }

    // 2. Verificar formato
    if (!apiKey.startsWith('sk-')) {
      console.error('   ❌ Formato inválido! API key deve começar com "sk-"\n');
      console.error('   Formato atual:', apiKey.substring(0, 20) + '...\n');
      resultados.push({ teste: 'Formato da chave', status: 'FALHOU', erro: 'Não começa com sk-' });
      return false;
    }

    console.log('   ✅ Chave encontrada e formato válido\n');
    resultados.push({ teste: 'OPENAI_API_KEY existe', status: 'OK' });
    resultados.push({ teste: 'Formato da chave', status: 'OK' });

    // 3. Testar chamada à API
    console.log('2️⃣ Testando chamada à OpenAI API...');
    console.log('   Enviando prompt de teste...\n');

    const openai = new OpenAI({ apiKey });

    const startTime = Date.now();

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Responda apenas "OK" se você estiver funcionando.'
          }
        ],
        max_tokens: 10,
        temperature: 0
      });

      const latencia = Date.now() - startTime;
      const resposta = completion.choices[0].message.content;
      const tokens = completion.usage.total_tokens;

      console.log('   ✅ API respondeu com sucesso!');
      console.log(`   Resposta: "${resposta}"`);
      console.log(`   Latência: ${latencia}ms`);
      console.log(`   Tokens usados: ${tokens}`);
      console.log(`   Modelo: ${completion.model}\n`);

      resultados.push({
        teste: 'Chamada à API',
        status: 'OK',
        latencia: `${latencia}ms`,
        tokens,
        modelo: completion.model
      });

      // 4. Verificar se latência está razoável
      console.log('3️⃣ Verificando performance...');

      if (latencia > 5000) {
        console.warn('   ⚠️  Latência alta (>5s). Pode haver problemas de rede.\n');
        resultados.push({ teste: 'Performance', status: 'ATENÇÃO', valor: 'Latência alta' });
      } else if (latencia > 3000) {
        console.log('   ⚠️  Latência moderada (>3s). Aceitável mas não ideal.\n');
        resultados.push({ teste: 'Performance', status: 'OK', valor: 'Latência moderada' });
      } else {
        console.log('   ✅ Latência excelente (<3s)\n');
        resultados.push({ teste: 'Performance', status: 'OK', valor: 'Latência excelente' });
      }

    } catch (apiError) {
      console.error('   ❌ Erro na chamada à API:', apiError.message);

      if (apiError.status === 401) {
        console.error('\n   💡 ERRO 401: API Key inválida ou expirada');
        console.error('   Solução:');
        console.error('   1. Verifique se a chave está correta');
        console.error('   2. Acesse https://platform.openai.com/api-keys');
        console.error('   3. Crie uma nova chave se necessário\n');
      } else if (apiError.status === 429) {
        console.error('\n   💡 ERRO 429: Rate limit excedido');
        console.error('   Você atingiu o limite de requisições');
        console.error('   Aguarde alguns minutos e tente novamente\n');
      } else if (apiError.status === 500) {
        console.error('\n   💡 ERRO 500: Problema no servidor da OpenAI');
        console.error('   Tente novamente em alguns minutos\n');
      }

      resultados.push({
        teste: 'Chamada à API',
        status: 'FALHOU',
        erro: apiError.message,
        statusCode: apiError.status
      });

      return false;
    }

    // Resumo final
    console.log('='.repeat(60));
    console.log('📊 RESUMO DA VALIDAÇÃO\n');

    const totalTestes = resultados.length;
    const testesOK = resultados.filter(r => r.status === 'OK').length;
    const testesFalhos = resultados.filter(r => r.status === 'FALHOU').length;

    resultados.forEach((r, i) => {
      const icon = r.status === 'OK' ? '✅' : r.status === 'FALHOU' ? '❌' : '⚠️';
      console.log(`${icon} ${r.teste}: ${r.status}`);
      if (r.erro) console.log(`   Erro: ${r.erro}`);
      if (r.valor) console.log(`   ${r.valor}`);
      if (r.latencia) console.log(`   Latência: ${r.latencia}`);
    });

    console.log('\n' + '='.repeat(60));

    if (testesFalhos === 0) {
      console.log('🎉 OPENAI API KEY ESTÁ VÁLIDA E FUNCIONANDO!\n');
    } else {
      console.log(`⚠️  ${testesFalhos}/${totalTestes} teste(s) falharam\n`);
    }

    // Salvar relatório
    const relatorio = `# Relatório de Validação da OpenAI API Key

**Data:** ${new Date().toLocaleString('pt-BR')}

## Resultados

${resultados.map((r, i) => `### ${i + 1}. ${r.teste}
- **Status:** ${r.status}
${r.erro ? `- **Erro:** ${r.erro}` : ''}
${r.latencia ? `- **Latência:** ${r.latencia}` : ''}
${r.tokens ? `- **Tokens:** ${r.tokens}` : ''}
${r.modelo ? `- **Modelo:** ${r.modelo}` : ''}
${r.statusCode ? `- **HTTP Status:** ${r.statusCode}` : ''}
`).join('\n')}

## Resumo
- Total de testes: ${totalTestes}
- Testes OK: ${testesOK}
- Testes falhados: ${testesFalhos}
- Taxa de sucesso: ${Math.round((testesOK / totalTestes) * 100)}%

${testesFalhos === 0 ? '## ✅ Resultado: API KEY VÁLIDA E OPERACIONAL!' : '## ⚠️ Resultado: CORREÇÕES NECESSÁRIAS'}
`;

    writeFileSync('RELATORIO_VALIDACAO_OPENAI.md', relatorio);
    console.log('📄 Relatório salvo em: RELATORIO_VALIDACAO_OPENAI.md\n');

    return testesFalhos === 0;

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
    return false;
  }
}

validar();

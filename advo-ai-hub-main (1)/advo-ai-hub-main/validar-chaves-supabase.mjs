/**
 * 🔑 VALIDAR CHAVES SUPABASE
 *
 * Valida se as chaves do Supabase no .env estão corretas
 */

import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

console.log('\n🔑 VALIDAÇÃO DE CHAVES SUPABASE\n');
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

function isValidJWT(token) {
  // JWT tem 3 partes separadas por .
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  // Primeira parte deve começar com eyJ (base64 de {"alg":...)
  if (!parts[0].startsWith('eyJ')) return false;

  return true;
}

async function validar() {
  const resultados = [];

  try {
    console.log('📋 Lendo arquivo .env...\n');
    const env = loadEnv();

    // 1. Validar VITE_SUPABASE_URL
    console.log('1️⃣ Validando VITE_SUPABASE_URL...');
    const supabaseUrl = env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      console.error('   ❌ VITE_SUPABASE_URL não encontrada no .env\n');
      resultados.push({ teste: 'VITE_SUPABASE_URL', status: 'FALHOU', erro: 'Não encontrada' });
    } else if (!supabaseUrl.includes('supabase.co')) {
      console.error('   ❌ URL inválida:', supabaseUrl);
      console.error('   Deve conter: .supabase.co\n');
      resultados.push({ teste: 'VITE_SUPABASE_URL', status: 'FALHOU', erro: 'Formato inválido' });
    } else {
      console.log('   ✅ URL válida:', supabaseUrl, '\n');
      resultados.push({ teste: 'VITE_SUPABASE_URL', status: 'OK', valor: supabaseUrl });
    }

    // 2. Validar VITE_SUPABASE_ANON_KEY (CRÍTICO)
    console.log('2️⃣ Validando VITE_SUPABASE_ANON_KEY...');
    const anonKey = env.VITE_SUPABASE_ANON_KEY;

    if (!anonKey) {
      console.error('   ❌ VITE_SUPABASE_ANON_KEY não encontrada no .env\n');
      resultados.push({ teste: 'VITE_SUPABASE_ANON_KEY', status: 'FALHOU', erro: 'Não encontrada' });
    } else if (!isValidJWT(anonKey)) {
      console.error('   ❌ CHAVE INVÁLIDA DETECTADA!\n');
      console.error('   Formato atual:', anonKey.substring(0, 30) + '...');
      console.error('   Formato esperado: eyJhbGciOiJIUzI1NiIsInR5cCI6...\n');
      console.error('   💡 SOLUÇÃO:');
      console.error('   1. Acesse: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/api');
      console.error('   2. Procure por "anon public" ou "Project API keys"');
      console.error('   3. Copie a chave JWT (muito longa, começa com eyJ)');
      console.error('   4. Cole no .env linha 6\n');
      resultados.push({ teste: 'VITE_SUPABASE_ANON_KEY', status: 'FALHOU', erro: 'Não é JWT válido' });
    } else {
      console.log('   ✅ Formato JWT válido\n');
      resultados.push({ teste: 'VITE_SUPABASE_ANON_KEY', status: 'OK' });
    }

    // 3. Validar SUPABASE_SERVICE_ROLE_KEY
    console.log('3️⃣ Validando SUPABASE_SERVICE_ROLE_KEY...');
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error('   ❌ SUPABASE_SERVICE_ROLE_KEY não encontrada no .env\n');
      resultados.push({ teste: 'SUPABASE_SERVICE_ROLE_KEY', status: 'FALHOU', erro: 'Não encontrada' });
    } else if (!isValidJWT(serviceRoleKey)) {
      console.error('   ❌ CHAVE INVÁLIDA DETECTADA!\n');
      console.error('   Formato atual:', serviceRoleKey.substring(0, 30) + '...');
      console.error('   Formato esperado: eyJhbGciOiJIUzI1NiIsInR5cCI6...\n');
      console.error('   💡 SOLUÇÃO:');
      console.error('   1. Acesse: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/api');
      console.error('   2. Procure por "service_role" (secret)');
      console.error('   3. Copie a chave JWT (muito longa, começa com eyJ)');
      console.error('   4. Cole no .env linha 7\n');
      resultados.push({ teste: 'SUPABASE_SERVICE_ROLE_KEY', status: 'FALHOU', erro: 'Não é JWT válido' });
    } else {
      console.log('   ✅ Formato JWT válido\n');
      resultados.push({ teste: 'SUPABASE_SERVICE_ROLE_KEY', status: 'OK' });
    }

    // 4. Testar conexão (se chaves válidas)
    if (supabaseUrl && isValidJWT(anonKey)) {
      console.log('4️⃣ Testando conexão com Supabase...');

      try {
        const supabase = createClient(supabaseUrl, anonKey);

        // Tentar query simples
        const { data, error } = await supabase
          .from('agentes_ia')
          .select('id')
          .limit(1);

        if (error) {
          console.error('   ❌ Erro ao conectar:', error.message);
          if (error.message.includes('JWT')) {
            console.error('   💡 A chave ANON_KEY pode estar incorreta\n');
          }
          resultados.push({ teste: 'Conexão Supabase', status: 'FALHOU', erro: error.message });
        } else {
          console.log('   ✅ Conexão estabelecida com sucesso!\n');
          resultados.push({ teste: 'Conexão Supabase', status: 'OK' });
        }
      } catch (err) {
        console.error('   ❌ Erro ao testar conexão:', err.message, '\n');
        resultados.push({ teste: 'Conexão Supabase', status: 'FALHOU', erro: err.message });
      }
    } else {
      console.log('4️⃣ ⏭️  Pulando teste de conexão (chaves inválidas)\n');
      resultados.push({ teste: 'Conexão Supabase', status: 'PULADO', erro: 'Chaves inválidas' });
    }

    // Resumo final
    console.log('='.repeat(60));
    console.log('📊 RESUMO DA VALIDAÇÃO\n');

    const totalTestes = resultados.length;
    const testesOK = resultados.filter(r => r.status === 'OK').length;
    const testesFalhos = resultados.filter(r => r.status === 'FALHOU').length;

    resultados.forEach((r, i) => {
      const icon = r.status === 'OK' ? '✅' : r.status === 'FALHOU' ? '❌' : '⏭️';
      console.log(`${icon} ${r.teste}: ${r.status}`);
      if (r.erro) console.log(`   Erro: ${r.erro}`);
    });

    console.log('\n' + '='.repeat(60));

    if (testesFalhos === 0) {
      console.log('🎉 TODAS AS CHAVES ESTÃO VÁLIDAS!\n');
    } else {
      console.log(`⚠️  ${testesFalhos}/${totalTestes} teste(s) falharam\n`);
      console.log('💡 Corrija as chaves seguindo as instruções acima\n');
    }

    // Salvar relatório
    const relatorio = `# Relatório de Validação de Chaves Supabase

**Data:** ${new Date().toLocaleString('pt-BR')}

## Resultados

${resultados.map((r, i) => `### ${i + 1}. ${r.teste}
- **Status:** ${r.status}
${r.erro ? `- **Erro:** ${r.erro}` : ''}
${r.valor ? `- **Valor:** ${r.valor}` : ''}
`).join('\n')}

## Resumo
- Total de testes: ${totalTestes}
- Testes OK: ${testesOK}
- Testes falhados: ${testesFalhos}
- Taxa de sucesso: ${Math.round((testesOK / totalTestes) * 100)}%

${testesFalhos === 0 ? '## ✅ Resultado: TODAS AS CHAVES VÁLIDAS!' : '## ⚠️ Resultado: CORREÇÕES NECESSÁRIAS\n\nSiga as instruções exibidas no console para corrigir as chaves.'}
`;

    writeFileSync('RELATORIO_VALIDACAO_CHAVES.md', relatorio);
    console.log('📄 Relatório salvo em: RELATORIO_VALIDACAO_CHAVES.md\n');

    return testesFalhos === 0;

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
    return false;
  }
}

validar();

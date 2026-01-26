/**
 * 🧪 TESTE DIRETO DO AGENTE IA (SEM EDGE FUNCTION)
 *
 * Testa chamada direta à OpenAI para validar a API Key
 */

import { readFileSync } from 'fs';

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

const env = loadEnv();
const OPENAI_API_KEY = env.OPENAI_API_KEY;

console.log('\n🤖 TESTE DIRETO - OPENAI API\n');
console.log('='.repeat(60));

if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 20) {
  console.error('❌ OPENAI_API_KEY não encontrada ou inválida no .env');
  console.log('\nValor encontrado:', OPENAI_API_KEY?.substring(0, 20) || 'undefined');
  process.exit(1);
}

console.log('✅ API Key encontrada:', OPENAI_API_KEY.substring(0, 20) + '...');

async function testarOpenAI() {
  try {
    console.log('\n🚀 Chamando OpenAI API...\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente jurídico especializado em direito trabalhista brasileiro.'
          },
          {
            role: 'user',
            content: 'Olá, fui demitido sem justa causa. Tenho direito a alguma indenização?'
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ ERRO na chamada OpenAI:');
      console.error('   Status:', response.status);
      console.error('   Erro:', JSON.stringify(error, null, 2));

      if (response.status === 401) {
        console.log('\n💡 SOLUÇÃO:');
        console.log('   A API Key está inválida ou expirada.');
        console.log('   Gere uma nova em: https://platform.openai.com/api-keys\n');
      }

      return;
    }

    const data = await response.json();

    console.log('✅ SUCESSO! OpenAI respondeu:\n');
    console.log('='.repeat(60));
    console.log(data.choices[0].message.content);
    console.log('='.repeat(60));

    console.log('\n📊 Detalhes:');
    console.log('   Modelo:', data.model);
    console.log('   Tokens usados:', data.usage.total_tokens);
    console.log('   Tempo:', new Date().toISOString());

    console.log('\n✅ API KEY FUNCIONANDO PERFEITAMENTE!\n');
    console.log('🎉 Agora você pode usar os agentes IA no Jurify!\n');

  } catch (error) {
    console.error('\n❌ Erro inesperado:', error.message);
    console.error(error);
  }
}

testarOpenAI();

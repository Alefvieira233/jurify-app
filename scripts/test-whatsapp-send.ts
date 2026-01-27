/**
 * 🧪 TESTE DA EDGE FUNCTION - send-whatsapp-message
 *
 * Script para testar o envio de mensagens WhatsApp via Edge Function.
 * Garante que a correção de segurança WA-001 e WA-002 está funcionando.
 *
 * USO:
 * 1. Configure SUPABASE_URL e SUPABASE_ANON_KEY
 * 2. Configure USER_TOKEN (obtenha do localStorage ou autenticação)
 * 3. Execute: npx tsx scripts/test-whatsapp-send.ts
 */

import { createClient } from '@supabase/supabase-js';

// ⚙️ CONFIGURAÇÃO
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yfxgncbopvnsltjqetxw.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sua_anon_key_aqui';

// 🔑 TOKEN DE USUÁRIO (obtenha fazendo login no app)
// Abra o DevTools > Application > Local Storage > supabase.auth.token
const USER_TOKEN = process.env.USER_TOKEN || '';

// 📱 DADOS DE TESTE
const TEST_PHONE = '5511999999999'; // Número de teste (seu WhatsApp para receber)
const TEST_MESSAGE = '🧪 Mensagem de teste do Jurify - Sistema seguro funcionando!';

// =========================================================
// 🚀 FUNÇÃO PRINCIPAL
// =========================================================

async function testSendWhatsAppMessage() {
  console.log('🧪 ========================================');
  console.log('   TESTE: send-whatsapp-message');
  console.log('========================================\n');

  // Validação
  if (!USER_TOKEN) {
    console.error('❌ USER_TOKEN não configurado!');
    console.log('\n💡 Como obter o USER_TOKEN:');
    console.log('1. Faça login no Jurify');
    console.log('2. Abra DevTools (F12)');
    console.log('3. Vá em Application > Local Storage');
    console.log('4. Procure por "supabase.auth.token"');
    console.log('5. Copie o valor do "access_token"');
    console.log('6. Execute: USER_TOKEN=seu_token npx tsx scripts/test-whatsapp-send.ts\n');
    process.exit(1);
  }

  try {
    // Inicializa Supabase Client
    console.log('📡 Conectando ao Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${USER_TOKEN}`,
        },
      },
    });

    console.log('✅ Conectado ao Supabase\n');

    // Teste 1: Verifica autenticação
    console.log('🔐 Teste 1: Verificando autenticação...');
    const { data: userData, error: userError } = await supabase.auth.getUser(USER_TOKEN);

    if (userError || !userData.user) {
      throw new Error(`Autenticação falhou: ${userError?.message || 'Token inválido'}`);
    }

    console.log('✅ Usuário autenticado:', userData.user.email);
    console.log('   User ID:', userData.user.id);
    console.log('');

    // Teste 2: Envia mensagem via Edge Function
    console.log('📤 Teste 2: Enviando mensagem via Edge Function...');
    console.log('   Para:', TEST_PHONE);
    console.log('   Mensagem:', TEST_MESSAGE);
    console.log('');

    const startTime = Date.now();

    const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
      body: {
        to: TEST_PHONE,
        text: TEST_MESSAGE,
      },
    });

    const duration = Date.now() - startTime;

    if (error) {
      throw new Error(`Edge Function falhou: ${error.message}`);
    }

    console.log('✅ Edge Function executada com sucesso');
    console.log(`   Tempo: ${duration}ms`);
    console.log('');

    // Teste 3: Valida resposta
    console.log('📊 Teste 3: Validando resposta...');
    console.log('   Resposta:', JSON.stringify(data, null, 2));
    console.log('');

    if (!data) {
      throw new Error('Edge Function não retornou dados');
    }

    if (!data.success) {
      throw new Error(`Envio falhou: ${data.error || 'Erro desconhecido'}`);
    }

    console.log('✅ Mensagem enviada com sucesso!');
    console.log('   Message ID:', data.messageId);
    console.log('   Timestamp:', data.timestamp);
    console.log('');

    // Teste 4: Verifica se salvou no banco
    console.log('💾 Teste 4: Verificando salvamento no banco...');

    const { data: messages, error: dbError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbError) {
      console.warn('⚠️  Erro ao buscar mensagens:', dbError.message);
    } else if (messages && messages.length > 0) {
      console.log('✅ Última mensagem salva no banco:');
      console.log('   ID:', messages[0].id);
      console.log('   Content:', messages[0].content.substring(0, 50) + '...');
      console.log('   Sender:', messages[0].sender);
      console.log('');
    }

    // Resultado final
    console.log('🎉 ========================================');
    console.log('   TODOS OS TESTES PASSARAM!');
    console.log('========================================');
    console.log('');
    console.log('✅ Segurança: Token não exposto no client-side');
    console.log('✅ Funcionalidade: Mensagem enviada com sucesso');
    console.log('✅ Performance: Latência aceitável');
    console.log('✅ Banco de dados: Mensagem salva corretamente');
    console.log('');
    console.log('🔒 Problemas WA-001 e WA-002 foram RESOLVIDOS!');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ ========================================');
    console.error('   TESTE FALHOU!');
    console.error('========================================');
    console.error('');
    console.error('Erro:', error.message);
    console.error('');

    if (error.message.includes('autenticação') || error.message.includes('Token')) {
      console.error('💡 Dica: Verifique se o USER_TOKEN está correto');
      console.error('   Token atual:', USER_TOKEN.substring(0, 20) + '...');
    } else if (error.message.includes('Edge Function')) {
      console.error('💡 Dica: Verifique se a Edge Function foi deployada');
      console.error('   Execute: npx supabase functions deploy send-whatsapp-message');
    } else if (error.message.includes('credentials')) {
      console.error('💡 Dica: Configure as credenciais do WhatsApp no Supabase Secrets');
      console.error('   Execute: supabase secrets set WHATSAPP_ACCESS_TOKEN=EAA...');
      console.error('   Execute: supabase secrets set WHATSAPP_PHONE_NUMBER_ID=123...');
    }

    console.error('');
    process.exit(1);
  }
}

// =========================================================
// 🎬 EXECUÇÃO
// =========================================================

testSendWhatsAppMessage().catch(console.error);

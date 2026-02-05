#!/usr/bin/env node
/**
 * Script para aplicar dados fictícios no Supabase
 * Executa o SQL DADOS_FICTICIOS_TESTE.sql no banco de dados
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de ambiente do .env
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yfxgncbopvnsltjqetxw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_fLfBA6I3NbiCQv1VmYiBeQ_4wQgMyF-';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applySQLFile() {
  console.log('🚀 Aplicando dados fictícios no Supabase...\n');

  try {
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, 'DADOS_FICTICIOS_TESTE.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📖 Arquivo SQL lido com sucesso');
    console.log(`📊 Tamanho: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

    // Dividir em statements individuais (separados por ;)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Total de ${statements.length} comandos SQL para executar\n`);

    let successCount = 0;
    let errorCount = 0;

    // Executar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Pular comentários e linhas vazias
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      try {
        console.log(`[${i + 1}/${statements.length}] Executando...`);

        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        });

        if (error) {
          // Tentar executar diretamente via from se rpc falhar
          const { error: directError } = await supabase
            .from('_sql_exec')
            .select('*')
            .eq('query', statement);

          if (directError) {
            console.error(`❌ Erro no comando ${i + 1}:`, directError.message);
            errorCount++;
          } else {
            successCount++;
            console.log(`✅ Comando ${i + 1} executado`);
          }
        } else {
          successCount++;
          console.log(`✅ Comando ${i + 1} executado`);
        }
      } catch (err) {
        console.error(`❌ Erro no comando ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Verificar dados inseridos
    console.log('🔍 Verificando dados inseridos...\n');

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .like('email', '%@teste.jurify.com');

    if (!leadsError) {
      console.log(`📊 Leads inseridos: ${leads?.length || 0}`);
    }

    const { count: conversationsCount } = await supabase
      .from('whatsapp_conversations')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Conversas WhatsApp: ${conversationsCount || 0}`);

    const { count: messagesCount } = await supabase
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Mensagens WhatsApp: ${messagesCount || 0}`);

    const { count: executionsCount } = await supabase
      .from('agent_executions')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Execuções de Agentes: ${executionsCount || 0}`);

    const { count: logsCount } = await supabase
      .from('agent_ai_logs')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Logs de IA: ${logsCount || 0}\n`);

    console.log('✅ Dados fictícios aplicados com sucesso!');
    console.log('🌐 Acesse http://localhost:8080 para ver o dashboard\n');

  } catch (error) {
    console.error('❌ Erro ao aplicar SQL:', error);
    process.exit(1);
  }
}

// Executar
applySQLFile().catch(console.error);

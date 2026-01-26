import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env', 'utf-8').split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  const value = valueParts.join('=').trim();
  if (key && value) env[key.trim()] = value;
});

console.log('\n=== AUDITORIA 3: RLS POLICIES (COMPLETA) ===\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Tabelas e operações a testar
const testes = [
  {
    tabela: 'agentes_ia',
    operacoes: ['SELECT', 'INSERT'],
    dadosInsert: {
      nome: 'Teste RLS',
      especializacao: 'Teste',
      ativo: true,
      modelo_ia: 'gpt-4o-mini',
      tenant_id: '00000000-0000-0000-0000-000000000000'
    }
  },
  {
    tabela: 'logs_execucao_agentes',
    operacoes: ['SELECT', 'INSERT'],
    dadosInsert: {
      agente_id: '00000000-0000-0000-0000-000000000000',
      input_recebido: 'Teste RLS',
      resposta_ia: 'Teste',
      status: 'success',
      tempo_execucao: 100,
      api_key_usado: 'test'
    }
  },
  {
    tabela: 'agent_ai_logs',
    operacoes: ['SELECT', 'INSERT'],
    dadosInsert: {
      agent_name: 'test-agent',
      tenant_id: '00000000-0000-0000-0000-000000000000',
      model: 'gpt-4o-mini',
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
      result_preview: 'Teste RLS'
    }
  },
  {
    tabela: 'agent_executions',
    operacoes: ['SELECT', 'INSERT', 'UPDATE'],
    dadosInsert: {
      execution_id: 'test-exec-' + Date.now(),
      tenant_id: '00000000-0000-0000-0000-000000000000',
      status: 'pending',
      current_agent: 'test-agent',
      agents_involved: ['test-agent'],
      total_agents_used: 1
    },
    dadosUpdate: {
      status: 'completed'
    }
  }
];

for (const teste of testes) {
  console.log(`\n--- ${teste.tabela} ---`);

  // SELECT com ANON (deve funcionar)
  if (teste.operacoes.includes('SELECT')) {
    try {
      const { data, error } = await supabaseAnon
        .from(teste.tabela)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`  SELECT (ANON): ⚠️  ${error.message}`);
        results.warnings++;
      } else {
        console.log('  SELECT (ANON): ✅ Permitido');
        results.passed++;
      }
    } catch (e) {
      console.log('  SELECT (ANON): ❌', e.message);
      results.failed++;
    }
  }

  // INSERT com SERVICE_ROLE (deve funcionar)
  if (teste.operacoes.includes('INSERT')) {
    try {
      const { data, error } = await supabaseAdmin
        .from(teste.tabela)
        .insert([teste.dadosInsert])
        .select();

      if (error) {
        console.log(`  INSERT (ADMIN): ❌ ${error.message}`);
        results.failed++;
      } else {
        console.log('  INSERT (ADMIN): ✅ Permitido');
        results.passed++;

        // Limpar dados de teste
        if (data && data.length > 0) {
          await supabaseAdmin
            .from(teste.tabela)
            .delete()
            .eq('id', data[0].id);
        }
      }
    } catch (e) {
      console.log('  INSERT (ADMIN): ❌', e.message);
      results.failed++;
    }
  }

  // UPDATE com SERVICE_ROLE (se aplicável)
  if (teste.operacoes.includes('UPDATE') && teste.dadosUpdate) {
    try {
      // Primeiro inserir um registro
      const { data: inserted } = await supabaseAdmin
        .from(teste.tabela)
        .insert([teste.dadosInsert])
        .select();

      if (inserted && inserted.length > 0) {
        const { error } = await supabaseAdmin
          .from(teste.tabela)
          .update(teste.dadosUpdate)
          .eq('id', inserted[0].id);

        if (error) {
          console.log(`  UPDATE (ADMIN): ❌ ${error.message}`);
          results.failed++;
        } else {
          console.log('  UPDATE (ADMIN): ✅ Permitido');
          results.passed++;
        }

        // Limpar
        await supabaseAdmin
          .from(teste.tabela)
          .delete()
          .eq('id', inserted[0].id);
      }
    } catch (e) {
      console.log('  UPDATE (ADMIN): ❌', e.message);
      results.failed++;
    }
  }
}

// Teste específico: Agentes IA devem ser visíveis sem autenticação
console.log('\n--- TESTE CRÍTICO: Agentes visíveis sem auth ---');
try {
  const { data, error } = await supabaseAnon
    .from('agentes_ia')
    .select('id, nome, ativo')
    .eq('ativo', true);

  if (error) {
    console.log('  ❌ Agentes NÃO visíveis sem auth:', error.message);
    results.failed++;
  } else if (data && data.length > 0) {
    console.log(`  ✅ ${data.length} agentes visíveis sem autenticação`);
    results.passed++;
  } else {
    console.log('  ⚠️  Nenhum agente ativo encontrado');
    results.warnings++;
  }
} catch (e) {
  console.log('  ❌', e.message);
  results.failed++;
}

console.log('\n' + '='.repeat(50));
console.log('RESULTADO RLS POLICIES:');
console.log('  ✅ Passou:', results.passed);
console.log('  ❌ Falhou:', results.failed);
console.log('  ⚠️  Avisos:', results.warnings);
console.log('='.repeat(50));

if (results.failed > 0) {
  console.log('\n⚠️  BLOQUEIOS CRÍTICOS DETECTADOS!');
  console.log('Sistema NÃO está 100% funcional.');
}

process.exit(results.failed > 0 ? 1 : 0);

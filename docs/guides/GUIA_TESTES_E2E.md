# 🧪 GUIA DE TESTES END-TO-END - JURIFY

Este guia explica como executar os testes end-to-end para validar todo o sistema Jurify.

---

## 📋 O QUE OS TESTES VALIDAM

### ✅ TESTE 1: Fluxo Completo de Lead
- Criar lead via Supabase
- Atualizar status do lead
- Criar interação na timeline
- Buscar lead atualizado
- Verificar timeline de interações
- Deletar lead de teste

### ✅ TESTE 2: Fluxo de Agente IA
- Criar lead
- Chamar Edge Function de IA
- Verificar criação de execution
- Verificar logs em agent_ai_logs
- Limpar dados de teste

### ✅ TESTE 3: Fluxo de WhatsApp
- Criar lead
- Criar conversa WhatsApp
- Adicionar mensagens (lead → IA)
- Buscar conversa completa
- Limpar dados de teste

### ✅ TESTE 4: Mission Control Realtime
- Criar execution de teste
- Atualizar status para completed
- Verificar leitura pelo Mission Control
- Limpar executions de teste

### ✅ TESTE 5: Dashboard Métricas
- Buscar leads
- Buscar executions de agentes
- Buscar logs de IA
- Calcular métricas (leads hoje)

---

## 🚀 COMO EXECUTAR OS TESTES

### Opção 1: Via Console do Navegador (Recomendado)

1. **Abra o Jurify no navegador**:
   ```bash
   npm run dev
   # Acesse http://localhost:5173
   ```

2. **Faça login no sistema**

3. **Abra o Console do navegador**:
   - Chrome/Edge: `F12` ou `Ctrl+Shift+J`
   - Firefox: `F12` ou `Ctrl+Shift+K`
   - Safari: `Cmd+Option+C`

4. **Cole e execute o seguinte código**:
   ```javascript
   // Importar e executar todos os testes:
   import('./src/scripts/test-fluxos-e2e.ts').then(module => {
     module.executarTodosOsTestes();
   });
   ```

   **OU execute testes individuais**:
   ```javascript
   import('./src/scripts/test-fluxos-e2e.ts').then(module => {
     module.testeFluxoLead();        // Apenas teste de leads
     module.testeFluxoAgenteIA();    // Apenas teste de IA
     module.testeFluxoWhatsApp();    // Apenas teste de WhatsApp
     module.testeMissionControl();   // Apenas teste de Mission Control
     module.testeDashboard();        // Apenas teste de Dashboard
   });
   ```

### Opção 2: Via Script NPM

1. **Adicione ao `package.json`**:
   ```json
   {
     "scripts": {
       "test:e2e": "tsx src/scripts/test-fluxos-e2e.ts"
     }
   }
   ```

2. **Execute**:
   ```bash
   npm run test:e2e
   ```

### Opção 3: Execução Manual no Console (Depois que o Jurify carregar)

Após carregar o Jurify, o objeto `JurifyTestes` é exposto globalmente:

```javascript
// Executar todos os testes:
JurifyTestes.executarTodos();

// Executar teste específico:
JurifyTestes.testeFluxoLead();
JurifyTestes.testeFluxoAgenteIA();
JurifyTestes.testeFluxoWhatsApp();
JurifyTestes.testeMissionControl();
JurifyTestes.testeDashboard();
```

---

## 📊 INTERPRETANDO OS RESULTADOS

### ✅ Teste Passou
```
✅ TESTE 1 PASSOU ✅ - Fluxo de Lead funcionando!
```
**Significado**: Funcionalidade está operacional.

### ❌ Teste Falhou
```
❌ TESTE 2 FALHOU ❌ - Erro ao criar execution: ...
```
**Significado**: Há um problema na configuração ou no código.

### ⚠️  Aviso (Não é erro)
```
⚠️  OpenAI não configurada - pulando teste de IA
```
**Significado**: Funcionalidade opcional não configurada.

---

## 🔧 TROUBLESHOOTING

### Erro: "supabase is not defined"
**Solução**: Execute os testes dentro do Jurify (após login).

### Erro: "Permission denied" ou "RLS policy violation"
**Solução**:
1. Verifique se você está logado no sistema
2. Confirme se as RLS policies estão corretas no Supabase
3. Verifique se seu usuário tem permissões

### Erro: "Table does not exist"
**Solução**:
1. Aplique as migrations primeiro:
   ```bash
   supabase db push
   ```
2. Ou execute manualmente no SQL Editor do Supabase

### Teste de IA falha: "OpenAI API key not found"
**Solução**:
1. Configure a API key no Supabase Edge Functions:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   ```
2. Ou via Dashboard: Edge Functions → Settings → Secrets

### Teste de WhatsApp falha: "Insert violates RLS policy"
**Solução**:
1. Verifique se a migration `20251211000000_whatsapp_tables.sql` foi aplicada
2. Confirme que as RLS policies foram criadas

---

## 📝 CHECKLIST PRÉ-TESTES

Antes de executar os testes, certifique-se:

- [ ] Supabase configurado (URL + anon key no `.env`)
- [ ] Usuário autenticado no sistema
- [ ] Migrations aplicadas no banco de dados:
  - [ ] `20251210000000_add_agent_ai_logs.sql`
  - [ ] `20251210000001_mission_control.sql`
  - [ ] `20251211000000_whatsapp_tables.sql`
- [ ] RLS policies habilitadas
- [ ] Console do navegador aberto (F12)

---

## 🎯 RESULTADO ESPERADO

Ao executar todos os testes com sucesso, você deve ver:

```
═══════════════════════════════════════════════════════════
🧪 JURIFY - SUITE DE TESTES END-TO-END
═══════════════════════════════════════════════════════════

🧪 TESTE 1: Fluxo Completo de Lead
──────────────────────────────────────────────────────
ℹ️  1/6: Criando novo lead...
✅ Lead criado com ID: abc-123-def
ℹ️  2/6: Atualizando status para "em_qualificacao"...
✅ Status atualizado com sucesso
ℹ️  3/6: Criando interação na timeline...
✅ Interação criada na timeline
ℹ️  4/6: Buscando lead atualizado...
✅ Lead encontrado: João Silva Teste E2E (em_qualificacao)
ℹ️  5/6: Verificando timeline...
✅ Timeline possui 1 interações
ℹ️  6/6: Limpando dados de teste...
✅ Lead de teste removido

✅ TESTE 1 PASSOU ✅ - Fluxo de Lead funcionando!

[... outros testes ...]

═══════════════════════════════════════════════════════════
📊 RESUMO DOS TESTES
═══════════════════════════════════════════════════════════
Total de testes: 5
✅ Passou: 5
❌ Falhou: 0

✅ 🎉 TODOS OS TESTES PASSARAM! Sistema operacional.
```

---

## 🔄 QUANDO EXECUTAR OS TESTES

### 1. **Após configurar credenciais**
Execute para confirmar que as integrações estão funcionando.

### 2. **Após aplicar migrations**
Valide que as tabelas foram criadas corretamente.

### 3. **Antes de deploy em produção**
Garanta que nada quebrou antes de subir para produção.

### 4. **Após modificar código crítico**
Verifique que as mudanças não quebraram funcionalidades existentes.

### 5. **Quando houver bugs reportados**
Execute para reproduzir e identificar o problema.

---

## 📚 TESTES ADICIONAIS (MANUAIS)

Além dos testes automatizados, valide manualmente:

### ✅ Interface de Usuário
- [ ] Criar lead via formulário
- [ ] Editar lead
- [ ] Deletar lead
- [ ] Buscar e filtrar leads
- [ ] Ver timeline de conversas

### ✅ Dashboard
- [ ] Métricas atualizando em tempo real
- [ ] Gráficos renderizando corretamente
- [ ] Sem dados mockados

### ✅ WhatsApp IA
- [ ] Conversas carregando do banco
- [ ] Enviar mensagem
- [ ] Realtime updates funcionando

### ✅ Mission Control
- [ ] Agentes aparecendo em tempo real
- [ ] Status atualizando (idle → processing → success/error)
- [ ] Métricas corretas

### ✅ Agentes IA
- [ ] Executar agente e ver logs
- [ ] Tracking em agent_executions
- [ ] Mission Control refletindo execução

---

## 🎓 DICAS DE DEBUGGING

### Ver logs detalhados
```javascript
// No console do navegador:
localStorage.setItem('debug', 'jurify:*');
// Recarregue a página
```

### Verificar tabelas no Supabase
```sql
-- Dashboard Supabase → SQL Editor:

-- Ver leads:
SELECT * FROM leads ORDER BY created_at DESC LIMIT 10;

-- Ver executions:
SELECT * FROM agent_executions ORDER BY started_at DESC LIMIT 10;

-- Ver logs de IA:
SELECT * FROM agent_ai_logs ORDER BY created_at DESC LIMIT 10;

-- Ver conversas WhatsApp:
SELECT * FROM whatsapp_conversations ORDER BY created_at DESC LIMIT 10;
```

### Limpar dados de teste manualmente
```sql
-- Deletar leads de teste:
DELETE FROM leads WHERE nome_completo LIKE '%Teste%';

-- Deletar executions de teste:
DELETE FROM agent_executions WHERE execution_id LIKE '%test%';
```

---

## 📞 SUPORTE

Se os testes continuarem falhando após seguir este guia:

1. **Verifique o console** do navegador para erros detalhados
2. **Revise as migrations** no Supabase SQL Editor
3. **Confirme as RLS policies** estão ativas
4. **Teste a conexão** com Supabase manualmente
5. **Verifique credenciais** no `.env`

---

**Última atualização**: 2025-12-11

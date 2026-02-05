# ✅ SCRIPT DE VERIFICAÇÃO - JURIFY

## Checklist completo para validar se tudo está funcionando

---

## 🔍 PARTE 1: VERIFICAÇÃO DE ARQUIVOS E CONFIGURAÇÃO

### 1.1 Verificar .env

```bash
# Verificar se o arquivo .env existe
ls -la .env

# Verificar variáveis críticas
cat .env | grep VITE_SUPABASE_URL
cat .env | grep VITE_SUPABASE_ANON_KEY
```

✅ **Esperado:**
```
VITE_SUPABASE_URL=https://yfxgncbopvnsltjqetxw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_jvu12I9zYXOF6fPD1GdF2g_anT9DTUj
```

### 1.2 Verificar dependências

```bash
# Verificar se node_modules existe
ls -la node_modules/@supabase/supabase-js

# Verificar versão do Supabase
npm list @supabase/supabase-js
```

✅ **Esperado:** `@supabase/supabase-js@2.50.0` ou superior

---

## 🏗️ PARTE 2: BUILD E TYPE CHECK

### 2.1 Type Check

```bash
npm run type-check
```

✅ **Esperado:** Sem erros de tipo

### 2.2 Build de produção

```bash
npm run build
```

✅ **Esperado:** Build bem-sucedido em `dist/`

---

## 🔐 PARTE 3: TESTAR AUTENTICAÇÃO

### 3.1 Testar conexão com Supabase

Crie um arquivo `test-supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yfxgncbopvnsltjqetxw.supabase.co',
  'sb_publishable_jvu12I9zYXOF6fPD1GdF2g_anT9DTUj'
);

async function testConnection() {
  console.log('🔍 Testando conexão com Supabase...');

  try {
    // Testar query simples
    const { data, error } = await supabase
      .from('leads')
      .select('count');

    if (error) {
      console.error('❌ Erro:', error.message);
      return;
    }

    console.log('✅ Conexão OK!');
    console.log('📊 Resultado:', data);
  } catch (err) {
    console.error('❌ Erro na conexão:', err);
  }
}

testConnection();
```

Executar:
```bash
node test-supabase.js
```

✅ **Esperado:** "✅ Conexão OK!"

### 3.2 Testar autenticação

```javascript
async function testAuth() {
  console.log('🔐 Testando autenticação...');

  // Tentar fazer login (use credenciais de teste)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'teste@jurify.com',
    password: 'SenhaForte123!',
  });

  if (error) {
    console.log('⚠️ Usuário não existe (esperado se não criou ainda)');
    console.log('Erro:', error.message);
    return;
  }

  console.log('✅ Login OK!');
  console.log('👤 Usuário:', data.user.email);
}
```

---

## 🗄️ PARTE 4: VERIFICAR BANCO DE DADOS

### 4.1 Listar tabelas

Acesse o Supabase Dashboard:
```
https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/editor
```

✅ **Verificar se existem as tabelas:**
- ✅ profiles
- ✅ leads
- ✅ contratos
- ✅ agendamentos
- ✅ agentes_ia
- ✅ agent_ai_logs
- ✅ agent_executions
- ✅ notificacoes
- ✅ logs_atividades
- ✅ user_roles
- ✅ role_permissions

### 4.2 Verificar RLS

```sql
-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

✅ **Esperado:** `rowsecurity = true` para todas as tabelas

### 4.3 Verificar Policies

```sql
-- Listar policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

✅ **Esperado:** Múltiplas policies por tabela

---

## ⚡ PARTE 5: TESTAR REALTIME

### 5.1 Verificar Realtime habilitado

No Supabase Dashboard:
1. Vá em **Database** > **Replication**
2. Verifique se as tabelas `agent_executions` e `agent_ai_logs` estão habilitadas

### 5.2 Testar subscription

```javascript
async function testRealtime() {
  console.log('⚡ Testando Realtime...');

  const subscription = supabase
    .channel('test-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leads',
      },
      (payload) => {
        console.log('✅ Realtime funcionando!', payload);
      }
    )
    .subscribe((status) => {
      console.log('📡 Status:', status);
    });

  // Aguardar 5 segundos
  setTimeout(() => {
    console.log('✅ Teste de realtime concluído');
    subscription.unsubscribe();
  }, 5000);
}
```

---

## 🌐 PARTE 6: TESTAR EDGE FUNCTIONS

### 6.1 Listar Edge Functions

No Supabase Dashboard:
```
https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/functions
```

✅ **Verificar se existem:**
- health-check
- chat-completion
- ai-agent-processor
- agentes-ia-api
- whatsapp-contract
- zapsign-integration
- n8n-webhook-forwarder

### 6.2 Testar health-check

```bash
curl -X POST \
  https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer sb_publishable_jvu12I9zYXOF6fPD1GdF2g_anT9DTUj"
```

✅ **Esperado:** Status 200 com resposta JSON

---

## 🎨 PARTE 7: TESTAR INTERFACE

### 7.1 Iniciar servidor dev

```bash
npm run dev
```

✅ **Esperado:** Servidor rodando em `http://localhost:8080`

### 7.2 Checklist de navegação

Abra o navegador e teste:

1. ✅ Página de login carrega (`/auth`)
2. ✅ Pode fazer login (se tiver usuário)
3. ✅ Dashboard carrega (`/`)
4. ✅ Sidebar aparece
5. ✅ Menu lateral funciona
6. ✅ Navegação entre páginas funciona
7. ✅ Logout funciona

### 7.3 Verificar console do navegador

Abra DevTools (F12) e verifique:
- ✅ Sem erros vermelhos no console
- ✅ Logs de autenticação aparecem
- ✅ Requisições ao Supabase aparecem na aba Network

---

## 🔍 PARTE 8: VERIFICAR LOGS

### 8.1 Logs do Supabase

Acesse:
```
https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/logs/explorer
```

✅ **Verificar:**
- Logs de API (requisições)
- Logs de Auth (autenticações)
- Logs de Database (queries)

### 8.2 Logs do navegador

```javascript
// No console do navegador
localStorage.getItem('supabase.auth.token')
```

✅ **Esperado:** Token JWT se estiver logado

---

## 🧪 PARTE 9: TESTES AUTOMATIZADOS

### 9.1 Rodar testes (se existirem)

```bash
npm test
```

### 9.2 Coverage

```bash
npm run test:coverage
```

---

## 📊 PARTE 10: VERIFICAÇÃO FINAL

### Checklist geral:

```bash
✅ .env configurado
✅ Dependências instaladas
✅ Build funciona
✅ Types corretos
✅ Conexão com Supabase OK
✅ Autenticação funciona
✅ Banco de dados acessível
✅ RLS habilitado
✅ Realtime funciona
✅ Edge Functions deployadas
✅ Interface carrega
✅ Navegação funciona
✅ Console sem erros
✅ Logs aparecem no Supabase
```

---

## 🚨 TROUBLESHOOTING

### Problema: "Network error" ou "Failed to fetch"

**Solução:**
1. Verificar se URL do Supabase está correta no .env
2. Verificar conexão com internet
3. Verificar status do Supabase: https://status.supabase.com

### Problema: "Invalid API key"

**Solução:**
1. Verificar se ANON_KEY está correta no .env
2. Regenerar keys no dashboard se necessário
3. Não usar SERVICE_ROLE_KEY no frontend

### Problema: "Row Level Security policy violation"

**Solução:**
1. Verificar se usuário tem tenant_id configurado
2. Verificar policies no Supabase Dashboard
3. Verificar se RLS está habilitado

---

## ✅ RESULTADO ESPERADO

Após executar todos os passos:

```
🎉 JURIFY - VERIFICAÇÃO COMPLETA

✅ Configuração: OK
✅ Build: OK
✅ Supabase: CONECTADO
✅ Autenticação: FUNCIONANDO
✅ Banco de dados: ACESSÍVEL
✅ RLS: HABILITADO
✅ Realtime: ATIVO
✅ Edge Functions: DEPLOYADAS
✅ Interface: RENDERIZANDO
✅ Navegação: FUNCIONANDO

🚀 SISTEMA PRONTO PARA USO!
```

---

## 📞 SUPORTE

Se algum passo falhar:

1. 📖 Consultar logs do Supabase
2. 🐛 Verificar console do navegador
3. 📝 Revisar variáveis de ambiente
4. 🔄 Tentar npm install novamente
5. 💬 Verificar Discord do Supabase

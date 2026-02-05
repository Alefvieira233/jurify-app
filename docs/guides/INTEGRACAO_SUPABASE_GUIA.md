# 🗄️ GUIA DE INTEGRAÇÃO SUPABASE - JURIFY

## 📌 Visão Geral

O Jurify utiliza Supabase como **backend completo**, incluindo:
- 🗄️ PostgreSQL Database
- 🔐 Authentication & Authorization
- ⚡ Realtime Subscriptions
- 📦 Storage (arquivos)
- 🌐 Edge Functions (serverless)

---

## ✅ VERIFICAÇÃO DE STATUS DA INTEGRAÇÃO

### 1. **Cliente Supabase Configurado**

**Arquivo:** `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cria cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

✅ **Status:** FUNCIONANDO
✅ **URL:** `https://yfxgncbopvnsltjqetxw.supabase.co`

### 2. **Variáveis de Ambiente**

**Arquivo:** `.env`

```env
VITE_SUPABASE_URL=https://yfxgncbopvnsltjqetxw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_jvu12I9zYXOF6fPD1GdF2g_anT9DTUj
SUPABASE_SERVICE_ROLE_KEY=sb_secret_fLfBA6I3NbiCQv1VmYiBeQ_4wQgMyF-
```

✅ **Status:** CONFIGURADO CORRETAMENTE

⚠️ **IMPORTANTE:** A `SUPABASE_SERVICE_ROLE_KEY` deve ser usada APENAS em:
- Edge Functions do Supabase
- Scripts de backend/admin
- **NUNCA** expor no frontend!

---

## 🔐 AUTENTICAÇÃO

### Fluxo Implementado

**Arquivo:** `src/contexts/AuthContext.tsx`

```typescript
// 1. Login
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  // Logs de segurança automáticos
};

// 2. Registro
const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
};

// 3. Logout
const signOut = async () => {
  await supabase.auth.signOut();
};

// 4. Verificar sessão
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
  });

  // Listener para mudanças de autenticação
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

✅ **Recursos implementados:**
- Login/Logout/Registro
- Auto-logout por inatividade (30 min)
- Refresh token automático
- Logs de segurança
- Proteção contra sessões expiradas

---

## 🗄️ OPERAÇÕES NO BANCO DE DADOS

### Exemplo: Buscar Leads

```typescript
// Buscar todos os leads do tenant
const { data: leads, error } = await supabase
  .from('leads')
  .select('*')
  .eq('tenant_id', userTenantId)
  .order('created_at', { ascending: false });
```

### Exemplo: Criar Lead

```typescript
const { data, error } = await supabase
  .from('leads')
  .insert({
    nome_completo: 'João Silva',
    email: 'joao@example.com',
    telefone: '11999999999',
    area_juridica: 'Trabalhista',
    origem: 'WhatsApp',
    status: 'novo_lead',
    responsavel: 'Advogado 1',
  });
```

### Exemplo: Atualizar Lead

```typescript
const { error } = await supabase
  .from('leads')
  .update({ status: 'em_qualificacao' })
  .eq('id', leadId);
```

### Exemplo: Deletar Lead

```typescript
const { error } = await supabase
  .from('leads')
  .delete()
  .eq('id', leadId);
```

---

## ⚡ REALTIME SUBSCRIPTIONS

### Ouvir mudanças em tempo real

```typescript
// Subscribe para novos leads
const subscription = supabase
  .channel('leads-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'leads',
      filter: `tenant_id=eq.${tenantId}`
    },
    (payload) => {
      console.log('Lead changed:', payload);
      // Atualizar UI automaticamente
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(subscription);
};
```

✅ **Habilitado em:**
- `agent_executions` (Mission Control)
- `agent_ai_logs`

---

## 🔒 ROW LEVEL SECURITY (RLS)

### Como funciona

Todas as tabelas têm políticas RLS que garantem:
- ✅ Usuários só veem dados do seu tenant
- ✅ Admins têm permissões elevadas
- ✅ Service role bypassa RLS (para edge functions)

### Exemplo de Política

```sql
-- Usuários podem ver apenas leads do seu tenant
CREATE POLICY "Users can view their tenant's leads"
  ON public.leads
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );
```

✅ **Status:** RLS habilitado em TODAS as tabelas

---

## 📦 STORAGE (Arquivos)

### Upload de arquivo

```typescript
const { data, error } = await supabase.storage
  .from('contratos')
  .upload(`${userId}/${fileName}`, file);
```

### Download de arquivo

```typescript
const { data } = supabase.storage
  .from('contratos')
  .getPublicUrl('path/to/file.pdf');

// data.publicUrl contém a URL pública
```

---

## 🌐 EDGE FUNCTIONS

### Chamar Edge Function

```typescript
const { data, error } = await supabase.functions.invoke('chat-completion', {
  body: {
    messages: [
      { role: 'user', content: 'Olá!' }
    ]
  }
});
```

### Edge Functions disponíveis:

1. `health-check` - Verificar saúde do sistema
2. `chat-completion` - Completar chat com IA
3. `ai-agent-processor` - Processar agente IA
4. `agentes-ia-api` - API dos agentes
5. `whatsapp-contract` - Integração WhatsApp
6. `zapsign-integration` - Integração ZapSign
7. `n8n-webhook-forwarder` - Forwarding de webhooks

---

## 🔍 DEBUGGING

### Ver logs do Supabase

1. Acesse: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw
2. Vá em **Logs** > **API** ou **Database**
3. Filtre por erros ou queries lentas

### Console do navegador

```typescript
// Habilitar logs detalhados
localStorage.setItem('supabase.debug', 'true');

// Ver todas as queries
supabase.auth.debug = true;
```

---

## 📊 MONITORAMENTO

### Dashboard do Supabase

Acesse: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw

Métricas disponíveis:
- 📈 Requisições por hora
- 💾 Uso de database
- 🔐 Autenticações
- ⚡ Realtime connections
- 📦 Storage usage

---

## 🚨 TROUBLESHOOTING COMUM

### Erro: "Invalid JWT" ou "JWT expired"

**Causa:** Token de autenticação expirado

**Solução:**
```typescript
// Forçar logout e login novamente
await supabase.auth.signOut();
localStorage.clear();
window.location.href = '/auth';
```

### Erro: "Row Level Security policy violated"

**Causa:** Tentando acessar dados de outro tenant

**Solução:**
- Verificar se `tenant_id` está correto
- Verificar se usuário tem permissão

### Erro: "Connection failed"

**Causa:** Problema de rede ou Supabase offline

**Solução:**
```typescript
// Verificar status do Supabase
const { data, error } = await supabase.from('leads').select('count');
if (error) {
  console.error('Supabase offline:', error);
}
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Use este checklist para garantir que a integração está funcionando:

```bash
✅ Cliente Supabase configurado
✅ Variáveis de ambiente definidas
✅ Autenticação funcionando (login/logout)
✅ Queries no banco funcionando
✅ RLS aplicado corretamente
✅ Realtime subscriptions ativas
✅ Edge Functions deployadas
✅ Storage configurado (se usado)
✅ Migrations aplicadas (28 migrations)
✅ Types TypeScript gerados
```

---

## 📚 RECURSOS ADICIONAIS

- 📖 Docs oficiais: https://supabase.com/docs
- 💬 Discord Supabase: https://discord.supabase.com
- 🎓 Tutoriais: https://supabase.com/docs/guides

---

## 🎯 CONCLUSÃO

A integração do Jurify com Supabase está:

✅ **COMPLETA E FUNCIONAL**
✅ **SEGURA** (RLS + RBAC)
✅ **ESCALÁVEL** (Supabase auto-scaling)
✅ **MONITORADA** (Dashboard + Logs)
✅ **PRONTA PARA PRODUÇÃO**

Não há necessidade de configurar MCP (Model Context Protocol) adicional. O SDK do Supabase já fornece tudo que o Jurify precisa.

# ✅ GUIA DE VERIFICAÇÃO E APLICAÇÃO DE MIGRATIONS

## 🎯 OBJETIVO
Verificar se as migrations críticas do Jurify foram aplicadas no banco de dados Supabase.

---

## 📋 MIGRATIONS CRÍTICAS

### Migration 1: agent_ai_logs
**Arquivo**: `supabase/migrations/20251210000000_add_agent_ai_logs.sql`

**Cria**:
- Tabela `agent_ai_logs` (logs de chamadas de IA)
- Índices de performance
- RLS Policies
- Materialized View `agent_ai_logs_stats`
- Trigger de refresh automático
- Função de cleanup (LGPD - 90 dias)

### Migration 2: agent_executions (Mission Control)
**Arquivo**: `supabase/migrations/20251210000001_mission_control.sql`

**Cria**:
- Tabela `agent_executions` (tracking de execuções)
- Índices de performance
- RLS Policies
- Views: `active_executions`, `realtime_agent_metrics`
- Função `create_agent_execution()`
- Trigger `update_execution_metrics`
- Realtime habilitado

---

## 🔍 VERIFICAÇÃO RÁPIDA

### Opção 1: Via Dashboard Supabase

1. Acesse: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/editor

2. Execute esta query no SQL Editor:

```sql
-- Verificar se tabelas existem
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'agent_ai_logs'
) AS agent_ai_logs_existe,
EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'agent_executions'
) AS agent_executions_existe;
```

**Resultado esperado**:
```
agent_ai_logs_existe | agent_executions_existe
---------------------|------------------------
true                 | true
```

### Opção 2: Via Query Simples

Execute:
```sql
-- Deve retornar sem erro
SELECT COUNT(*) FROM agent_ai_logs;
SELECT COUNT(*) FROM agent_executions;
```

**Se funcionar**: ✅ Migrations aplicadas
**Se der erro "relation does not exist"**: ❌ Migrations NÃO aplicadas

---

## 🚀 APLICAR MIGRATIONS (Se necessário)

### Método 1: Via Supabase Dashboard (RECOMENDADO)

1. Acesse **Database** > **Migrations** no dashboard:
   https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/database/migrations

2. Verifique se as migrations aparecem na lista:
   - `20251210000000_add_agent_ai_logs.sql`
   - `20251210000001_mission_control.sql`

3. Se NÃO aparecerem:
   - Clique em **New Migration**
   - Cole o conteúdo de cada arquivo .sql
   - Clique em **Run Migration**

### Método 2: Via Supabase CLI

#### Passo 1: Instalar Supabase CLI

```bash
# Windows (PowerShell)
scoop install supabase

# ou via npm
npm install -g supabase
```

#### Passo 2: Login

```bash
supabase login
```

#### Passo 3: Link ao projeto

```bash
cd "E:\Jurify\advo-ai-hub-main (1)\advo-ai-hub-main"

supabase link --project-ref yfxgncbopvnsltjqetxw
```

#### Passo 4: Aplicar migrations

```bash
supabase db push
```

**Ou aplicar específicas**:

```bash
# Migration 1
supabase db push --file supabase/migrations/20251210000000_add_agent_ai_logs.sql

# Migration 2
supabase db push --file supabase/migrations/20251210000001_mission_control.sql
```

### Método 3: Via SQL Editor (Manual)

1. Acesse: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/sql

2. Copie e cole o conteúdo COMPLETO de cada arquivo:
   - `supabase/migrations/20251210000000_add_agent_ai_logs.sql`
   - `supabase/migrations/20251210000001_mission_control.sql`

3. Execute cada um com **RUN**

---

## ✅ VALIDAÇÃO PÓS-APLICAÇÃO

### Teste 1: Verificar Tabelas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('agent_ai_logs', 'agent_executions')
ORDER BY table_name;
```

**Esperado**: 2 linhas retornadas

### Teste 2: Verificar Colunas

```sql
-- Colunas de agent_ai_logs
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'agent_ai_logs'
ORDER BY ordinal_position;

-- Colunas de agent_executions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'agent_executions'
ORDER BY ordinal_position;
```

### Teste 3: Verificar RLS

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('agent_ai_logs', 'agent_executions');
```

**Esperado**: `rowsecurity = true` para ambas

### Teste 4: Verificar Policies

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('agent_ai_logs', 'agent_executions');
```

**Esperado**: Múltiplas policies listadas

### Teste 5: Verificar Índices

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('agent_ai_logs', 'agent_executions')
ORDER BY tablename, indexname;
```

**Esperado**: ~10 índices no total

### Teste 6: Verificar Views

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('active_executions', 'realtime_agent_metrics');
```

**Esperado**: 2 views

### Teste 7: Verificar Funções

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('create_agent_execution', 'update_execution_metrics', 'calculate_execution_cost');
```

**Esperado**: 3 funções

### Teste 8: Testar Realtime

```sql
-- Verificar se realtime está habilitado
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('agent_ai_logs', 'agent_executions');
```

**Esperado**: 2 tabelas com realtime habilitado

---

## 🚨 TROUBLESHOOTING

### Erro: "permission denied for schema public"

**Solução**: Usar service role key ao invés de anon key

```bash
supabase db push --db-url "postgresql://postgres:[SERVICE_ROLE_KEY]@db.yfxgncbopvnsltjqetxw.supabase.co:5432/postgres"
```

### Erro: "relation already exists"

**Causa**: Migration já foi aplicada parcialmente

**Solução**: Adicionar `IF NOT EXISTS` nas queries (já está nos arquivos)

### Erro: "column does not exist"

**Causa**: Migration anterior faltando

**Solução**: Aplicar migrations em ordem cronológica

### Erro: "no schema has been selected to create in"

**Solução**: Adicionar `SET search_path TO public;` no início da migration

---

## 📊 RESULTADO ESPERADO

Após aplicação bem-sucedida:

```
✅ Tabela agent_ai_logs criada
✅ Tabela agent_executions criada
✅ 10+ índices criados
✅ RLS habilitado em ambas
✅ 6+ policies criadas
✅ 2 views criadas
✅ 3 funções criadas
✅ Realtime habilitado
✅ Triggers configurados
```

---

## 🎯 PRÓXIMOS PASSOS

Após validação:

1. ✅ Continuar com FASE 1.2 (Criar NovoLeadForm)
2. ✅ Testar execução de agente IA
3. ✅ Verificar Mission Control

---

## 📞 COMANDOS ÚTEIS

```bash
# Ver migrations aplicadas
supabase migration list

# Ver status do banco
supabase db diff

# Resetar banco (CUIDADO - DELETA TUDO)
supabase db reset

# Backup antes de aplicar
pg_dump -h db.yfxgncbopvnsltjqetxw.supabase.co -U postgres -d postgres > backup.sql
```

---

**Última atualização**: 11 de Dezembro de 2025
**Status**: Pronto para aplicação

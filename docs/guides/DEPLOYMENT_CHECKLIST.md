# ✅ JURIFY - CHECKLIST DE DEPLOYMENT v2.0

## 📋 Guia Visual de Deploy Passo a Passo

---

## 🎯 PRÉ-REQUISITOS

### Ferramentas Instaladas
- [ ] Node.js v18+ instalado
- [ ] npm v8+ instalado
- [ ] Supabase CLI instalado
- [ ] Git instalado (opcional)

### Verificar Instalação
```bash
node -v      # Deve mostrar v18.x.x ou superior
npm -v       # Deve mostrar 8.x.x ou superior
supabase -v  # Deve mostrar versão
```

---

## 📂 ESTRUTURA DO PROJETO

### Arquivos Críticos Criados
- [ ] `supabase/functions/ai-agent-processor/index.ts`
- [ ] `supabase/migrations/20251210000000_add_agent_ai_logs.sql`
- [ ] `src/lib/multiagents/core/BaseAgent.ts`
- [ ] `src/lib/multiagents/core/MultiAgentSystem.ts`
- [ ] `src/lib/multiagents/validation/schemas.ts`
- [ ] `src/lib/multiagents/types/index.ts`
- [ ] `src/lib/multiagents/agents/*.ts` (7 agentes)

### Documentação Criada
- [ ] `REFACTORING_SUMMARY.md`
- [ ] `MIGRATION_GUIDE.md`
- [ ] `EXECUTIVE_SUMMARY.md`
- [ ] `src/lib/multiagents/README.md`

---

## 🔐 CONFIGURAÇÃO DE AMBIENTE

### 1. Arquivo .env (Frontend)
```bash
cd "advo-ai-hub-main (1)/advo-ai-hub-main"
```

Criar/editar `.env`:
- [ ] `VITE_SUPABASE_URL` = https://xxxxx.supabase.co
- [ ] `VITE_SUPABASE_ANON_KEY` = eyJhbGc...

### 2. Secrets no Supabase (Edge Function)
- [ ] `OPENAI_API_KEY` = sk-...
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = eyJhbGc...

**Comando**:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

**Verificar**:
```bash
supabase secrets list
```

---

## 📦 INSTALAÇÃO E VALIDAÇÃO

### 1. Instalar Dependências
```bash
cd "advo-ai-hub-main (1)/advo-ai-hub-main"
npm install
```

### 2. Executar Testes
```bash
npm run type-check  # ✅ Deve passar sem erros
npm run test        # ✅ 21/21 testes devem passar
npm run lint        # ✅ Sem warnings críticos
```

**Status Esperado**:
- [ ] Type-check: ✅ 0 erros
- [ ] Testes: ✅ 21/21 passed
- [ ] Lint: ✅ 0 errors

---

## 🗄️ BANCO DE DADOS

### 1. Aplicar Migrações
```bash
cd supabase
supabase db push
```

### 2. Verificar Tabelas Criadas
No Supabase Dashboard > Table Editor:
- [ ] Tabela `agent_ai_logs` existe
- [ ] Tabela tem colunas corretas (agent_name, model, total_tokens, etc)
- [ ] Materialized view `agent_ai_logs_stats` existe

### 3. Verificar RLS Policies
No Supabase Dashboard > Authentication > Policies:
- [ ] `agent_ai_logs` tem RLS habilitado
- [ ] Policies existem: "Users can view", "Service role can insert", "Admins can delete"

---

## ⚡ EDGE FUNCTION

### 1. Deploy
```bash
supabase functions deploy ai-agent-processor
```

**Status Esperado**:
```
Deploying function ai-agent-processor...
✅ Deployed function ai-agent-processor in region [region]
```

### 2. Verificar Logs
```bash
supabase functions logs ai-agent-processor --tail
```

### 3. Testar Manualmente (curl)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/ai-agent-processor \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "Test",
    "agentSpecialization": "Testing",
    "systemPrompt": "You are a test",
    "userPrompt": "Say hello"
  }'
```

**Resposta Esperada**:
- ❌ `{"error":"Unauthorized"}` → Normal (precisa estar autenticado)
- ✅ `{"result":"Hello!","usage":{...}}` → Funcionando!

---

## 🏗️ BUILD E DEPLOY

### 1. Build Local
```bash
npm run build
```

**Status Esperado**:
- [ ] Build completa sem erros
- [ ] Pasta `dist/` criada
- [ ] Arquivos estáticos gerados

### 2. Testar Build Localmente
```bash
npm run preview
```

Abrir `http://localhost:4173` e testar:
- [ ] App carrega sem erros
- [ ] Console sem erros
- [ ] Multiagent system inicializa

---

## ✅ VALIDAÇÃO FINAL

### 1. Checklist Funcional
No navegador (dev ou preview):
- [ ] App abre sem erros
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Console sem erros críticos

### 2. Checklist de Agentes
```javascript
// No console do navegador
import { multiAgentSystem } from '@/lib/multiagents';

await multiAgentSystem.initialize();
console.log(multiAgentSystem.getSystemStats());
// Deve mostrar: { total_agents: 7, ... }
```

### 3. Checklist de Banco
No Supabase Dashboard > Database:
```sql
SELECT COUNT(*) FROM agent_ai_logs;
```

Após usar o sistema, deve haver logs.

### 4. Checklist de Edge Function
No Supabase Dashboard > Edge Functions:
- [ ] `ai-agent-processor` aparece na lista
- [ ] Status: Deployed
- [ ] Logs mostram requisições (se houver)

---

## 🚀 DEPLOY EM PRODUÇÃO

### Opção A: Script Automatizado (Recomendado)

**Windows PowerShell**:
```powershell
.\deploy-multiagent-system.ps1
```

**Linux/Mac**:
```bash
chmod +x deploy-multiagent-system.sh
./deploy-multiagent-system.sh
```

### Opção B: Manual

1. **Aplicar Migrações**
```bash
cd supabase
supabase db push
```

2. **Deploy Edge Function**
```bash
supabase functions deploy ai-agent-processor
```

3. **Configurar Secrets**
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

4. **Build**
```bash
npm run build
```

5. **Deploy** (depende da plataforma)
- Vercel: `vercel --prod`
- Netlify: `netlify deploy --prod`
- Outros: Seguir documentação específica

---

## 🔍 VERIFICAÇÕES PÓS-DEPLOY

### 1. Saúde do Sistema (5 min após deploy)
- [ ] Site carrega normalmente
- [ ] Login funciona
- [ ] Dashboard exibe dados
- [ ] Console sem erros críticos

### 2. Edge Function (10 min após deploy)
```bash
supabase functions logs ai-agent-processor --limit 10
```

Verificar:
- [ ] Logs aparecem
- [ ] Não há erros 500
- [ ] Autenticação funciona

### 3. Banco de Dados (15 min após deploy)
```sql
-- Total de logs de IA
SELECT COUNT(*) FROM agent_ai_logs;

-- Últimos 10 logs
SELECT agent_name, model, total_tokens, created_at
FROM agent_ai_logs
ORDER BY created_at DESC
LIMIT 10;
```

### 4. Analytics (1 hora após deploy)
```sql
SELECT * FROM agent_ai_logs_stats
WHERE date = CURRENT_DATE;
```

---

## 🐛 TROUBLESHOOTING

### Problema: Edge Function retorna 401
**Causa**: Falta autenticação
**Solução**: Adicionar header Authorization com token válido

### Problema: Tabela agent_ai_logs não existe
**Causa**: Migração não aplicada
**Solução**: `supabase db push`

### Problema: OPENAI_API_KEY not configured
**Causa**: Secret não configurado
**Solução**: `supabase secrets set OPENAI_API_KEY=sk-...`

### Problema: Type errors no build
**Causa**: Imports antigos ou código incompatível
**Solução**: Verificar `MIGRATION_GUIDE.md`

### Problema: Testes falhando
**Causa**: Mocks incorretos ou dependências desatualizadas
**Solução**: `npm install && npm run test`

---

## 📊 MÉTRICAS DE SUCESSO

### Dia 1
- [ ] 0 erros críticos em produção
- [ ] Edge Function respondendo < 2s
- [ ] Testes passando 100%
- [ ] Logs sendo salvos corretamente

### Semana 1
- [ ] Taxa de erro < 1%
- [ ] Latência média < 1.5s
- [ ] Custo de IA dentro do orçamento
- [ ] Usuários sem reclamações de bugs

### Mês 1
- [ ] Sistema estável (99.9% uptime)
- [ ] Logs auditáveis funcionando
- [ ] Analytics gerados automaticamente
- [ ] Equipe familiarizada com nova arquitetura

---

## 🎯 PRÓXIMOS PASSOS

### Imediato (Semana 1)
- [ ] Monitorar logs diariamente
- [ ] Verificar custos de OpenAI
- [ ] Ajustar limites se necessário
- [ ] Coletar feedback da equipe

### Curto Prazo (Mês 1)
- [ ] Implementar alerts para erros
- [ ] Configurar backup automático
- [ ] Documentar procedimentos operacionais
- [ ] Treinar equipe na nova arquitetura

### Médio Prazo (Trimestre 1)
- [ ] Otimizar custos de IA
- [ ] Implementar cache de respostas
- [ ] Adicionar retry logic
- [ ] Melhorar analytics

---

## 📞 CONTATOS DE EMERGÊNCIA

### Em Caso de Problema Crítico

1. **Verificar Status do Sistema**
   ```bash
   supabase functions logs ai-agent-processor --tail
   ```

2. **Rollback (se necessário)**
   - Reverter última migração
   - Deploy versão anterior
   - Restaurar backup

3. **Suporte**
   - Documentação: Ver `MIGRATION_GUIDE.md`
   - Logs: Supabase Dashboard
   - Testes: `npm run test`

---

## ✅ SIGN-OFF FINAL

### Aprovações Necessárias

- [ ] **Tech Lead**: Revisou código e arquitetura
- [ ] **DevOps**: Verificou infraestrutura e deploy
- [ ] **Security**: Validou RLS policies e secrets
- [ ] **QA**: Executou testes e validou funcionamento
- [ ] **Product**: Aprovou para produção

### Checklist Final do Deploy

- [ ] Todos os testes passando (21/21)
- [ ] Build de produção funcionando
- [ ] Edge Function deployed
- [ ] Secrets configurados
- [ ] Migrações aplicadas
- [ ] RLS policies ativas
- [ ] Logs sendo salvos
- [ ] Documentação atualizada
- [ ] Equipe treinada
- [ ] Monitoramento configurado

### Assinatura

```
Nome: _______________________________
Cargo: ______________________________
Data: _______________________________
Assinatura: _________________________
```

---

**🚀 DEPLOY AUTORIZADO - JURIFY MULTIAGENT SYSTEM v2.0**

**Versão**: 2.0.0
**Data**: 10/12/2025
**Status**: ✅ PRONTO PARA PRODUÇÃO

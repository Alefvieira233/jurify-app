# JURIFY - CHANGELOG: Premium Upgrade (v3.0.0)
**Data:** 06/02/2026

---

## BUGS CRÍTICOS CORRIGIDOS

### 1. WhatsAppMultiAgent.ts — process.env no Browser
- **Antes:** Usava `process.env.WHATSAPP_ACCESS_TOKEN` que não existe no Vite (browser)
- **Depois:** Reescrito para usar Edge Functions via `supabase.functions.invoke()`. Zero credenciais no client-side.
- **Arquivo:** `src/lib/integrations/WhatsAppMultiAgent.ts`

### 2. Tenant Resolution Inseguro no Webhook
- **Antes:** Se não achava tenant, pegava qualquer tenant do banco (`profiles LIMIT 1`)
- **Depois:** Removido fallback genérico. Busca apenas por `configuracoes_integracoes` ou conversa existente.
- **Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

### 3. Código Legado Removido
- **Removido:** Pasta `src/lib/agents-legacy/` inteira (5 arquivos, ~60KB)
- **Migrado:** Tipos `AgentType`, `LegacyAgentConfig`, `EscalationRule`, `LeadInteraction` para `src/lib/multiagents/types/index.ts`
- **Atualizado:** 4 arquivos que importavam do legacy agora importam do módulo correto

### 4. CommunicatorAgent — Integração Segura
- **Antes:** Importava `WhatsAppMultiAgent` (quebrado com process.env)
- **Depois:** Importa `EnterpriseWhatsApp` (seguro, via Edge Functions)
- **Arquivo:** `src/lib/multiagents/agents/CommunicatorAgent.ts`

---

## FEATURES PREMIUM IMPLEMENTADAS

### 5. Logger Estruturado
- Logger com níveis (debug/info/warn/error)
- Em produção: suprime debug e info automaticamente
- Substitui `console.log` com emojis por logs estruturados
- **Arquivo:** `src/lib/logger.ts`

### 6. MCP — Model Context Protocol (Memória de Longo Prazo)
- Agentes agora "lembram" de interações anteriores com cada lead
- Busca semântica de memórias via pgvector (embeddings)
- Tipos de memória: conversation, decision, preference, fact, summary
- Importância de 1-10 para priorização
- Expiração automática de memórias
- Integrado automaticamente no `BaseAgent.processWithAI()`
- **Arquivos:**
  - `supabase/migrations/20260206000000_agent_memory_mcp.sql` (tabela + RPC + índices)
  - `src/lib/multiagents/core/AgentMemory.ts` (service)
  - `src/lib/multiagents/core/BaseAgent.ts` (integração)

### 7. Workflow Queue (Async Jobs com Retry)
- Fila de trabalhos assíncronos com prioridade (1-10)
- Retry automático com backoff exponencial
- Dead letter queue para jobs que falharam todas as tentativas
- Lock atômico com `FOR UPDATE SKIP LOCKED` (sem race conditions)
- Controle de concorrência e idempotência
- Timeout de locks com liberação automática
- **Arquivos:**
  - `supabase/migrations/20260206000001_workflow_queue.sql` (tabela + RPCs)
  - `src/lib/multiagents/core/WorkflowQueue.ts` (service)

### 8. Hash de Documentos (Blockchain-Ready)
- SHA-256 de cada documento no upload
- Verificação de integridade (arquivo alterado?)
- Registro de quem assinou e quando
- Campos preparados para blockchain (`blockchain_tx_id`, `blockchain_network`)
- Índice único por tenant+hash (sem duplicatas)
- **Arquivos:**
  - `supabase/migrations/20260206000002_document_hash.sql` (tabela + RPC)
  - `src/lib/document-hash.ts` (service)

### 9. WhatsApp Webhook Melhorado
- Suporte a mensagens de media (image, document, audio)
- Tracking de status de entrega (sent, delivered, read, failed)
- Salva `media_url` e `message_type` correto no banco
- Logging reduzido (sem dump do payload inteiro)
- **Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

---

## COMPARAÇÃO COM REFERÊNCIA DO MENTOR (ATUALIZADA)

| Feature do Mentor | Jurify v3.0 | Status |
|-------------------|-------------|--------|
| Orquestração multiagente | ✅ 7 agentes + Coordenador + fallback + retry | 🟢 |
| Inngest/workflows assíncronos | ✅ WorkflowQueue com retry, dead letter, locks | 🟢 |
| Frontend React | ✅ React 18 + TypeScript + Vite + shadcn/ui | 🟢 |
| Backend com auth | ✅ Supabase Auth + Edge Functions + RLS | 🟢 |
| Banco vetorial + RAG | ✅ pgvector + embeddings + RAG no BaseAgent | 🟢 |
| MCP (memória de agentes) | ✅ AgentMemory com busca semântica | 🟢 |
| OCR para documentos | ✅ pdfjs + OCR.space | 🟢 |
| Hash blockchain-ready | ✅ SHA-256 + campos para blockchain | 🟢 |
| Deploy web + backend | ✅ Vercel + Supabase Cloud | 🟢 |
| Mobile React Native | ❌ Não implementado | 🟡 Roadmap |

**Score: 9/10** — Falta apenas mobile.

---

## ARQUIVOS CRIADOS/MODIFICADOS

### Criados (novos)
- `src/lib/logger.ts`
- `src/lib/document-hash.ts`
- `src/lib/multiagents/core/AgentMemory.ts`
- `src/lib/multiagents/core/WorkflowQueue.ts`
- `supabase/migrations/20260206000000_agent_memory_mcp.sql`
- `supabase/migrations/20260206000001_workflow_queue.sql`
- `supabase/migrations/20260206000002_document_hash.sql`

### Modificados
- `src/lib/integrations/WhatsAppMultiAgent.ts` — reescrito (seguro)
- `src/lib/multiagents/core/BaseAgent.ts` — MCP + logger integrados
- `src/lib/multiagents/agents/CommunicatorAgent.ts` — usa EnterpriseWhatsApp
- `src/lib/multiagents/types/index.ts` — tipos migrados do legacy
- `src/lib/multiagents/index.ts` — exports dos novos módulos
- `src/components/AgentTypeManager.tsx` — import migrado
- `src/components/NovoAgenteForm.tsx` — import migrado
- `src/hooks/agents/useAgentCrud.ts` — import migrado
- `src/hooks/useAgentEngine.ts` — import migrado
- `supabase/functions/whatsapp-webhook/index.ts` — media + status tracking

### Removidos
- `src/lib/agents-legacy/` (5 arquivos)

---

## AUDITORIA v3.1 — CORREÇÕES DE SEGURANÇA E UX (06/02/2026)

### Bugs Críticos de Segurança
1. **`hasRole('admin')` sempre retornava `true`** — Lógica invertida no AuthContext corrigida
2. **CORS aberto (`*`)** — `_shared/cors.ts` agora tem fallback seguro com domínios específicos (localhost, jurify.vercel.app, jurify.com.br)
3. **Emergency Profile em produção** — Bloqueado via `import.meta.env.MODE !== 'production'`

### Performance
4. **`useContratos` sem paginação** — Adicionado `.limit(100)` e select otimizado (sem `texto_contrato` pesado na listagem)
5. **Tipos ajustados** — `texto_contrato` e `clausulas_customizadas` agora opcionais em `ContratoRow`, `DetalhesContrato` e `GerarAssinaturaZapSign`

### Observabilidade
6. **Logger estruturado** — Migrado `console.log` para `createLogger()` em `useContratos`, `useLeads`, `useWhatsAppConversations`

### UX/UI
7. **Busca Global (Ctrl+K)** — Novo componente `GlobalSearch.tsx` com busca de leads, contratos e agendamentos, navegação por teclado, quick links
8. **Indicador Ctrl+K na Sidebar** — Botão "Buscar..." com atalho visível
9. **Stripe checkout toast** — Dashboard detecta `session_id` e mostra confirmação de pagamento

### Arquivos v3.1
- **Criados:** `src/components/GlobalSearch.tsx`
- **Modificados:** `src/contexts/AuthContext.tsx`, `supabase/functions/_shared/cors.ts`, `src/hooks/useContratos.ts`, `src/hooks/useLeads.ts`, `src/hooks/useWhatsAppConversations.ts`, `src/components/Layout.tsx`, `src/components/Sidebar.tsx`, `src/components/DetalhesContrato.tsx`, `src/components/GerarAssinaturaZapSign.tsx`, `src/features/dashboard/Dashboard.tsx`

### Deploy
- **16 Edge Functions** re-deployed com CORS atualizado
- **Build TypeScript + Vite:** LIMPO (0 erros)

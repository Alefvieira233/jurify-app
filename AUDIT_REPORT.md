# JURIFY — Auditoria Técnica Profunda (Tech Lead + QA)

> **Data:** 04/03/2026
> **Método:** Análise de fluxo real de dados (Input→Output) arquivo por arquivo
> **Escopo:** WhatsApp, Google Agenda, Agentes IA, CRM, Segurança, Dependências
> **Validação terminal:** tsc 0 erros | npm audit 0 vulnerabilidades | 455/455 testes passando

---

## 1. ✅ O QUE ESTÁ 100% OPERACIONAL

### Infraestrutura de Código
- **TypeScript**: `tsc --noEmit --skipLibCheck` → **0 erros**
- **Dependências**: `npm audit` → **0 vulnerabilidades**
- **Testes**: **455 passed**, 2 skipped, **0 failed** (24 test files, 9.26s)
- **Build de produção**: `vite build` → sucesso em ~14s, chunks otimizados com code splitting

### Arquitetura Frontend
- **React Query**: `useLeads`, `useContratos`, `useAgendamentos` migrados para `useQuery`/`useMutation` com cache, deduplicação e optimistic updates
- **Auth Context**: `SESSION_TIMEOUT_MS` = 15s (fora do componente, sem re-render)
- **Multi-tenant**: `tenant_id` injetado em todas as mutations (`createLead`, `createContrato`, etc.)
- **Realtime**: Canal WhatsApp conversations filtrado por `tenant_id`
- **RBAC**: Role-based permissions matrix implementada em `src/types/rbac.ts`
- **Error Boundaries**: Sentry integrado com lazy-loading via `React.lazy`

### Edge Functions (Estrutura)
- **27 Edge Functions** deployadas com `Deno.serve()` (padrão moderno)
- **CORS**: Corretamente configurado com whitelist + regex para Vercel deploys
- **Rate Limiting**: Implementado em `_shared/rate-limiter.ts` com fallback in-memory
- **Sentry**: Inicializado em funções críticas (`ai-agent-processor`)

### CRM Pipeline
- **Lead normalization**: `normalizeLead()` como função pura fora do hook
- **Pagination**: Suportada via React Query com `queryKey` dinâmica
- **Deduplicação WhatsApp**: In-memory + DB-backed (`webhook_events`) com TTL de 5 min

---

## 2. 🔴 PROBLEMAS CRÍTICOS (Bloqueiam Produção)

### CRIT-01: WhatsApp — Evolution API provavelmente não configurada/acessível
- **Fluxo**: Frontend → `evolution-manager` Edge Function → `EVOLUTION_API_BASE_URL`
- **Arquivo**: `supabase/functions/evolution-manager/index.ts:19-23`
- **Evidência**: A função verifica `EVOLUTION_API_BASE_URL || EVOLUTION_API_URL` — se nenhuma estiver configurada, retorna HTTP 503 com hint de IP hardcoded (`76.13.226.20:8080`)
- **Root Cause provável**: Secrets `EVOLUTION_API_BASE_URL` e `EVOLUTION_API_KEY` não configurados no Supabase Dashboard → Settings → Edge Functions → Secrets
- **Impacto**: Sem estas variáveis, nenhuma operação WhatsApp funciona (criar instância, QR code, enviar mensagem, webhook)
- **Verificação necessária**:
  ```bash
  # No Supabase Dashboard, verificar se estas secrets existem:
  EVOLUTION_API_BASE_URL=http://SEU-IP:8080
  EVOLUTION_API_KEY=sua-chave-aqui
  EVOLUTION_WEBHOOK_SECRET=um-segredo-qualquer
  ```

### CRIT-02: Agente JurifyBoy — `OPENAI_API_KEY` ausente ou inválida
- **Fluxo**: Frontend (`EnhancedAIChat.tsx`) → `supabase.functions.invoke('ai-agent-processor')` → OpenAI API
- **Arquivo**: `supabase/functions/ai-agent-processor/index.ts:409-411`
- **Evidência**: Erro "Desculpe, ocorreu um erro ao processar sua mensagem" = resposta genérica do catch block na linha 466-481
- **Root Cause provável (em ordem de probabilidade)**:
  1. `OPENAI_API_KEY` não configurada nas Secrets do Supabase
  2. API key expirada ou com cota esgotada
  3. Rate limit de 20 req/min/user sendo atingido muito rápido
  4. Modelo `gpt-4o` não disponível na conta OpenAI
- **Verificação necessária**:
  ```bash
  # Testar diretamente:
  curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/ai-agent-processor \
    -H "Authorization: Bearer SEU_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"agentName":"Test","agentSpecialization":"Test","systemPrompt":"Diga oi","userPrompt":"oi"}'
  ```

### CRIT-03: `google-calendar/index.ts` — `exchange_code`/`refresh_token` não tratados
- **Fluxo**: Frontend (`GoogleOAuthService.ts`) → `supabase.functions.invoke('google-calendar', { body: { action: 'exchange_code' } })`
- **Arquivo**: `supabase/functions/google-calendar/index.ts:37-91`
- **Problema**: O handler usa `switch(method)` onde `method` vem de `req.json().method`, mas o frontend envia `action` (campo diferente). Resultado: **sempre cai no `default` → "Method undefined not supported"**
- **Código afetado**:
  ```typescript
  // Frontend envia: { action: 'exchange_code', code, redirect_uri }
  // Edge Function espera: { method: 'listEvents'|'createEvent'|... }
  const { method, data } = await req.json()  // ← method é undefined!
  ```
- **Impacto**: OAuth do Google Calendar está **100% quebrado** — troca de código e refresh de token falham silenciosamente
- **Fix necessário**: A Edge Function precisa tratar `action: 'exchange_code'` e `action: 'refresh_token'` vindos do `GoogleOAuthService.ts`

---

## 3. 🟡 FALSOS POSITIVOS (Parecem funcionar mas falham em edge cases)

### FP-01: WhatsApp webhook salva mensagem da IA antes de enviar
- **Arquivo**: `supabase/functions/whatsapp-webhook/index.ts:704-710` (save) vs `713-717` (send)
- **Problema**: A mensagem da IA é salva no banco ANTES de ser enviada via Evolution/Meta. Se o envio falhar, o usuário vê a mensagem no chat mas ela nunca chegou ao WhatsApp do cliente
- **Severidade**: MEDIUM — UX confusa, mas não perde dados

### FP-02: `whatsapp_messages` não tem `tenant_id` na coluna de INSERT do webhook
- **Arquivo**: `supabase/functions/whatsapp-webhook/index.ts:614-621`
- **Problema**: O INSERT em `whatsapp_messages` não inclui `tenant_id`. Se a tabela tem RLS baseado em `tenant_id`, o insert pode falhar silenciosamente com `service_role_key` (que bypassa RLS) mas queries futuras com `anon_key` podem não encontrar as mensagens
- **Severidade**: MEDIUM — depende da configuração de RLS

### FP-03: Coordenador AI prompt sem proteção contra alucinação jurídica
- **Arquivo**: `supabase/functions/whatsapp-webhook/index.ts:642-659`
- **Problema**: O prompt diz "NUNCA dê orientação jurídica específica" mas não há validação de output. Se a IA alucinar e der um conselho jurídico errado, não há filtro pós-processamento
- **Atenuante**: Temperature 0.6 e max_tokens 500 limitam a criatividade
- **Severidade**: HIGH em contexto jurídico — risco regulatório

### FP-04: `useAgentesIA` ainda usa `useSupabaseQuery` (wrapper deprecated)
- **Arquivo**: `src/hooks/useAgentesIA.ts:16,126`
- **Problema**: Enquanto `useLeads`, `useContratos` e `useAgendamentos` foram migrados para React Query, `useAgentesIA` ainda usa o wrapper caseiro `useSupabaseQuery` marcado como `@deprecated`
- **Severidade**: LOW — funciona, mas inconsistente com o resto do codebase

### FP-05: Evolution API envia mensagem sem garantir que instância está conectada
- **Arquivo**: `supabase/functions/whatsapp-webhook/index.ts:726-773` (`sendViaEvolution`)
- **Problema**: Não verifica `connectionState` antes de tentar enviar. Se o WhatsApp desconectou (timeout, reinício), o envio falha silenciosamente após 2 retries
- **Severidade**: MEDIUM — mensagens de resposta automática podem se perder

---

## 4. 🟠 ISSUES DE INTEGRAÇÃO (Configuração necessária)

### INT-01: Secrets obrigatórias para WhatsApp funcionar
```
EVOLUTION_API_BASE_URL = http://seu-ip:8080     (ou EVOLUTION_API_URL)
EVOLUTION_API_KEY      = chave-da-evolution-api
EVOLUTION_WEBHOOK_SECRET = segredo-para-validar-webhooks
```
**Onde configurar**: Supabase Dashboard → Project Settings → Edge Functions → Secrets

### INT-02: Secrets obrigatórias para Agentes IA funcionarem
```
OPENAI_API_KEY = sk-...
```
**Onde configurar**: Supabase Dashboard → Project Settings → Edge Functions → Secrets

### INT-03: Secrets obrigatórias para Google Calendar funcionar
```
GOOGLE_CLIENT_ID     = xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = GOCSPx-...
```
**Onde configurar**: Supabase Dashboard → Project Settings → Edge Functions → Secrets

### INT-04: Webhook URL do WhatsApp deve apontar para
```
https://SEU-PROJETO.supabase.co/functions/v1/whatsapp-webhook
```
**Onde configurar**: Evolution API → Instance Settings → Webhook URL

---

## 5. 📐 SUGESTÕES DE REFATORAÇÃO

### REF-01: `whatsapp-webhook/index.ts` — 824 linhas (muito grande)
- **Sugestão**: Extrair em módulos:
  - `_shared/whatsapp-normalize.ts` — normalização Evolution/Meta (linhas 93-211)
  - `_shared/whatsapp-dedup.ts` — deduplicação (linhas 216-269)
  - `_shared/whatsapp-send.ts` — envio Evolution/Meta (linhas 726-823)
  - `_shared/whatsapp-ai.ts` — prompt e invocação do AI agent (linhas 623-717)

### REF-02: `send-whatsapp-message/index.ts` — 435 linhas
- **Sugestão**: Reutilizar `_shared/whatsapp-send.ts` do REF-01 (código duplicado de envio)

### REF-03: `evolution-manager/index.ts` — 457 linhas
- **Sugestão**: Extrair `EvolutionClient` para `_shared/evolution-client.ts`

### REF-04: `WhatsAppEvolutionSetup.tsx` — 620 linhas
- **Sugestão**: Extrair hook `useEvolutionInstance()` com toda a lógica de estado/polling

### REF-05: `useAgentesIA.ts` — Migrar para React Query
- **Sugestão**: Mesmo padrão já aplicado em `useLeads`, `useContratos`, `useAgendamentos`

### REF-06: Encoding UTF-8 corrompido nos comentários das Edge Functions
- **Arquivos afetados**: 11 arquivos em `supabase/functions/`
- **Exemplo**: `requisiÃ§Ãµes` em vez de `requisições`, `CORREÃ‡ÃƒO` em vez de `CORREÇÃO`
- **Fix**: Batch replace com script PowerShell/sed

---

## 6. 📊 VERIFICAÇÃO FINAL VIA TERMINAL

| Verificação | Resultado | Comando |
|---|---|---|
| TypeScript | ✅ 0 erros | `npx tsc --noEmit --skipLibCheck` |
| Vulnerabilidades | ✅ 0 encontradas | `npm audit` |
| Testes unitários | ✅ 455 passed, 2 skipped | `npx vitest run` |
| Build produção | ✅ Sucesso em ~14s | `npx vite build` |
| Edge Functions (local) | ⚠️ Não testável sem `supabase functions serve` | Requer Supabase CLI logado |
| Evolution API | ❌ Não testável | Requer secrets configuradas |
| OpenAI API | ❌ Não testável | Requer `OPENAI_API_KEY` |

---

## 7. 🎯 PLANO DE AÇÃO PRIORITIZADO

### Prioridade 1 — HOJE (desbloqueia produção)
1. [ ] **Configurar secrets no Supabase** (CRIT-01, CRIT-02, INT-01, INT-02, INT-03)
2. [ ] **Corrigir Google Calendar Edge Function** para aceitar `action` do frontend (CRIT-03)
3. [ ] **Testar webhook WhatsApp** com curl após configurar secrets

### Prioridade 2 — ESTA SEMANA
4. [ ] Adicionar `tenant_id` no INSERT de `whatsapp_messages` no webhook (FP-02)
5. [ ] Inverter ordem: enviar mensagem ANTES de salvar no banco (FP-01)
6. [ ] Adicionar validação pós-processamento para respostas jurídicas (FP-03)
7. [ ] Verificar `connectionState` antes de enviar via Evolution (FP-05)

### Prioridade 3 — PRÓXIMA SEMANA
8. [ ] Refatorar `whatsapp-webhook/index.ts` em módulos menores (REF-01)
9. [ ] Migrar `useAgentesIA` para React Query (REF-05)
10. [ ] Corrigir encoding UTF-8 nas Edge Functions (REF-06)
11. [ ] Extrair `useEvolutionInstance` hook (REF-04)
- **Único item pendente**: Regenerar tipos Supabase (requer `project-id`)

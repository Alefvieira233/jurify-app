# Auditoria de Qualidade do Código — Jurify
**Data:** 2026-05-07
**Escopo:** pós-Ondas 15-18 (Calendar free/busy, function calling, stateful pipeline, automation)
**Branch:** main · **Build:** verde 56s · **Lint:** 0 warnings (--max-warnings 0)

---

## 1. Métricas Quantitativas

### LOC totais
| Camada | Arquivos | LOC | Notas |
|---|---|---|---|
| `src/` (app) | 712 | 83.360 | inclui 5.524 LOC de `types.ts` autogerado |
| `supabase/functions/` | ~140 | 19.102 | 54 edge functions deployadas |
| `e2e/` | 21 | ~2.100 | Playwright |
| `src/tests/integration/` | 5 arquivos | ~3.300 | Vitest |
| **Total código produtivo + teste** | — | ~108k LOC | — |

### Testes
| Tipo | Files | Test cases | Observação |
|---|---|---|---|
| Unit/Integration (Vitest) | 123 | 1.413 | `it()`/`test()` blocks |
| E2E (Playwright) | 21 | 110 | mas Sentry/health-smoke 1-2 testes só |
| Edge function tests (Deno/Vitest direto) | **0** | **0** | **lacuna grave** — 1.726 LOC de `process-message.ts` sem teste isolado |

### Arquivos > 500 linhas (top 12, exclui auto-gen)

| Arquivo | LOC | Tipo | Severidade |
|---|---|---|---|
| `supabase/functions/whatsapp-webhook/handlers/process-message.ts` | **1.726** | edge fn | **crítico** |
| `src/integrations/supabase/types.ts` | 5.524 | autogen | ignore |
| `src/tests/integration/edge-functions.test.ts` | 1.063 | teste | aceitável |
| `src/contexts/__tests__/AuthContext.test.tsx` | 979 | teste | aceitável |
| `supabase/functions/kapso-manager/index.ts` | 942 | edge fn | **crítico** |
| `src/components/ui/sidebar.tsx` | 762 | shadcn-gen | baixa |
| `src/tests/legal-modules.test.ts` | 749 | teste | aceitável |
| `src/lib/multiagents/core/BaseAgent.ts` | 675 | core | warning |
| `src/features/documentos/DocumentosManager.tsx` | 656 | feature | **crítico** |
| `src/tests/integration/whatsapp-webhook.test.ts` | 639 | teste | aceitável (47 it) |
| `supabase/functions/assistant/index.ts` | 577 | edge fn | warning |
| `supabase/functions/ai-agent-processor/index.ts` | 536 | edge fn | warning |
| `supabase/functions/send-whatsapp-message/index.ts` | 521 | edge fn | warning |
| `src/features/whatsapp/WhatsAppIA.tsx` | 500 | feature | warning |
| `supabase/functions/_shared/whatsapp-logic.ts` | 499 | shared | warning |

**Tendência alarmante:** `process-message.ts` cresceu de 389 → 1.726 LOC (+343%) entre Ondas 7-18. Apenas **2 funções top-level** (`getSlashCommands` linha 44, `processNormalizedMessage` linha 95). A função principal tem **150 ramificações condicionais** (if/else/switch/case) — complexidade ciclomática estimada **>120**.

### TypeScript safety
- `: any` / `as any` / `as unknown` em **107 ocorrências em 54 arquivos** (era ~150 em audits anteriores; melhorou)
- Concentração em testes (`AuthContext.test.tsx` 16 ocorrências) e `tests/integration/whatsapp-webhook.test.ts` (10) — aceitável para mocks
- Em código de produção: maior ofensor `src/lib/monitoring.ts` (3), `src/hooks/useFollowUps.ts` (4), `src/App.tsx` (3)
- `supabaseUntyped` import: 56 arquivos (DOWN de 133 reportados em 2026-03-29 — boa migração ocorreu)

### Outros
- Console calls em `src/`: **10** (excelente — quase 100% via `createLogger`)
- TODO/FIXME em `src/`: **14** em 9 arquivos · em `supabase/functions/`: **0**
- Circular dependencies: **0** (madge OK)
- npm audit: **0 CVEs**

---

## 2. Duplicações Não Resolvidas (Críticas)

### Duplicação A — Google Calendar (introduzida nas Ondas 15-16)

Existem **DOIS hooks** e **DOIS componentes Card** vivos em produção, com responsabilidades sobrepostas:

| Item | Caminho | LOC | Consumidores |
|---|---|---|---|
| Hook legacy | `src/hooks/useGoogleCalendar.ts` | 296 | 4 (DetalhesAgendamento, GoogleCalendarConfig, GoogleCalendarSync, useAgendaAutomation) |
| Hook novo | `src/hooks/useGoogleCalendarConnection.ts` | 130 | 5 (CalendarPanel, GoogleCalendarCard novo, IntegracoesConfig, useCalendarEvents, GoogleAuthCallback) |
| Hook auxiliar | `src/hooks/useGoogleCalendarEvents.ts` | 195 | 1 (apenas o legacy) |
| Card legacy (ProcessosManager → Configurações) | `src/features/settings/configuracoes/GoogleCalendarCard.tsx` | 178 | montado em `IntegracoesSection` (rota `/configuracoes`) |
| Card novo | `src/features/settings/integrations/GoogleCalendarCard.tsx` | 143 | montado em `IntegracoesConfig` (rota `/integracoes`) |
| Config tela 1 | `src/features/settings/configuracoes/GoogleCalendarConfig.tsx` | 253 | `IntegracoesSection` |
| Sync tela 1 | `src/features/settings/configuracoes/GoogleCalendarSync.tsx` | 133 | `IntegracoesSection` |

**Problema:** rota `/configuracoes` mostra UI antiga (legacy hook + 3 componentes), rota `/integracoes` mostra UI nova (connection hook + 1 card). **Usuário pode ver estados conflitantes** dependendo da rota acessada. O novo `GoogleOAuthService` (166 LOC) é usado pelo legacy hook, enquanto o novo hook chama edge function `google-calendar` direto — **dois fluxos OAuth divergentes**.

**Fix proposto:**
1. Migrar consumidores do legacy `useGoogleCalendar` para `useGoogleCalendarConnection` + `useCalendarEvents`
2. Deletar `useGoogleCalendar.ts`, `useGoogleCalendarEvents.ts`, `GoogleCalendarConfig.tsx`, `GoogleCalendarSync.tsx`, `configuracoes/GoogleCalendarCard.tsx`
3. Decidir rota canônica (`/integracoes` parece ser a nova) e redirect 301 da antiga

### Duplicação B — Página Configurações

| Arquivo | LOC | Status |
|---|---|---|
| `src/features/settings/ConfiguracoesPage.tsx` | 306 | **mounted** em `App.tsx` (rota `/configuracoes`) |
| `src/features/settings/ConfiguracoesGerais.tsx` | 159 | **DEAD CODE** — nenhuma rota referencia. Remover. |

### Duplicação C — IntegracoesConfig vs IntegracoesSection

`IntegracoesConfig` (rota dedicada `/integracoes`, 211 LOC) e `IntegracoesSection` (tab dentro de `/configuracoes`, 238 LOC) **ambos** listam integrações disponíveis com cards. Decidir uma:
- Recomendado: descontinuar `IntegracoesConfig` se Configurações for a hub principal, ou descontinuar a section embutida.

### Duplicação D — useFollowUps consumido em 3 lugares com lógicas inconsistentes

`useFollowUps()` é instanciado em **3 componentes simultaneamente** na mesma árvore (CRMDashboard → FollowUpPanel → LeadDetailPanel). Cada um chama `useFollowUps()` independentemente, gerando **3 queries duplicadas** ao Supabase. Elevar para context ou usar `queryKeys.followUps.list()` cache compartilhado.

### Duplicações documentadas em audits anteriores (verificar status)
- `src/utils/logger.ts` vs `src/lib/logger.ts` — **AINDA NÃO REMOVIDO** (`utils/logger.ts` existe sem consumidores)
- `src/utils/monitoring.ts` vs `src/lib/monitoring.ts` — verificar (monitoring.ts ainda em uso por `useAgendaAutomation`)
- `useCRMTags.ts` deprecated — verificar remoção

---

## 3. Top 10 Dívidas Técnicas Priorizadas

| # | Dívida | Severidade | Esforço | Impacto |
|---|---|---|---|---|
| **1** | `process-message.ts` 1.726 LOC, ciclomática ~120, **sem testes**. Controla todo pipeline de IA WhatsApp em prod. | 🔴 P0 | 3-5d | mudança aqui = bug em produção sem rede de proteção |
| **2** | **Zero edge function tests deno-style.** 19k LOC de Deno funcs validados só indiretamente via mocks Vitest em `supabase-client`. Bugs de runtime Deno só pegamos em prod. | 🔴 P0 | 5d | regressões silenciosas |
| **3** | Duplicação Google Calendar (2 hooks + 4 components + 2 OAuth flows). UX inconsistente entre `/configuracoes` e `/integracoes`. | 🔴 P0 | 1-2d | bugs reportados por user real são quase certos |
| **4** | `kapso-manager/index.ts` 942 LOC concentra 100% da gestão Kapso. Único fail-point para WhatsApp Partner Mode. | 🟠 P1 | 2d | refactor em handlers/ subdir como webhook |
| **5** | `ConfiguracoesGerais.tsx` (159 LOC) **dead code** + `ConfiguracoesPage.tsx` (306 LOC) duplicam navegação de config | 🟡 P2 | 2h | confusão para devs novos |
| **6** | `supabaseUntyped` ainda em 56 arquivos. Cada um é gap de type-safety. | 🟠 P1 | 1d | regenerar `types.ts` + remover casts |
| **7** | `useFollowUps()` instanciado 3× simultaneamente na árvore CRM → 3 queries duplicadas | 🟡 P2 | 4h | refactor para context/cache |
| **8** | Onda 17 (`conversation_state` stateful pipeline) **sem nenhuma referência no frontend** — backend-only por enquanto, sem visibilidade do estado pra suporte/admin | 🟠 P1 | 1d | difícil debug de pipeline travado |
| **9** | Onda 18 (`agent-tools.ts` 167 LOC + `agent-tools-executor.ts` 467 LOC) **sem testes unitários**. Function calling em prod cego. | 🔴 P0 | 1d | erro de tool execution = silent fail |
| **10** | 14 migrations aplicadas após 2026-04-17 mas `SQUASH_REFERENCE.md` não atualizado. Pré-existência de drift conhecido. | 🟡 P2 | 30min | confusão no rebuild local |

---

## 4. Testes Faltando (Críticos)

### Bugs que testes pegariam
| Cenário | Onde testaria | Bug potencial |
|---|---|---|
| `processNormalizedMessage` com slash command + tenant null | edge fn unit test | crash silencioso → mensagem perdida |
| `executeAgentTool` com tool name inválido | `agent-tools-executor.test.ts` (não existe) | `undefined` propagado, lead sem resposta |
| Free/busy do Google Calendar com timezone diferente | `google-calendar/index.ts` deno test | sugestão de horário em UTC mostrada como BRT |
| Stateful pipeline `conversation_state` pending_handoff transition | `conversation_state.test.ts` (não existe) | pipeline travado em handoff |
| 24h window expirada → fallback para template | já existe parcial | OK |
| Trial expirado → bloqueio outbound | parcial em `trial-gate` mas sem teste integração | usuário expirado consegue mandar |
| Smart Reply IA quando OpenAI key inválida | `useSmartReply.test.ts` (não existe) | crash no botão |
| Audio Whisper falha → mensagem fica como `[áudio]` | sem teste | mensagem perdida no histórico |

### Cobertura atual estimada (sem `vitest --coverage` rodado hoje)
- Hooks: ~70% (38 hooks com test files de 60+ totais)
- Features: ~30% (apenas alguns Manager components têm test)
- Edge functions: <5% (apenas via integration tests indiretos em `whatsapp-logic.ts`, `stripe-logic.ts`)
- Pipeline IA agente: **0%** isolado

---

## 5. Antipatterns Detectados

### 5.1 — Hook composition over-engineered no `process-message.ts`
1.726 LOC, 1 função monolítica de ~1.600 linhas. Não está em `src/` (é Deno), mas o padrão se repete em `kapso-manager` (942) e `assistant` (577).

### 5.2 — Re-render no CRM dashboard
`useFollowUps()` invocado 3× → 3 subscriptions ativas. Combinado com 4 useEffect em `Layout.tsx`, render path crítico tem 7 trabalho redundante.

### 5.3 — Dead code acumulado pós-refactor
- `ConfiguracoesGerais.tsx` (159 LOC) sem rota
- `src/utils/logger.ts` sem consumidores
- 4 components GoogleCalendar legacy ainda mounted em rota antiga
- 7 capacitor packages instalados (`android`, `ios`, `browser`, `keyboard`, `splash-screen`, `status-bar`, `filesystem`) marcados como **unused** pelo `depcheck` — ou são de fato unused, ou usados via reflection de plugin (verificar)

### 5.4 — Migration drift potencial
14 migrations criadas após 2026-04-17. Última verificação prod foi `20260423000001_close_security_advisors`. Migrations 2026-05-07 (Ondas 15-18: agendamento_auto_kanban, conversation_state stateful, meeting_reminders_cron, conversation_state_pending_handoff) precisam validação `supabase migration list` em prod.

### 5.5 — Edge function não-frontend não-cron órfãs (suspeitas)
Comparando 54 deployadas vs 27 chamadas pelo frontend + 7 cron jobs (data-retention-cleanup, process-prazos-alerts, auto-followup, weekly-report, cleanup-agent-memory, tribunal-sync, expire-trials, process-meeting-reminders):

**Possivelmente órfãs (verificar):**
- `agent-orchestrator` — chamado apenas internamente por `process-message.ts:734` (OK, não é órfão)
- `agentes-ia-api` — sem referências em src/ ou outros edges. **Potencialmente morta.**
- `process-followup-queue` — sem referências em cron ou frontend. **Potencialmente morta.**
- `health` (vs `health-check`) — duas edges com nome similar; verificar redundância
- `chat-completion`, `vector-search`, `generate-embedding`, `media-processor`, `send-push-notification`, `ingest-document`, `ingest-document-from-file`, `generate-document` — todas referenciadas internamente por `BaseAgent`, `AgentMemory`, `useAgentTraining`, `TrustEngine`. **Mantém.**
- `extract-document-text` — chamada por `useAgentTraining`. OK.

### 5.6 — Padrões pacificados (positivo)
- Lazy loading 100% das rotas via `lazyWithRetry`
- React.memo bem distribuído
- queryKeys factory pattern unificado em `src/lib/queryKeys.ts` (416 LOC)
- Logger único `createLogger(module)` adotado por 80+ files
- Zod schemas em `src/schemas/domain/` para 3+ entidades (lead, contrato, conexão)
- Husky pre-commit hardened
- Lint --max-warnings 0 enforced

---

## 6. Plano de Remediação em 3 Ondas

### 🔴 Onda Q1 — Estancar sangria (esta semana, 8-12h)
1. **Quebrar `process-message.ts`** em 6 sub-handlers em `whatsapp-webhook/handlers/pipeline/`:
   - `slash-command-handler.ts` (~150 LOC)
   - `media-handler.ts` (~200 LOC)
   - `agent-routing.ts` (~250 LOC)
   - `tool-execution.ts` (~200 LOC)
   - `response-builder.ts` (~200 LOC)
   - `state-transitions.ts` (~150 LOC)
   - `process-message.ts` reduz a ~400 LOC orquestrando os 6
2. **Criar testes Deno** para `agent-tools-executor.ts` (cada tool isolada) + `schedule-parser.ts`. Mínimo 20 cases.
3. **Remover dead code Google Calendar:** deletar `ConfiguracoesGerais.tsx`, migrar `DetalhesAgendamento.tsx` e `useAgendaAutomation.ts` para `useGoogleCalendarConnection` + `useCalendarEvents`, deletar `useGoogleCalendar.ts`, `useGoogleCalendarEvents.ts`, `GoogleCalendarConfig.tsx`, `GoogleCalendarSync.tsx`, `configuracoes/GoogleCalendarCard.tsx`.
4. **Validar migration drift:** rodar `supabase migration list` (CLI ou MCP), confirmar que 6 migrations 2026-05-07 estão `applied`.

**Critério de sucesso:** `process-message.ts` < 500 LOC, 20+ novos testes verdes, 0 hooks Google Calendar duplicados.

### 🟠 Onda Q2 — Consolidar (próxima semana, 12-16h)
5. **Decidir rota canônica de Configurações** — escolher `/configuracoes` OU `/integracoes`, deletar a outra ou redirect. Remover `IntegracoesConfig.tsx` ou `IntegracoesSection.tsx` (a perdedora).
6. **`useFollowUps` cache sharing** — refactor para query factory + `useFollowUpsContext` ou usar `select` do react-query para subset.
7. **Validar/deletar edge functions órfãs:** `agentes-ia-api`, `process-followup-queue`, `health`. Smoke test via `curl` + log invocation, deletar se zero hits 30d.
8. **Quebrar `kapso-manager/index.ts`** em handlers (similar ao webhook). Target < 400 LOC.
9. **Remover `src/utils/logger.ts`** (zero consumidores, zero risco).
10. **Regenerar `src/integrations/supabase/types.ts`** e migrar 56 arquivos `supabaseUntyped` para typed `supabase` client.

**Critério de sucesso:** zero arquivos `src/` > 500 LOC (exceto autogen+test), zero rotas duplicadas, `supabaseUntyped` < 10 arquivos.

### 🟡 Onda Q3 — Cobertura e observabilidade (semana 3, 16-24h)
11. **Cobertura 70%+ em hooks críticos:** adicionar test files para `useSmartReply`, `useWhatsAppAI`, `useWhatsAppForward`, `useConversationNotes`, `useExportConversationPDF`.
12. **Edge function deno tests** — meta de 1 arquivo `*.test.ts` por edge function crítica (whatsapp-webhook handlers, kapso-manager, send-whatsapp-message, google-calendar). Adicionar `npm run test:edge` rodando deno test.
13. **Admin UI para `conversation_state` (Onda 17)** — página de debug em `/admin/whatsapp` mostrando estado atual de cada conversa para suporte.
14. **`vitest --coverage` no CI** — failing build se cobertura cair abaixo de baseline. Snapshot inicial e impedir regressão.
15. **Sentry breadcrumbs nos edge handlers críticos** — instrumentar `processNormalizedMessage` com `Sentry.startTransaction` + `setTag('agent', resolvedAgent)` para tracing distribuído.
16. **`SQUASH_REFERENCE.md` atualizado** com 14 migrations novas + nota de drift.

**Critério de sucesso:** cobertura ≥ 70% global, ≥ 50% em edge functions, painel admin de pipeline visível, alertas Sentry para falhas de tool execution.

---

## 7. Métricas de Sucesso (após 3 ondas)

| Métrica | Hoje | Meta |
|---|---|---|
| Arquivo top LOC (não-autogen) | 1.726 (process-message) | < 500 |
| Files > 500 LOC | 12 | ≤ 3 |
| Edge function tests | 0 | ≥ 50 |
| Test coverage | desconhecida | ≥ 70% |
| Hooks Google Calendar | 2 (duplicados) | 1 (`useGoogleCalendarConnection`) |
| `supabaseUntyped` em prod | 56 | ≤ 10 |
| Edge functions órfãs | 3 suspeitas | 0 |
| Test cases (it/test) | 1.413 | ≥ 1.700 |

---

*Auditoria executada em 2026-05-07 pós-deploy Ondas 15-18. Build: lint 0w, tsc 0, ~1.413 testes passando, 0 CVEs npm, 0 ciclos madge. Estado funcional sólido — risco principal é concentração de complexidade no pipeline WhatsApp e gaps de teste em código novo (agent-tools, stateful pipeline) que está em produção sem rede de proteção.*

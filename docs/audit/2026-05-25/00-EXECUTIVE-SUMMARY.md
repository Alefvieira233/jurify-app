# Auditoria Sênior Jurify — 2026-05-25

**Solicitada por:** Alef (CEO)
**Escopo:** auditoria completa, sem pontas soltas — estrutura, segurança, arquitetura, qualidade, integrações, observabilidade.
**Sintomas relatados pelo CEO antes da auditoria:**
1. Agendamento no Google Calendar “ainda não está perfeito”.
2. Agentes de IA às vezes não repassam para outros (handoff falha).

**Resultado:** ambos os sintomas têm **causa-raiz identificada com evidência em produção**. Esta auditoria também desenterrou bloqueadores operacionais críticos que tornam o produto **operacionalmente OFF** mesmo com código tecnicamente OK.

---

## TL;DR (5 linhas)

O código está **substancialmente sólido** (lint 0/0, tsc 0, 0 ciclos, 1.514 testes verdes, RLS forced em 90/90 tabelas, CSP/HSTS/COOP completos). Mas o **produto está parado em produção**: webhook Kapso silencioso desde 11/04, 8 crons retornando 401, Stripe webhook 503, Sentry DSN vazio. Além disso, há **11 bloqueadores P0** que afetam diretamente os sintomas relatados e a integridade multi-tenant. Esta sessão localizou cada bug com `file:line`, evidência de produção (`audit_log`, `agent_executions`, conversa real do CEO testando) e patch concreto. **Tempo estimado para destravar tudo: 6-10h focadas.**

---

## Estado real em produção (números)

| Métrica | Valor | Status |
|---|---|---|
| Tenants em prod | 17 | OK |
| Users | 20 | OK |
| Edge Functions deployadas | 53-55 | OK |
| RLS forced | 90/90 tabelas | OK |
| Lint warnings | 0 | OK |
| TS errors | 0 | OK |
| Testes passando | 1.514 / 1.516 | ⚠ **CI red** |
| Ciclos de import | 0 (em 722 arquivos) | OK |
| `whatsapp-webhook` hits últimas 24h | **0** | ⚠ **silencioso** |
| Cron jobs últimas 24h | **8/8 falhando 401** | ⚠ |
| `stripe-webhook` últimas 24h | **503 recorrente** | ⚠ |
| Agendamentos criados desde sempre | 7 (1 evento Calendar real, do owner) | ⚠ |
| OAuth Google Calendar tokens vivos | 1 (Jacira, pré-CSRF migration) | ⚠ |
| Conversas WhatsApp últimos 14 dias | 0 (exceto teste do CEO) | ⚠ |
| `agent_executions` em status `processing` (stuck) | 25/25 recentes | ⚠ |
| Sentry DSN em prod | **vazio** | ⚠ |
| Branch protection em `main` | **desativada** | ⚠ |

---

## 1. Bloqueadores P0 técnicos (código — eu corrijo)

| # | Área | Bug | Arquivo / Evidência | Esforço |
|---|---|---|---|---|
| **P0-1** | **IA Orquestração** | Regex `mentionsJacira/Gabriel/Marcos` em `process-message.ts:1069-1115` é **post-hoc na resposta da IA** e **sem polaridade**. Quando Ana diz "Entendo, **mas** preciso entender o caso", a regex acha "Jacira" no texto e ignora a negação ⇒ `pending_handoff_to=NULL`, handoff jamais ocorre. Reproduzido em prod: conversa `b7f4ce52`, lead Alef pediu literalmente "Você pode me transferir para a Dr Jacira" — Ana negou. | `supabase/functions/whatsapp-webhook/handlers/process-message.ts:1069-1115` | **M** (3-4h) |
| **P0-2** | **IA Orquestração** | Sem tool estruturada `transfer_to_agent` — toda detecção é heurística post-hoc, frágil por design. | `supabase/functions/_shared/agent-tools.ts` (não existe) | **M** (2-3h, junto com P0-1) |
| **P0-3** | **IA Orquestração** | Prompt da Ana exige “terminar com pergunta concreta” → ela resiste ao handoff mesmo quando lead pede explicitamente. | DB `agentes_ia.system_prompt` para `recepcionista` | **S** (30min) |
| **P0-4** | **Google Calendar** | OAuth callback UI quebrada desde 07/05. `GoogleAuthCallback.tsx:39` chama `handleCallback(code)` sem extrair `state` da URL. Backend exige `state` desde migration `20260507000013_oauth_pending_states` e retorna 400 “possible CSRF”. **Todo usuário novo falha ao conectar Calendar.** | `src/.../GoogleAuthCallback.tsx:39` e `useGoogleCalendarConnection.handleCallback` | **S** (1-2h, inclui teste) |
| **P0-5** | **Agendamento IA** | **Dois fluxos paralelos competindo no mesmo turn.** IA tool-calling agenda via `schedule_meeting`, mas depois o parser legacy regex (linhas 1213-1505) detecta intent e roda novamente, podendo sobrescrever a resposta da IA com “Você já tem um agendamento ativo”. Cliente recebe mensagem fria ou redundante mesmo quando IA confirmou. | `supabase/functions/whatsapp-webhook/handlers/process-message.ts:851-979 e 1213-1505` | **M** (3-4h) |
| **P0-6** | **Agendamento** | `agent_executions.status` trava em `processing` para 25/25 execuções recentes. UPDATE final é `void supabase.from(...).update().then(...)` (fire-and-forget) e perde corrida com finalização do edge runtime → métrica e observabilidade morrem. | `process-message.ts` UPDATE final | **S** (30min) |
| **P0-7** | **Segurança / Multi-tenant** | **Cross-tenant leak.** Tabelas `agent_ai_logs` e `agent_executions` têm 2 policies legacy `"Acesso total autenticado"` com `USING (auth.role()='authenticated')` sem checagem de `tenant_id`. Postgres OR-eia policies PERMISSIVE → qualquer authenticated user de qualquer tenant pode `SELECT *` de logs IA e execuções (com query/response, input_data/output_data, **incluindo CPF/CNPJ**) dos outros 16 tenants. Mesma classe do bug que `20260507000017` fechou em 4 tabelas — ficou incompleta. | Supabase advisor + `pg_policies` | **S** (5min — 2 DROP POLICY) |
| **P0-8** | **Compliance LGPD** | `lgpd_consent_log` e `assistant_audit` **sem triggers de imutabilidade** (só `audit_log` tem `prevent_audit_delete/update`). Admin de tenant via JWT pode adulterar registros de consentimento LGPD — ANPD considera insuficiente. | Postgres policies + triggers | **S** (1h) |
| **P0-9** | **CI/CD** | **CI vermelho.** `src/tests/integration/whatsapp-webhook.test.ts:~195 e ~403` esperam 6 chaves; `normalize*Message` agora retorna 7 (campo `messageId` add no commit `cd58812`). Bloqueia job `test-unit`. | `src/tests/integration/whatsapp-webhook.test.ts` | **XS** (15min) |
| **P0-10** | **DevOps / Observabilidade** | `VITE_SENTRY_DSN` vazio em prod → `initSentry()` aborta silenciosamente → produção cega. | Vercel env vars | **XS** (5min) |
| **P0-11** | **Frontend** | `dist/index.html` faz `modulepreload` de Sentry (470K) + charts (462K) + dnd (120K) no first paint, anulando o defer documentado em `App.tsx`. Vite gera modulepreload automaticamente para todo `manualChunks`. | `vite.config.ts` → `build.modulePreload.resolveDependencies` | **S** (1h) |

**Total P0: 11 itens · esforço somado: ~12-15h focadas.**

---

## 2. Bloqueadores OPERACIONAIS (só você pode fazer)

Estes são chaves, toggles e ações em painéis externos. **Sem isso, nada do código funciona.**

| # | Ação | Onde | Tempo |
|---|---|---|---|
| **OP-1** | **Reativar webhook no painel Kapso** (`app.kapso.ai`). Silencioso desde 11/04. Sem isso o produto WhatsApp não existe. | app.kapso.ai | 2min |
| **OP-2** | Rotar e re-setar `SUPABASE_SERVICE_ROLE_KEY` + `HEALTH_CHECK_TOKEN` em **GitHub Actions Secrets**. 8 crons retornam 401 (expire-trials, weekly-report, etc). | github.com/.../settings/secrets/actions | 5min |
| **OP-3** | Validar/setar `STRIPE_WEBHOOK_SECRET` em Supabase Edge Secrets. `stripe-webhook` 503 → checkouts não sincronizam. | Supabase Dashboard | 3min |
| **OP-4** | Colar `VITE_SENTRY_DSN` no Vercel + redeploy. | vercel.com | 3min |
| **OP-5** | Ativar HIBP (`auth_leaked_password_protection`) no Supabase Auth. | Supabase Dashboard → Auth | 1min |
| **OP-6** | Upgrade Postgres 17.4.1.054 → 17.6.1.113 (outro projeto da mesma org já está em 17.6). | Supabase Dashboard | 2min + maintenance window |
| **OP-7** | Habilitar branch protection em `main` (required PR, required checks: `ci.yml`, `e2e.yml`, `pre-commit-check.yml`). | github.com/.../settings/branches | 3min |
| **OP-8** | Configurar webhook Sentry → Slack/Discord (alertas) | sentry.io | 5min |

**Total OP: ~25min do CEO**, mas destrava 100% do produto em produção.

---

## 3. P1 — Esta semana (~20-30h)

### Arquitetura (5 acoplamentos a desfazer)
- **P1-A1** Dois `LeadDrawer` divergindo: `src/components/forms/LeadDrawer.tsx` (294 LOC) e `src/features/leads/LeadDrawer.tsx` (160 LOC). Consolidar em um, shape único.
- **P1-A2** Triplicação de `LEAD_STATUS_LABELS` (`constants/leadStatus.ts`, `schemas/leadSchema.ts`, `features/pipeline/pipelineConfig.ts`). Definir source of truth e re-export.
- **P1-A3** 13 `useQuery` no domínio WhatsApp ainda usam strings cruas — migrar para `queryKeys` factory.
- **P1-A4** `useEntityCRUD` adoção parou em 3 de ~15 candidatos; `useContratos.ts:4` admite no JSDoc "@deprecated" mas continua duplicando.
- **P1-A5** Apenas 7 de 33 features expõem barrel `index.ts`. Padronizar.

### Segurança
- **P1-S1** 87 funções SECURITY DEFINER executáveis via `/rest/v1/rpc/<fn>` **sem JWT** (anon). Inclui `apply_rls_defaults`, `expire_trials`, `cleanup_*`, `archive_*`, `claim_next_job`, `complete_job`, `audit_trigger_fn`, `validate_api_key_v2`. Restringir grants.
- **P1-S2** `setUser({ email, username })` em Sentry — PII direta. Considerar hash+id para LGPD.

### IA / Orquestração
- **P1-I1** Detectar intent de transferência na **mensagem do LEAD** antes do orchestrator (`TRANSFER_INTENT` regex + override de `agentType`). Hoje detecção só ocorre post-hoc.
- **P1-I2** `juridico_bancario` (Dra. Jacira) existe apenas em 1/15 tenants → handoff falha silenciosamente nos outros. Provisioning ou guard explícito.
- **P1-I3** HANDOFF_REGEX hardcoded com `Jacira/Gabriel/Marcos` — não tenant-aware. Carregar nomes de `agentes_ia` em runtime.
- **P1-I4** `process-message.ts` com **1.748 linhas**. Decompor em 6 estágios (resolve-tenant, classify, route, dispatch, post-process, persist).

### Edge Functions
- **P1-E1** Trial-gate faltando em 4 functions IA outbound (`summarize-whatsapp-conversation`, `extract-whatsapp-data`, `analyze-whatsapp-sentiment`, `transcribe-audio`). Adicionar `ai_responder` gate.
- **P1-E2** `tribunal-sync` retorna 400 (verificar provider config) e `data-retention-cleanup` 500 (investigar).
- **P1-E3** 9 edge functions deployadas sem caller cliente detectável (`agent-orchestrator`, `agentes-ia-api`, `vector-search`, `generate-embedding`, `generate-document`, `ingest-document-from-file`, `media-processor`, `get-public-config`, `send-push-notification`). Auditar e remover ou documentar.

### Qualidade
- **P1-Q1** `npm audit fix` — 4 vulns (1 HIGH xmldom DoS, 3 moderate brace-expansion/postcss/ws).
- **P1-Q2** Refactor `DocumentosManager.tsx` (656 LOC) e `WhatsAppIA.tsx` (500 LOC).
- **P1-Q3** Integration test ponta-a-ponta da pipeline WhatsApp (recebe webhook → classifica → responde → handoff). Inexistente.

### DevOps / Frontend
- **P1-D1** Bundle JS = 6.046 KB excede cap CI de 4.096 KB — guard em `ci.yml:155` parece silenciado. Investigar.
- **P1-D2** `dist/index.html` modulepreload anula defer (já listado em P0-11, mas patch é P1 se priorizar performance).
- **P1-D3** Husky sem pre-push. Adicionar `type-check + test`.
- **P1-D4** Sem alertas para deploy failure (notify job só escreve `GITHUB_STEP_SUMMARY`). Webhook Slack/Discord.

---

## 4. P2 / P3 (próximas 2-4 semanas)

### Agendamento
- Timezone math frágil em `schedule-parser.ts` (BRT_OFFSET fixo + `setHours` em pseudo-BRT). Migrar para `Intl.DateTimeFormat`.
- Sem Calendar Push Notifications: mudanças manuais no Google Calendar não refletem no Jurify.
- Lead sem `email` não recebe invite Google — fica refém do WhatsApp para achar Meet link.
- Reminder T-24h documentado mas não implementado (`process-meeting-reminders` só dispara T-30min).
- Título do evento com `(Nao informado)` quando área não foi extraída — visível para clientes no Google Calendar.
- Google OAuth verification pendente (limite 100 tokens vivos + warning UX).

### Segurança / Compliance
- Staging compartilha DB de produção (admitido no header de `deploy-staging.yml`). Criar projeto Supabase separado.
- Sem `axe-core` em e2e Playwright — acessibilidade só manual.
- Touch targets shadcn `h-10` (40px) abaixo de WCAG 2.5.5 (44px) em mobile.

### Observabilidade
- Sem dashboard externo (Grafana/Metabase) — métricas DAU/conversão/churn só via SQL ad-hoc.
- Smoke test pós-deploy só checa HTTP 200 — não valida fluxo autenticado.
- 5 arquivos `*GUIDE*.md` / `*DEPLOY*.md` sobrepostos — drift garantido.

### IA / Telemetria
- Sem testes cobrindo handoff inter-agente em CI.
- Sem dashboard para taxa de sucesso de handoff / agendamento em produção.
- Tools de agente sem coordenação (`schedule_meeting` compartilhado entre agentes sem mutex).

### Limpeza
- 3 componentes órfãos em `src/features/ai-agents/` (`AgentTestConfig`, `TestConversation`, `TestResultsSummary`).
- Wrapper morto `components/ui/use-toast.ts`.
- Cross-feature deep imports diretos: 6 pares (incluindo pipeline↔leads bidirecional).

---

## 5. Plano de ação cronológico recomendado

### Hoje (você + eu, ~1h de você + 4h de mim)
1. **(você)** OP-1 a OP-5: reativar Kapso, rotar secrets, validar Stripe, Sentry DSN, HIBP. **25min**.
2. **(eu)** P0-9 fix CI red (15min) + P0-10 sanity check Sentry (5min) + P0-7 cross-tenant leak DROP POLICY (5min) + P0-8 imutabilidade lgpd_consent_log (1h).
3. **(eu)** P0-4 OAuth callback `state` + teste unitário (1-2h).
4. **(eu)** P0-1 + P0-2 + P0-3 handoff (tool `transfer_to_agent` + intent detection no lead + prompt Ana). 4-5h.
5. **(você)** smoke test ponta-a-ponta: cria lead no WhatsApp → pede Dra. Jacira → confirma handoff → pede agendamento → confirma evento no Calendar.

### Esta semana
- P0-5 dois fluxos agendamento + P0-6 await UPDATE (M, 4h)
- P0-11 modulepreload fix (S, 1h)
- OP-6 Postgres upgrade + OP-7 branch protection + OP-8 alertas Sentry (você, ~15min)
- P1-S1 grants restritivos em 87 funções SECURITY DEFINER (M, 3h)
- P1-Q1 npm audit fix (S, 30min)
- P1-I3 HANDOFF_REGEX tenant-aware (S, 1h)
- P1-E1 trial-gate em 4 funções IA (S, 1h)
- P1-Q3 integration test pipeline WhatsApp ponta-a-ponta (L, 4-6h)

### Próximas 2 semanas
- Sprint arquitetura (P1-A1 a P1-A5): LeadDrawer, LEAD_STATUS_LABELS, queryKeys WhatsApp, useEntityCRUD adoption, barrels. ~12h.
- P1-I4 decompor `process-message.ts` em estágios. ~6h.
- P1-I1, P1-I2 melhorias de orquestração. ~4h.
- P2 timezone Intl, Calendar Push, reminder T-24h, email collection. ~8h.
- P2 staging dedicado.

### Backlog (P3)
- Limpeza dead code, OAuth verification Google, dashboards externos, axe-core em e2e, refactor `DocumentosManager` + `WhatsAppIA`.

---

## 6. Pontos fortes do projeto (importante reconhecer)

- **Lint 0/0** com `--max-warnings 0`, **TS strict** com `noUncheckedIndexedAccess`, apenas 43 `any` e 1 `!.` em todo `src/`.
- **Zero ciclos de import** em 722 arquivos. Layering limpo: zero `hook→page`, zero `hook→feature`.
- **RLS forced em 90/90 tabelas** (era 1/76 em 17/04).
- **0 advisors com nível ERROR**, **0 SECURITY DEFINER sem search_path** (era 71).
- **TruffleHog full-history** em CI + pre-commit `check-secrets.cjs` + grep ativo → 0 secrets em código.
- **CSP completa** sem `unsafe-inline` em script-src, HSTS preload, COOP/CORP, Permissions-Policy — tudo em `vercel.json`.
- **Service-role check timing-safe** (`isServiceRole()`), **HMAC verification** em todos webhooks, **CORS allowlist** com regex específica Vercel preview, **PII redaction** em `_shared/logger.ts`.
- **Audit log imutável** funcionando (`prevent_audit_mutation` triggers).
- **Factory de queryKeys** robusto com hierarquia `all`/`list`/`detail`.
- **AuthContext memoizado** (59 consumers protegidos), **`ProtectedRoute` preserva form-state** em token refresh.
- **41 rotas com `lazyWithRetry`**, **`FeatureErrorBoundary` em 100% das rotas autenticadas**.
- **Sentry off the critical path** via `requestIdleCallback`.
- **7 workflows CI** cobrindo lint+tsc+circular+trufflehog+npm audit+RLS coverage+e2e Playwright+smoke.
- **53-55 edge functions deployadas** com paridade 100% local↔remote.
- **HMAC per-tenant estrito** (fallback global removido), **dedup 2 camadas**, **rate-limit 2 fases** com `denyOnDbFailure=true`.

**Veredito sênior:** o código deste projeto está acima da média de SaaS BR Series A. O problema é operacional (chaves/painéis) somado a **3-4 bugs específicos** que impedem o produto de funcionar mesmo com infraestrutura OK. Resolver os P0 destrava 100% da operação.

---

## 7. Referências (relatórios detalhados)

- [01-ARQUITETURA.md](./01-ARQUITETURA.md) — 33 features, 91 hooks, 14 arquivos >400 LOC, 6 cross-feature imports.
- [02-SEGURANCA-DATABASE.md](./02-SEGURANCA-DATABASE.md) — 14 achados rankeados, advisors security+performance, RLS table-by-table, OWASP Top 10, LGPD.
- [03-QUALIDADE-TESTES.md](./03-QUALIDADE-TESTES.md) — Lint 0/0, TS 0, 1514 ok / 2 fail, build 30s 1.25MB, coverage configurado.
- [04-IA-AGENTES.md](./04-IA-AGENTES.md) — sintoma reproduzido, 6 hipóteses ranqueadas, plano Sprint 1.
- [05-GOOGLE-CALENDAR.md](./05-GOOGLE-CALENDAR.md) — pipeline ponta-a-ponta, OAuth state breakage, race condition.
- [06-WHATSAPP-EDGE-FUNCTIONS.md](./06-WHATSAPP-EDGE-FUNCTIONS.md) — 53 funcs, Kapso silencioso, 8 crons 401, Stripe 503, process-message 1748 LOC.
- [07-FRONTEND-DEVOPS-OBS.md](./07-FRONTEND-DEVOPS-OBS.md) — Sentry vazio, bundle 6MB, modulepreload anula defer, sem branch protection.

---

**Próximo passo aguardando você:** confirmar que quer que eu execute os P0 código agora (estimo 6-10h focadas para destravar tudo) e qual fim-de-semana você fará as ações operacionais (OP-1 a OP-8).

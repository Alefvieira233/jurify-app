# 03 — Qualidade & Testes

**Data:** 2026-05-25
**Branch:** main · **HEAD:** 2a8f6e6
**Auditor:** Sênior Code/QA agent

## Resumo

Disciplina de qualidade está sólida no básico: lint, type-check e build são verdes em pipeline (`--max-warnings 0`, `strict: true`, `noUncheckedIndexedAccess`). Há 1.514 testes passando, mas **2 testes falham em `whatsapp-webhook.test.ts`** porque foram dessincronizados do código quando o `messageId` foi adicionado ao normalizador (commit `cd58812`). Isso quebra o gate `npm test` e, portanto, o CI principal hoje em `main`. Coverage configurado (v8 + lcov), mas o relatório numérico não foi emitido na sessão por falta de `--reporter` específico. Bundle de produção ficou em ~1,25 MB JS minificado (gzipped agrega ~400 KB no main chunk + libs pesadas tree-shaken por rota). 6 deps npm com CVE moderada/alta auto-fixáveis. Existe pequeno backlog de dívida em componentes grandes (3 .tsx > 500 linhas) e 9 dependências marcadas como “unused” pelo depcheck (a maioria é falso positivo Capacitor/postcss).

## Métricas

| Métrica | Resultado | Gate |
|---|---|---|
| `npm run lint` | 0 erros · 0 warnings | `--max-warnings 0` (pass) |
| `npm run type-check` (`tsc --noEmit`) | 0 erros | strict mode total |
| `npm test` (vitest 1517) | **1.514 passed · 2 failed · 1 todo** (123 arquivos) | FAIL |
| `npm run build` | 30,04 s · `built` OK | 4 MB JS limit (pass: ~1,25 MB) |
| `any` em `src/` | 43 ocorrências | rule `no-explicit-any: warn` |
| Non-null `!.` em `src/` | 1 | aceitável |
| `console.*` produção | 8 (todas em sentry.ts / fallbacks de hooks) | OK |
| `TODO/FIXME/HACK/XXX` reais | 0 (12 matches são placeholders `R$ X.XXX,XX`, CPF mask `XXX.XXX.XXX-XX`, metodologia J-CoT) | OK |
| Edge Functions deployadas | 55 (54 + `_shared`) | — |
| Unit/integration test files | 123 (sob `src/`) | — |
| E2E specs Playwright | 21 (`e2e/*.spec.ts`) | — |
| `npm audit` | 4 vulns (3 mod + 1 high — xmldom, brace-expansion, postcss, ws) | `npm audit fix` resolve |

## Cobertura por área (com gaps)

**Bem coberto (com unit + integration):**
- Componentes de feature (39 testes em `src/features/*/__tests__/`).
- AuthContext (841 linhas de teste — maior arquivo do repo).
- ErrorBoundary, FeatureErrorBoundary, ProtectedRoute.
- Edge-function shared libs (`_shared/*`): `shared-crypto`, `shared-security`, `logger-pii-redaction`, `schedule-parser`.
- RBAC database (`src/tests/integration/rbac-database.test.ts`).
- Stripe webhook (`stripe-webhook.test.ts`), Tribunal sync, ZapSign integration.
- Resilience: concorrência, error recovery, security boundaries.

**Gaps relevantes:**
- **WhatsApp pipeline end-to-end** — `whatsapp-webhook.test.ts` testa normalização (e está quebrado), mas o fluxo Kapso webhook → IA → reply não é exercido de ponta a ponta em vitest.
- **Agendamentos / `useAgendaAutomation`** — explicitamente excluído do coverage v8 (“heavy async Supabase + Google Calendar — E2E”). 417 linhas sem unit test.
- **Multi-agents core** — `BaseAgent.ts` (675 LOC) e `src/lib/multiagents/agents/**` excluídos do coverage (“95%+ prompt string literals”). `MultiAgentSystemTest.ts` é runner manual, não testa orchestration real.
- **Billing flows** — `SubscriptionStatus`, `SubscriptionManager` cobertos em UI, mas `create-checkout-session` / `create-portal-session` / `stripe-webhook` só têm 1 unit test cada e nenhum cobre o caso trial→active.
- **Smart Reply IA / Sentiment / Forward** (ondas 11-14) — sem testes unit/integration.
- **Páginas (`src/pages/**`)** — excluídas (“tested via E2E”).
- **`useAgendaAutomation`, `useAgendaIntelligence`, `useWhatsAppConversations`** — têm unit tests, mas hooks de mais de 380 linhas continuam pouco exercitados em casos de borda.

**E2E Playwright (21 specs)** cobre: auth, signup-onboarding, password-reset, RBAC, multi-tenant isolation, billing/Stripe, dashboard, CRUD genérico, contratos, document-generation, file-upload, golden-path, lead-to-contract, leads, WhatsApp, settings, post-deploy-smoke, health-smoke, critical-flows, liderhub-smoke. Não é executado por padrão no CI (`e2e.yml` separado).

## Análise componentes grandes

Top 8 arquivos `.tsx` por LOC (excluindo testes):

| LOC | Arquivo | Status |
|---|---|---|
| 762 | `src/components/ui/sidebar.tsx` | shadcn vendor — aceitável |
| 656 | `src/features/documentos/DocumentosManager.tsx` | **alvo de refactor** |
| 500 | `src/features/whatsapp/WhatsAppIA.tsx` | grande mas coeso |
| 452 | `src/features/contracts/components/NovoContratoForm.tsx` | form denso |
| 428 | `src/features/scheduling/components/NovoAgendamentoForm.tsx` | form denso |
| 417 | `src/components/Sidebar.tsx` | menu app |
| 413 | `src/features/contracts/ContratosManager.tsx` | OK (já < 500) |
| 410 | `src/features/users/UsuariosManager.tsx` | OK |

`.ts` campeão: `src/integrations/supabase/types.ts` (5.524 — autogerado, ignorado).
`BaseAgent.ts` (675), `database-extended.ts` (478), `useAgendaAutomation.ts` (417), `queryKeys.ts` (416).

## Dead code

- **`knip` reporta 4.290 “unused files”** — quase todos em `.aiox-core/cli/**` (artefatos do framework AIOX, fora do build). Configurar `knip.json` com `entry`/`project` ignorando `.aiox-core` é necessário antes de tomar qualquer ação.
- **41 duplicate exports** (todos `Component|default` legítimos pelo padrão `export default + export const`). Não é dead code, é convenção shadcn/feature.
- **Enum members não usados:** `Priority.LOW`, `Priority.CRITICAL` em `src/lib/multiagents/types/index.ts`, `ErrorSeverity.INFO` em `src/utils/AppError.ts`.
- **Edge Functions sem referência detectável no código cliente** (potenciais órfãos, mas várias são chamadas por cron GH Actions ou por Stripe/ZapSign webhook):
  - Chamadas só via cron (OK): `data-retention-cleanup`, `process-prazos-alerts`, `auto-followup`, `weekly-report`, `cleanup-agent-memory`, `notify-expiring-trials`, `process-followup-queue`, `process-meeting-reminders`.
  - Webhooks externos (OK): `stripe-webhook`, `zapsign-webhook`.
  - **Investigar:** `agent-orchestrator`, `agentes-ia-api`, `vector-search`, `generate-embedding`, `generate-document`, `ingest-document-from-file`, `media-processor`, `get-public-config`, `send-push-notification` — não há referência client-side por nome literal. Podem estar mortas em produção.

## Deps (CVEs, outdated, unused)

**npm audit (4 vulns):**
- `xmldom@*` — **HIGH** (DoS via recursion + XML/PI/comment injection) — fix disponível.
- `brace-expansion` 5.0.2-5.0.5 — moderate DoS.
- `postcss` <8.5.10 — moderate XSS via stringify.
- `ws` 8.0.0-8.20.0 — moderate memory disclosure.
→ Todos resolvidos por `npm audit fix` (não é breaking).

**Top outdated:**
- `@supabase/supabase-js` pinado em 2.50.0 (latest 2.106.2) — pin intencional após CVE/incident de Apr/26.
- `@hookform/resolvers` 3.10 → 5.4 (breaking major).
- `react` / `react-dom` 18.3.1 (19.2.x disponível) — major upgrade pendente.
- `eslint-plugin-react-hooks` 5.2 → 7.1 (major).
- `@sentry/react` 10.48 → 10.53 (patch).
- `openai` 6.34 → 6.39, `react-hook-form` 7.72 → 7.76 (patches).

**`depcheck` (falsos positivos prováveis):**
- Capacitor (`@capacitor/android`, `@capacitor/ios`, `@capacitor/browser`, `@capacitor/filesystem`, `@capacitor/keyboard`, `@capacitor/splash-screen`, `@capacitor/status-bar`) — usados via build mobile (`mobile:sync` / cap config), não imports JS.
- `next-themes`, `sonner` — provavelmente usados por componentes shadcn.
- `date-fns-tz` — usado por agendamentos? validar.
- DevDeps: `@tailwindcss/typography`, `autoprefixer`, `cross-env`, `postcss` — todos referenciados em config files (postcss.config, tailwind.config, scripts npm). Falsos positivos.

## TODO/FIXME backlog

**Real backlog técnico: 0 entries.**
A varredura de `TODO|FIXME|HACK|XXX` em `src/` + `supabase/functions/` retornou 12 matches, todos legítimos:
- `XXX.XXX.XXX-XX` / `XX.XXX.XXX/XXXX-XX` — máscaras CPF/CNPJ em SanitizerEngine, EscritorioStep, TrustEngine.
- `R$ X.XXX,XX` — placeholder de valor em prompt de `CommercialAgent`.
- `J-CoT`, `BANT JURÍDICO` — metodologias documentadas em prompts dos agentes.

Higiene de comentários está excelente.

## CI/CD status

- **`pre-commit` hook (Husky):** `check:secrets` + `lint`. Funcional.
- **`.github/workflows/ci.yml`:** lint+typecheck+circular → unit-tests + coverage (codecov) → build + 4 MB bundle gate → security scan. Roda em push/PR para master|main|develop. Sólido.
- **`.github/workflows/cron-jobs.yml`:** 8 crons configurados (`data-retention-cleanup` 02:00 UTC, `process-prazos-alerts` Seg-Sex 09:00, `auto-followup` daily 09:00, `weekly-report` Seg 07:00, `cleanup-agent-memory` Dom 03:00, `tribunal-sync` 6/6h, `expire-trials` 03:30, `notify-expiring-trials` 13:00). Inclui `expire-trials` confirmado. Dependem de `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`, `HEALTH_CHECK_TOKEN` — memória do projeto registra que `HEALTH_CHECK_TOKEN` retornava 401 em Apr/26; status atual não verificável sem acesso ao Actions (presumir ainda pendente até confirmar).
- **`e2e.yml`, `deploy-production.yml`, `deploy-staging.yml`, `pre-commit-check.yml`, `rollback.yml`** existem — não auditados em profundidade nesta passagem.

## Achados P0/P1/P2/P3

**P0 — Bloqueiam confiança em main**
1. **2 testes falhando em `whatsapp-webhook.test.ts`** (linhas ~195 e ~403). O `normalize*Message` agora retorna `messageId` (commit cd58812) mas o fixture esperado tem 6 chaves. Atualizar `expect(...).toEqual({ ..., messageId: 'wamid.meta_001' / 'kapso-msg-id' })`. CI bloqueado no job `test-unit`.

**P1 — Devem entrar no próximo sprint**
2. **`npm audit fix`** para zerar 1 HIGH + 3 MODERATE (xmldom, brace-expansion, postcss, ws). Não-breaking.
3. **Edge functions potencialmente órfãs** sem referência cliente: `agent-orchestrator`, `agentes-ia-api`, `vector-search`, `generate-embedding`, `generate-document`, `ingest-document-from-file`, `media-processor`, `get-public-config`, `send-push-notification`. Auditar uso real (logs prod) e remover do deploy se mortas — débito de superfície de ataque + custo de cold start.
4. **Refactor `DocumentosManager.tsx`** (656 LOC) — quebrar em sub-componentes (lista, drawer, upload, preview). É o maior componente não-vendor do repo.
5. **Cobertura WhatsApp pipeline** — adicionar integration test exercitando `whatsapp-webhook` → tenant resolution → `ai-agent-processor` → `send-whatsapp-message` (com mocks Meta/Kapso). É o fluxo mais crítico do produto e o único com 2 testes quebrados.

**P2 — Higiene contínua**
6. Configurar `knip.json` com `entry`/`ignore` para excluir `.aiox-core/**`, `e2e/**`, `scripts/**` e habilitar `unused exports` real.
7. Promover `@typescript-eslint/no-restricted-imports` (deep imports) de `warn` para `error` (hoje há 0 ocorrências, então é seguro).
8. Promover `@typescript-eslint/no-explicit-any` de `warn` para `error` em pastas auditadas. 43 `any` ainda existem (a maioria provavelmente em `src/lib/multiagents`, validar).
9. Adicionar suites para Smart Reply IA (`suggest-whatsapp-reply`), Sentiment (`analyze-whatsapp-sentiment`), Forward (`whatsapp-forward`), Quick Replies, Auto-reply windows — features das ondas 10-14 sem cobertura.
10. Validar `HEALTH_CHECK_TOKEN` no GH Actions secrets — memória do projeto sinaliza dessincronia em Apr/26.

**P3 — Polishing**
11. Atualizar `react` 18 → 19, `@hookform/resolvers` 3 → 5 quando ecosystem estabilizar (não urgente).
12. Decompor `useAgendaAutomation.ts` (417) e `useAgentTraining.ts` (408) ou adicionar unit tests.
13. Remover enum members não usados (`Priority.LOW`, `Priority.CRITICAL`, `ErrorSeverity.INFO`).
14. `npm run test:coverage` não emite resumo numérico no terminal — adicionar `reporters: ['text', 'text-summary']` no `vitest.config.ts` para visibilidade em CI logs.

## Recomendações

1. **Hoje:** abrir PR “fix(tests): atualizar fixtures normalize*Message com messageId” para destravar CI.
2. **Esta semana:** `npm audit fix` + remoção/confirmação das 9 edge functions sem referência cliente.
3. **Próximo sprint:** integration test do pipeline WhatsApp e refactor `DocumentosManager`.
4. **Trimestre:** subir gates do ESLint (no-explicit-any, deep imports) para `error`; configurar `knip` corretamente e tratar `unused exports` reais; cobrir features das ondas 10-14.

A base de qualidade é forte (gates 0w/0e, 1.514 testes, build < 30 s, bundle controlado). O bloqueio em main é cosmético (test fixture), tudo o mais é dívida gerenciável.

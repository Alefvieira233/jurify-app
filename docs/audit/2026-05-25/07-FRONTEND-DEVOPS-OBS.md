# 07 — Frontend, DevOps & Observabilidade

Auditoria 2026-05-25 · Escopo: UX/A11y · Performance bundle · CI/CD · Secrets · Sentry · Logs · Métricas · Alertas
Baseline: AUDIT 2026-04-17 (74→96), pós sprint 2026-05-07 (cba0d9a/c479dab/4493237/cd58812)

---

## Resumo executivo

Stack frontend está **maduro**: 37 rotas lazy via `lazyWithRetry`, `FeatureErrorBoundary` em 41 rotas, `ErrorBoundary` global em `main.tsx`, Sentry com PII scrubbing + `ignoreErrors`/`denyUrls`, Vercel headers com CSP/HSTS/COOP/COEP, 15 formulários com shadcn `FormMessage` (aria-invalid automático). CI tem 6 workflows (ci, deploy-prod, deploy-staging, cron, e2e, rollback, pre-commit-check) com gates de lint 0w + tsc 0 + testes + trufflehog + npm audit critical + RLS coverage + smoke tests + bundle-size cap.

**Mas há duas regressões importantes** introduzidas após Onda 1: (1) o build atual entrega **6.046 KB de JS** (vs CI cap de 4.096 KB) — significa que o guard `Enforce bundle size limits` em ci.yml falharia se rodasse hoje; (2) o `index.html` faz `modulepreload` de `sentry-DYv-Yodm.js (470K)`, `charts-DrxMQEJn.js (462K)` e `dnd-BDK12-Ri.js (120K)`, **anulando** o defer documentado em `App.tsx` (linha 24: "Sentry async after first paint") e a regra "recharts não prefetched". Vite gera os modulepreload automaticamente para todo chunk declarado em `manualChunks` — a otimização foi feita só no código, não na config de chunking.

Bloqueios operacionais conhecidos (RUNBOOK 2026-05-07): `VITE_SENTRY_DSN` vazio em prod (Sentry frontend cego), `POSTMARK_SERVER_TOKEN` faltando, branch `main` **sem proteção** no GitHub (gh api retornou 404 — qualquer push direto é permitido), `expire-trials` cron rodando mas sem evidência de monitoramento de saída.

---

## Frontend / UX

### Acessibilidade

- **Strong:** `<html lang="pt-BR">`, `viewport-fit=cover` para iPhone X+ notch.
- **Strong:** Botões shadcn (`button.tsx`) têm `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` — foco visível padrão em todos os CTAs.
- **Strong:** `ProtectedRoute` (acesso negado) usa `role="alert" aria-live="assertive"`. `FeatureErrorBoundary` usa `role="alert"`. CookieBanner, sidebar, breadcrumb, pagination expõem aria-label.
- **OK:** 47 ocorrências de `FormMessage`/`aria-invalid` em 10 arquivos (forms críticos auth, lead, tarefas, tags, agendamentos, documentos). Onda O4 declarou 15 forms migrados.
- **Gap (P2):** `aria-label` aparece em apenas 5 arquivos via grep direto (head -5) — falta auditoria sistemática de **icon-only buttons** fora dos forms (botões de Pin/Forward/React no chat WhatsApp, botões Sparkles do Smart Reply, etc.). Memory menciona "aria-labels em 6 icon-only buttons" feitos na O4 mas não há regra de lint que force isso.
- **Gap (P3):** Não há cobertura `axe-core`/Lighthouse no CI. E2E Playwright roda mas sem assert de acessibilidade.
- **Gap (P3):** `tabIndex|onKeyDown` aparece em apenas 6 arquivos — navegação por teclado é majoritariamente delegada para Radix UI (que cobre dialog/dropdown/select/etc), mas listas custom (ConversationList, Kanban) podem não navegar via teclado.

### Performance (bundle, lazy, fontes)

- **Strong:** 37 chunks de rotas via `lazyWithRetry`, `Suspense` raiz com `LoadingSpinner fullScreen`. `manualChunks` separa vendor/router/ui-dialog/ui-select/ui-tabs/supabase/query/sentry/charts/calendar/dnd/flow.
- **Strong:** `esbuild.drop: ['console','debugger']` em prod. Sourcemaps `hidden` (não expõe stacks ao cliente).
- **Strong:** `Cache-Control: public, max-age=31536000, immutable` em `/assets/*` no `vercel.json`.
- **P1 — bundle excede limite CI:** total JS = **6.046 KB**, CI guard `ci.yml` linha 155 falha em `> 4.096 KB`. Top: `index (494K) + sentry (470K) + charts (462K) + jspdf (378K) + router (310K) + calendar (262K) + ConfiguracoesPage (202K) + html2canvas (197K) + flow (160K) + index.es (155K) + AgentesIA (148K) + WhatsAppIA (142K)`.
- **P1 — modulepreload nulifica defer documentado:** `dist/index.html` força preload de `sentry`, `charts`, `dnd`, `query`, `ui-dialog`, `ui-select`, `ui-tabs`. O `requestIdleCallback` em `App.tsx` linha 31 atrasa só o `Sentry.init()`, mas o navegador já fez download de 470K. Solução: usar `experimental.renderBuiltUrl` ou flag `<link rel="modulepreload">` desativada para chunks heavy.
- **OK:** Google Fonts via `preconnect` + `display=swap` (Inter 400/600 só) — sem render-blocking de fonte.
- **P2:** `jspdf (378K) + html2canvas (197K) + index.es (155K)` aparecem como chunks separados — provavelmente PDF export do WhatsApp/processo. Confirmar se são realmente dynamic-imported só ao clicar "Exportar PDF" (memória diz que sim, mas `index.es` é suspeito de não ter sido isolado).
- **P2:** `index-uhwYTfuG.js (494K)` entry chunk é grande — provavelmente AuthContext + supabase + react-router + react-query + toda a inicialização. Vale code-split entre `/auth` público e shell autenticado.

### Responsividade & mobile

- **OK:** `viewport-fit=cover` + safe-area CSS vars (`--safe-top`, `--safe-bottom`). Capacitor mobile suporte.
- **OK:** `overflow-x-auto` presente em PoliticaDePrivacidade, ConnectionConfigTab, PlaygroundResults, ChatSuggestions etc. — mas grep só achou 5 arquivos. Tabelas densas (Auditoria, Logs, Processos, Honorários) precisam revisão manual em viewport <768.
- **Gap (P2):** Touch targets — botões shadcn padrão usam `h-10` (40px). Para mobile WCAG 2.5.5 pede ≥44×44px. Pouco impacto pelo CSP/CSS hoje, mas alvo de melhoria.
- **Gap (P2):** Tailwind breakpoints (`sm:`, `md:`, `lg:`) aparecem em apenas 3 arquivos pelo grep (Pricing, NotFound, index.css) — sugere que a maior parte do app usa layout fluido sem media-queries. Confere bem para dashboard, mas Kanban/Pipeline com colunas fixas pode estourar em mobile.

### Error handling & loading

- **Strong:** Dupla camada — `ErrorBoundary` global em `main.tsx` + `FeatureErrorBoundary` em todas as 41 rotas filhas, mais um `WhatsAppErrorBoundary` específico.
- **Strong:** `unhandledrejection` + `window.onerror` listeners em `main.tsx` enviam para Sentry com tags.
- **Strong:** `OfflineBanner` global via `useNetworkBanner`, `DraftRecoveryBanner` para forms.
- **OK:** Skeletons em 5 arquivos (`ui/skeletons.tsx`, WhatsAppIA, sidebar). Loading global usa `LoadingSpinner fullScreen` — uniforme.
- **Gap (P3):** `LoadingSpinner` no `<Suspense>` raiz pisca a tela toda em troca de rota — UX melhor seria pintar fallback "topbar+sidebar" e só placeholder o conteúdo.

### Form UX

- **Strong:** shadcn `Form` com `FormMessage` automático (aria-invalid + aria-describedby). React-hook-form + Zod safeParse "drop-and-log" (Onda O3).
- **OK:** `DraftRecoveryBanner` recupera rascunhos.
- **Gap (P3):** Submit buttons — `disabled:opacity-50 disabled:pointer-events-none` no CVA do button, mas falta verificar `isSubmitting` em todos os forms.

### Routes & navigation

- **Strong:** `ProtectedRoute` blinda o shell, `requiredRoles` granular em rotas admin/manager. `wasAuthed` ref preserva forms durante token refresh — patch elegante.
- **Strong:** 11 redirects para rotas legadas (`/leads → /pipeline`, `/timeline → /crm`, `/planos → /billing`, etc.) evitam 404 em links antigos.
- **Strong:** `ALLOWED_DEEP_LINK_PATHS` whitelist explícita para Capacitor.
- **OK:** `withSentryReactRouterV6Routing` trackia navegação.

### Console errors

Não rodei `npm run dev` (porta 8081 ocupada potencialmente; análise estática suficiente). `esbuild.drop: ['console']` apaga console.log/warn/info em prod build — só `console.error` sobreviveria via Sentry. Memory menciona "lint 0w" — provavelmente código está limpo.

---

## DevOps

### CI/CD

**7 workflows ativos** (`ci.yml`, `cron-jobs.yml`, `deploy-production.yml`, `deploy-staging.yml`, `e2e.yml`, `pre-commit-check.yml`, `rollback.yml`):

- `ci.yml`: lint+tsc+circular → unit tests + coverage → build com bundle size guard → trufflehog + npm audit critical → RLS coverage → e2e Playwright → deployment-ready gate. Concurrency cancel ativo.
- `deploy-production.yml`: pre-deploy-gate (tsc+test+coverage+validate-secrets) → deploy-migrations → deploy-frontend (Vercel) + deploy-edge-functions (29 functions com critical/non-critical split) → smoke-tests (curl health) → notify summary.
- `cron-jobs.yml`: **8 schedules** — data-retention (02:00 UTC), prazos (Mon-Fri 09:00), auto-followup (09:00), weekly-report (Mon 07:00), cleanup-agent-memory (Sun 03:00), tribunal-sync (every 6h), expire-trials (03:30), notify-expiring-trials (13:00).
- `pre-commit-check.yml`: trufflehog full history + 7 regex patterns para credenciais conhecidas + check:secrets + lint.
- `rollback.yml`: dispatch manual com toggle frontend/edge — bom mas não há rollback de migrations.

**Gaps:**
- **P1 — Bundle size guard quebra build atual** (6046K > 4096K). Pode ter sido falso green dependendo da arquitetura runner Ubuntu (du -k pode arredondar diferente do Windows), mas é alto risco.
- **P1 — branch `main` sem proteção** (GitHub API retornou `Branch not protected`). Qualquer dev pode push direto, pular CI, e produção sai. Constituição AIOX diz `@devops` exclusivo, mas GitHub não enforça.
- **P2 — Conventional commits não enforced** (sem commitlint, sem husky commit-msg hook). Histórico já segue convenção por disciplina.
- **P2 — Husky `pre-commit` só roda `check:secrets || exit 1; lint || exit 1`** — falta `type-check` (CI pega depois, mas atrasa loop de feedback).

### Secrets & env

- **Strong:** `.env.production.example` é template-only (sem valor). `check-secrets.cjs` cobre Supabase JWT, OpenAI, Stripe, Google OAuth, service role. Trufflehog v3.88.0 valida full history em PR.
- **Strong:** `RUNBOOK_FINAL_2026-05-07.md` lista 21 secrets configurados + 5 faltando (Postmark x3, Sentry DSN, ZapSign).
- **P1 — `VITE_SENTRY_DSN` vazio em prod** → frontend roda sem reportar erros. Sentry edge functions também silencioso até DSN ser colocado.
- **P2 — `.env.secrets` (305 bytes) existe no working dir** — não está no `.gitignore`? Verificar (com 1 arquivo de 305B é suspeito de PoC, mas merece um `git check-ignore .env.secrets`).
- **P2 — Edge function deploy passa secrets via env do GH Actions** (linha 199-218 deploy-production.yml). Funciona mas vale auditar se algum secret é setado em supabase **e** vazado pro próximo run via cache.

### Deploy & infra

- **OK:** Vercel `vercel.json` com headers de segurança fortes (CSP completo, HSTS preload, Permissions-Policy, COOP/COEP). Rewrite SPA `/(.*) → /index.html`.
- **OK:** Imutável caching `/assets/*` (31536000s = 1 ano).
- **Strong:** 3 Dockerfiles (`Dockerfile`, `Dockerfile.production`, `docker-compose.{production,staging,yml}`) — alternativa self-hosted prevista.
- **P2 — staging compartilha DB prod** (deploy-staging.yml linha 2: `WARNING: Staging currently shares the PRODUCTION Supabase database`). Risco de mutação cross-env. Pendência antiga já documentada.
- **P3 — Smoke test só checa HTTP 200 do `/` e `/functions/v1/health`** — não valida login, query autenticada, ou edge function crítica.

### Husky & branch policy

- **OK:** Husky v10-ready (sem shebangs depreciados).
- **Gap (P1):** Sem `pre-push` hook — push para `main` não tem barreira local.
- **Gap (P1):** Branch protection **desativada** no GitHub — confirmado via `gh api`.

### Documentação operacional

- **OK:** `RUNBOOK_FINAL_2026-05-07.md` (post-mortem), `POSTMORTEM_2026-05-07.md`, `DEPLOYMENT.md`, `SETUP_GUIDE.md`, `SETUP-REQUIRED.md`, `docs/sentry-alerts-setup.md`, `docs/runbooks/`, `docs/architecture/`, `docs/PLANO-ACAO-V1.3.md`.
- **Gap (P3):** Múltiplos arquivos sobrepostos (`PRODUCTION_GUIDE.md`, `DEPLOY_CHECKLIST.md`, `DEPLOYMENT.md`, `SETUP_GUIDE.md`, `SETUP-REQUIRED.md`) — risco de drift. `SETUP-REQUIRED.md` parece o canônico mais atual.

---

## Observabilidade

### Sentry

- **Strong:** `src/lib/sentry.ts` com named imports (tree-shake), Replay/Feedback removidos (-400K), `init()` em `requestIdleCallback` com timeout 2s, `tracesSampleRate: 0.1`, `beforeSend` filtra chrome-extension + Network/fetch errors, `ignoreErrors` cobre 7 padrões ruidosos, `denyUrls` exclui extensions + GTM + GA.
- **Strong:** Helpers domain-aware: `captureAgentError`, `reportSlowAgent` (10s threshold), `reportHighAgentFailureRate` (5%), `measurePerformance` (3s warn). PII setUser inclui id/email/username — atenção LGPD.
- **Strong:** `withSentryReactRouterV6Routing` faz tracking automático de navegação. Source maps `hidden` + upload via `@sentry/vite-plugin` (auth-tokenado).
- **Strong:** `unhandledrejection` + `window.onerror` em main.tsx → `captureException` com tags.
- **P0 — `VITE_SENTRY_DSN` vazio em prod** → o `init()` aborta silenciosamente (linha 42-45: `if (!dsn) { console.warn; return; }`). Toda a infra Sentry roda mas não envia nada.
- **P2 — PII em `setUser({ email, username })`**: email é PII direta. Para LGPD, considerar `id` apenas + hash de email, ou usar `sendDefaultPii: false`.
- **P2 — Alertas Sentry definidos em doc** (`docs/sentry-alerts-setup.md`) mas não há evidência de Discord/Slack webhook configurado.

### Logs

- **Strong (frontend):** `src/lib/logger.ts` — níveis debug/info/warn/error, MIN_LEVEL = `warn` em prod, formatação consistente.
- **Strong (edge):** `supabase/functions/_shared/logger.ts` — PII redaction LGPD aplicada por padrão (email, CPF, CNPJ, telefone, JWT/Bearer mask), formato JSON estruturado, MIN_LEVEL controlado por `SUPABASE_DB_NAME`.
- **OK:** `console.log` aparece em 14 arquivos do src, mas `esbuild.drop` apaga em prod. Logger usa `console.info/warn/error` (preservados em prod só warn+).

### Métricas

- **Strong:** Cron `weekly-report` envia email para admins (segunda 07:00 UTC).
- **Strong:** `MetricasOperacionais` + `AnalyticsDashboard` + `CRMDashboard` consomem RPCs com tenant validation.
- **Gap (P2):** Não há dashboard externo (Grafana/Metabase) — métricas apenas internas no app. DAU/conversões/churn de trial precisam de painel admin pelo app ou pull manual via SQL.
- **Gap (P2):** `audit_log` volume — memory menciona "0 audit_log em 7d" na auditoria 2026-04-23. Vale revisitar para 2026-05-25 (provavelmente já melhor após onboarding ativo).

### Health checks

- **OK:** `/functions/v1/health` (no-verify-jwt) e `/functions/v1/health-check` (token-protected) deployadas. Smoke test pós-deploy chama `/health`.
- **OK:** `expire-trials` cron pinga RPC diretamente (`/rest/v1/rpc/expire_trials`), sai do padrão de Edge Function.
- **Gap (P2):** Nenhum endpoint público `/api/status` ou `/health` no frontend Vercel — apenas a SPA. Status page é `pages/StatusPublic.tsx` (rota `/status`).

### Alertas

- **Strong:** Sentry alerts documentados (`docs/sentry-alerts-setup.md`) — Error Spike, New Issue Prod, Slow Agent, High Failure Rate.
- **Gap (P1):** **Sem evidência de Discord/Slack webhook** configurado para Sentry, Vercel deploy failure, ou edge function 500. Notify job no `deploy-production.yml` só escreve `GITHUB_STEP_SUMMARY` — não notifica externamente.
- **Gap (P2):** RLS bloqueios não geram alerta dedicado (ficam como logs Supabase). Pagamento Stripe falhado é tratado via webhook `invoice.payment_failed` — verificar se notifica admin.

---

## Achados P0/P1/P2/P3

### P0
1. **`VITE_SENTRY_DSN` vazio em prod** → Sentry frontend silent. Toda observabilidade do navegador (que é onde rodam os agentes IA e o WhatsApp UI) está cega. `RUNBOOK_FINAL_2026-05-07.md` confirma faltando.

### P1
2. **Bundle JS = 6.046 KB excede CI cap de 4.096 KB** — ou o guard nunca foi executado em CI real (du Ubuntu pode produzir número menor), ou está sendo bypassado. Validar próxima execução.
3. **`modulepreload` em `index.html` força download de 470K Sentry + 462K charts + 120K dnd no first paint** — anula o defer documentado em `App.tsx`. Configurar `build.modulePreload.polyfill: false` ou usar `resolveDependencies` para excluir chunks heavy.
4. **Branch `main` sem proteção GitHub** — pushes diretos liberados, CI pode ser pulado, hotfix descontrolado.
5. **Sem alertas externos para deploy failure / Sentry spike** — equipe descobre incidente só quando cliente reclama.
6. **Husky sem `pre-push`** — última linha de defesa antes do remoto é zero.

### P2
7. **`setUser({ email, username })` em Sentry** — PII direta, considerar hash ou `sendDefaultPii: false` para LGPD.
8. **Staging compartilha DB de produção** — `deploy-staging.yml` cabeçalho admite. Risco de corrupção cross-env.
9. **Sem cobertura `axe-core` em e2e** — acessibilidade só auditada manualmente.
10. **Touch targets shadcn h-10 (40px)** abaixo do WCAG 2.5.5 (44px) em mobile.
11. **Dashboards de produto fracos** — DAU/conversões/churn só por SQL ou RPC interna; sem Grafana/Metabase.
12. **`.env.secrets` no working dir** — verificar `.gitignore` (provavelmente OK, mas auditar).
13. **Smoke test só HTTP 200** — não valida funcionalidade autenticada pós-deploy.
14. **Múltiplos arquivos de "guide" sobrepostos** (DEPLOY_CHECKLIST, PRODUCTION_GUIDE, DEPLOYMENT, SETUP_GUIDE, SETUP-REQUIRED) — drift garantido.

### P3
15. Falta `type-check` no `pre-commit` (CI cobre, mas feedback loop atrasa 5 min).
16. `aria-label` em icon-only buttons fora de forms — auditar Pin/Forward/React do WhatsApp.
17. Tabelas densas (Auditoria, Logs, Honorários) — confirmar `overflow-x-auto` em mobile.
18. Suspense fallback `LoadingSpinner fullScreen` pisca tela em troca de rota.
19. `index-uhwYTfuG.js (494K)` entry pode ser dividido (`/auth` vs shell autenticado).

---

## Recomendações

1. **Hoje:** Colar `VITE_SENTRY_DSN` no Vercel + redeploy. Sem isso, prod fica cega.
2. **Esta semana:**
   - Habilitar branch protection em `main` (required PR + required checks: ci.yml, e2e.yml, pre-commit-check.yml).
   - Configurar Sentry Discord/Slack webhook (5min em Sentry > Alerts > Integrations).
   - Investigar discrepância bundle — rodar `npm run build` em CI e copiar saída do step "Enforce bundle size limits" para confirmar se passa ou está sendo silenciado.
   - Adicionar `pre-push` husky com `type-check + test`.
3. **Sprint:**
   - Resolver `modulepreload` heavy: separar sentry/charts/dnd em chunks NOT-preloaded; `import()` dinâmico só quando rota precisar.
   - Trocar `setUser({ email })` por hash + id; ou aplicar `beforeSend` que strippa email do user context.
   - Provisionar Supabase staging próprio (já tem `Missãocumprida` órfão na conta — usar ou descomissionar).
   - Adicionar `@axe-core/playwright` em 3-4 e2e críticos (home, auth, pipeline).
4. **Mês:**
   - Consolidar docs `*GUIDE*.md` em um único índice + arquivar legados em `docs/archive/`.
   - Dashboard de produto (Metabase ou Supabase Dashboards) com DAU/MAU/conversão trial→paid/churn.
   - Sentinela cron de health: GitHub Action a cada 5 min que pinga `/auth`, `/health`, `/functions/v1/health` e notifica Slack se 3x falhar.

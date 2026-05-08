# Jurify — Tech Stack Audit (2026-05-07)

**Escopo:** Inventário versionado, riscos, bottlenecks e roadmap de upgrade do stack tecnológico Jurify (legal SaaS multi-tenant — yfxgncbopvnsltjqetxw.supabase.co + jurify-app.vercel.app).

**Snapshot pós Ondas 15-18:** free/busy Calendar, Meet auto, function calling 6 tools, conversation_state stateful, cron lembretes, triggers Kanban auto, Dra. Jacira Gomes (agente IA bancário).

---

## 1. Plataforma & Runtime

| Camada | Tecnologia | Versão | Observação |
|--------|------------|--------|------------|
| Frontend runtime | Node.js (build) | **20.x** (`engines.node`) | Alinhado nos workflows GH Actions (`NODE_VERSION: '20'`) |
| Package manager | npm | **10.9.2** (`packageManager`) | Lockfile `package-lock.json` (~600KB) |
| Browser target | ES2020 | — | `tsconfig.json` + `vite.config.ts.build.target = 'es2020'` |
| Backend runtime | Deno (Supabase Edge Functions) | **v1.x** | `denoland/setup-deno@v1` no CI |
| Database | PostgreSQL (Supabase managed) | 15.x (gerenciado) | 187 migrations em `supabase/migrations/` |
| Mobile shell | Capacitor | **^8.2.0** | iOS + Android wrapper |

**Capacitor 8** é coerente em todos os 13 plugins (`@capacitor/core ^8.2.0`, `@capacitor/android/ios ^8.2.0`, etc.) — sem split-version risk.

---

## 2. Frontend Stack

### 2.1 Core React/Build

| Pacote | Versão (package.json) | Função | Risco |
|--------|----------------------|--------|-------|
| `react` | **^18.3.1** | Framework UI | Não bloqueante; React 19 disponível mas Radix/recharts ainda alinhados a 18 |
| `react-dom` | ^18.3.1 | — | — |
| `vite` | **^7.3.1** | Dev server + bundler | Versão recente (Vite 7 GA out/2025) |
| `@vitejs/plugin-react-swc` | ^3.5.0 | SWC transform | OK |
| `typescript` | **^5.5.3** | Compiler | TS 5.5 estável; 5.6/5.7 disponíveis |
| `typescript-eslint` | ^8.54.0 | Parser+rules | OK |
| `eslint` | **^9.32.0** | Linter (flat config) | Flat config em `eslint.config.js` |

### 2.2 UI / Design System

| Pacote | Versão | Função |
|--------|--------|--------|
| **shadcn/ui** (componente local) | — | Components em `src/components/ui/`, `components.json` baseColor=slate |
| `@radix-ui/*` (28 pacotes) | mix de ^1.x e ^2.x | Primitivas headless. Versões consistentes com shadcn registry |
| `tailwindcss` | **^3.4.11** | CSS utility | Tailwind 4 já existe — upgrade não imediato |
| `tailwindcss-animate` | ^1.0.7 | — | — |
| `@tailwindcss/typography` | ^0.5.15 | Prose styling | — |
| `class-variance-authority` | ^0.7.1 | Variants | — |
| `tailwind-merge` | ^2.5.2 | — | — |
| `lucide-react` | ^0.462.0 | Ícones | — |
| `cmdk` | ^1.0.0 | Command palette | — |
| `next-themes` | ^0.3.0 | Dark mode | — |
| `sonner` | ^1.5.0 | Toast | — |
| `vaul` | ^0.9.3 | Drawer | — |

### 2.3 Forms / Validation / Data

| Pacote | Versão | Risco |
|--------|--------|-------|
| `react-hook-form` | **^7.53.0** | OK |
| `@hookform/resolvers` | ^3.9.0 | OK |
| `zod` | **^3.25.76** | **Atenção:** Zod 4.x já estável (out/2025). Migração quebra (`z.string().email()` → schemas dedicados). Não urgente. |
| `@tanstack/react-query` | **^5.56.2** | OK; v5 estável |
| `@tanstack/react-virtual` | ^3.13.23 | OK |
| `react-router-dom` | ^6.26.2 | **Atenção:** v7 (Remix-merge) GA em 2024. Migration trivial mas requer review. |

### 2.4 Especializadas

| Pacote | Versão | Uso |
|--------|--------|-----|
| `@fullcalendar/*` (6 pacotes) | ^6.1.20 | Calendário de prazos / agendamentos |
| `@hello-pangea/dnd` | **^16.6.0** | Kanban Pipeline (fork do `react-beautiful-dnd` deprecated) |
| `@xyflow/react` | ^12.10.1 | Diagramas (workflows/orchestrator) |
| `recharts` | **^2.12.7** | Charts. Recharts 3 disponível |
| `react-day-picker` | ^8.10.1 | Date picker |
| `embla-carousel-react` | ^8.3.0 | Carousel |
| `react-resizable-panels` | ^2.1.3 | Layout |
| `input-otp` | ^1.2.4 | OTP input |
| `date-fns` + `date-fns-tz` | ^3.6.0 / ^3.2.0 | Datas (ptBR locale) |
| `jspdf` + `jspdf-autotable` | ^4.2.1 / ^5.0.7 | Export PDF (conversa WhatsApp, processos) |
| `dompurify` | ^3.2.6 | Sanitização HTML |

### 2.5 Observability (cliente)

| Pacote | Versão | Notas |
|--------|--------|-------|
| `@sentry/react` | **^10.32.0** | Sentry SDK v10 (out/2025). Replay/Feedback **removidos** intencionalmente (DEB-036) — economia ~400KB |
| `@sentry/vite-plugin` | ^4.6.1 | Source map upload |

---

## 3. Backend Stack (Supabase Edge Functions / Deno)

**52 edge functions** em `supabase/functions/` (incluindo `_shared/` lib).

### 3.1 Imports principais (Deno)

| Import | Versão | Uso | Localizações |
|--------|--------|-----|--------------|
| `@supabase/supabase-js` | **2** (esm.sh) e **2.50.0** (3 funções) | DB/Auth client | Mistura `https://esm.sh/@supabase/supabase-js@2`, `jsr:@supabase/supabase-js@2`, e pin `2.50.0` em zapsign |
| `@supabase/functions-js` | edge-runtime.d.ts (jsr) | Types | Funções novas usam `jsr:` |
| `OpenAI` | **deno.land/x/openai@v4.24.0** | LLM client | `_shared/ai-caller.ts`, `_shared/embeddings.ts`, `chat-completion`, `media-processor` |
| `Stripe` | **esm.sh/stripe@14.21.0** | Pagamentos | `stripe-webhook`, `create-checkout-session`, `create-portal-session` |
| `pdf-lib` | **1.17.1** | Geração PDF (contratos) | `generate-document` |
| `pdfjs-dist` | **3.11.174** | Parse PDF | `extract-document-text` |
| `@sentry/deno` | **7.114.0** | Observability backend | `_shared/sentry.ts` |
| `std@0.208.0/encoding/base64` | — | Utility | `_shared/media-utils.ts` |

**Inconsistência detectada:** três estilos coexistem para o mesmo cliente Supabase:
- `https://esm.sh/@supabase/supabase-js@2` (33 ocorrências, sem pin)
- `jsr:@supabase/supabase-js@2` (16 ocorrências em funções mais recentes)
- `https://esm.sh/@supabase/supabase-js@2.50.0` (zapsign-integration, zapsign-webhook — pinado)

### 3.2 Bibliotecas compartilhadas (`_shared/`)

24 módulos centralizados — destaques:

| Arquivo | Função |
|---------|--------|
| `ai-caller.ts` | Wrapper único OpenAI: budget enforce + retry + log `agent_ai_logs` |
| `ai-budget.ts` | Daily/monthly token budget gate |
| `ai-model.ts` | Constantes `gpt-4o-mini` (default), `gpt-4o`, `whisper-1` |
| `agent-tools.ts` + `agent-tools-executor.ts` | Function-calling (6 tools: check_availability, schedule/reschedule/cancel_meeting, update_lead_kanban, etc.) |
| `kapso-client.ts` | WhatsApp Cloud via Kapso (Partner Mode + legacy multi-tenant) |
| `whatsapp-window.ts` | 24h conversational window enforcement |
| `crypto.ts` | AES encrypt/decrypt (api_key_encrypted, google tokens) |
| `rate-limiter.ts` + `rate-limit-config.ts` | Throttling |
| `trial-gate.ts` | HTTP 402 quando trial expirado |
| `providers/tribunal/` | Adapter pattern (Escavador / Fake / planejado: Codilo, Jusbrasil) |

### 3.3 Postgres / Migrations

- 187 arquivos em `supabase/migrations/` (timestamp YYYYMMDDHHMMSS).
- Squash de referência: `SQUASH_REFERENCE.md`.
- 5 migrations da sessão de hoje (`20260507000000` a `20260507000005`): user_info em google tokens, audit trigger via user, agendamento auto Kanban+Tarefa, conversation_state stateful, cron meeting reminders, conversation_state pending_handoff.
- RLS forced em ~31/76 tabelas (auditoria 2026-04-23). Restantes têm RLS habilitado mas não FORCED.

---

## 4. Integrações Externas

| Serviço | Modo | Chave (env) | Edge function consumidora |
|---------|------|-------------|--------------------------|
| **OpenAI** | Direct API (deno.land/x/openai v4.24.0) | `OPENAI_API_KEY` (Edge Secret) | `_shared/ai-caller.ts` (centraliza tudo) |
| **Kapso (WhatsApp Cloud Partner)** | REST + webhook + customer header | `KAPSO_MASTER_API_KEY` (master) ou `api_key_encrypted` legacy + `KAPSO_WEBHOOK_SECRET` | `whatsapp-webhook`, `send-whatsapp-*`, `kapso-manager` |
| **Stripe** | esm.sh/stripe@14.21.0 + webhook | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY` | `stripe-webhook`, `create-checkout-session`, `create-portal-session` |
| **Postmark** | REST direto (`api.postmarkapp.com/email`) | `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL` | `send-email`, `weekly-report` |
| **Google OAuth (Calendar + Drive)** | OAuth2 + tokens encrypted no DB | `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ENCRYPTION_KEY` | `google-calendar`, `create-drive-folder` |
| **ZapSign** | REST + webhook | `ZAPSIGN_API_TOKEN`, `VITE_ZAPSIGN_API_URL` | `zapsign-integration`, `zapsign-webhook` (pinned `@2.50.0`) |
| **Escavador (Tribunal CNJ)** | Adapter pattern, opcional | `ESCAVADOR_API_KEY`, `TRIBUNAL_PROVIDER=escavador\|fake` | `tribunal-sync`, `_shared/providers/tribunal/` |
| **Sentry** | SDK frontend + backend | `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | `_shared/sentry.ts` (deno 7.114.0), `src/lib/sentry.ts` (react 10.32.0) |
| **Whisper (OpenAI)** | Via `WHISPER_MODEL` constante | (mesma OPENAI_API_KEY) | `transcribe-whatsapp-audio`, `media-processor` |
| **FCM Push (Capacitor)** | `@capacitor/push-notifications` | (mobile only) | `send-push-notification` |

---

## 5. Build / Bundling

`vite.config.ts` (verificado):
- **Manual chunks** (10 split bundles): vendor, router, ui-dialog, ui-select, ui-tabs, supabase, query, sentry, charts, calendar, dnd, flow.
- **`drop: ['console', 'debugger']`** em prod via esbuild.
- **`sourcemap: 'hidden'`** + Sentry plugin upload em prod.
- **`chunkSizeWarningLimit: 800`KB.
- Base condicional `./` quando `CAPACITOR_BUILD=true` (mobile build).
- Bundle gate no CI: **fail se total JS > 4MB** (`ci.yml` linha 155).

---

## 6. CI / CD

| Workflow | Disparo | Função |
|----------|---------|--------|
| `ci.yml` | push/PR em master/main/develop | Lint (max-warnings 0) + type-check + circular check + unit tests + Codecov + build (size gate 4MB) + Trufflehog secrets + npm audit critical + RLS coverage + Playwright chromium |
| `deploy-production.yml` | push em master/main | Pre-deploy gate → migrations → frontend (Vercel via `amondnet/vercel-action@v25`) → 31 edge functions deploy seletivo (5 públicas no-verify-jwt + 7 críticas + 21 não-críticas) → secrets push → smoke tests |
| `deploy-staging.yml` | manual / branch staging | Staging deploy (separado) |
| `cron-jobs.yml` | 7 schedules cron | data-retention (02:00 UTC), prazos-alerts (Mon-Fri 09:00), auto-followup (daily 09:00), weekly-report (Mon 07:00), cleanup-agent-memory (Sun 03:00), tribunal-sync (a cada 6h), expire-trials (daily 03:30) |
| `e2e.yml` | push/PR | Playwright chromium em build standalone |
| `pre-commit-check.yml` | PR | Husky-equivalente em CI |
| `rollback.yml` | manual | Rollback Vercel + redeploy edge functions de HEAD~1 |

**Hosting:** Vercel (primário, `jurify-app.vercel.app` + custom `jurify.com.br`); Netlify config presente (`netlify.toml`) como fallback. Containers `Dockerfile.production` + `docker-compose.production.yml` para deploy auto-hospedado.

---

## 7. Padrões de Código

### TypeScript (`tsconfig.json`)
- **strict: true** + extras: `noImplicitAny`, `strictNullChecks`, `noImplicitThis`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`, `noImplicitOverride`.
- `strictPropertyInitialization: false` (pragmático p/ classes de service).
- Path alias: `@/*` → `./src/*`.
- Excludes: testes, scripts, multiagents/examples.

### ESLint (`eslint.config.js`, flat config v9)
- **`recommendedTypeChecked`** ativo em `src/**/*.{ts,tsx}` (com `parserOptions.project`).
- Rules custom críticas:
  - `@typescript-eslint/no-explicit-any: warn`
  - `no-restricted-imports`: bloqueia `supabaseUntyped` (deprecated).
  - `@typescript-eslint/no-restricted-imports`: bloqueia deep imports cross-feature (warn — barrel migration gradual).
  - `no-restricted-syntax`: **bloqueia `.select('*')`** (force columns explicitas).
  - Várias `no-unsafe-*` rules **desligadas** (gradual migration).
- Linter rodando com `--max-warnings 0` (0 warnings/0 erros).

### Prettier
- **Não há `.prettierrc`** — script `format` usa defaults da CLI. Inconsistência potencial.

### Outros
- `madge` para circular deps (gate no CI).
- Husky v9 (`prepare: husky` no package.json).
- Vitest 4.0.17 + happy-dom 20.1.0 + Testing Library (16.3.1).
- Playwright 1.58.2 com chromium + mobile (Pixel 5) profiles.

---

## 8. Riscos de Versão (CVE / Deprecated / EOL)

| # | Item | Severidade | Detalhe |
|---|------|-----------|---------|
| R1 | **`@supabase/supabase-js@2` sem pin (Deno)** | **P0** | 33 edge functions importam `https://esm.sh/@supabase/supabase-js@2` (latest tag). Quebra silenciosa quando major sai. Pin para `@2.50.0` (igual frontend) ou `^2`. |
| R2 | **OpenAI deno.land/x/openai@v4.24.0** | **P1** | `deno.land/x` está sendo descontinuado (Deno migrou para JSR). v4.24.0 é antigo (2024). Migrar para `npm:openai@6` ou `jsr:@openai/openai`. |
| R3 | **`pdfjs-dist@3.11.174`** | **P1** | v3.x tem CVE-2024-4367 (PDF.js arbitrary JS execution). Verificar se patch chegou ao 3.11.x ou subir para 4.x. |
| R4 | **`react-router-dom@^6.26.2`** | P2 | v7 GA. Sem CVE crítico, mas v6 entrou em modo manutenção. |
| R5 | **`zod@^3.25.76`** | P2 | v4 estável; v3 ainda mantida mas com deprecation gradual de APIs. |
| R6 | **`tailwindcss@^3.4.11`** | P2 | v4 com Lightning CSS — mudança breaking de config. Sem urgência. |
| R7 | **`recharts@^2.12.7`** | P2 | v3 disponível com tipos melhores. |
| R8 | **`@hello-pangea/dnd@^16.6.0`** | P2 | Fork de `react-beautiful-dnd` (atlassian descontinuou). Sem alternativa óbvia hoje (dnd-kit é mais low-level). Lock-in. |
| R9 | **`pdf-lib@1.17.1`** | P2 | Última release 2022. Manutenção parada mas API estável. |
| R10 | **Stripe SDK v14** | P2 | API version dentro do código pode estar antiga. Verificar `apiVersion` configurada e alinhar com [Stripe deprecation calendar](https://stripe.com/docs/api/versioning). |
| R11 | **`@sentry/deno@7.114.0`** vs **`@sentry/react@^10.32.0`** | P1 | Major mismatch entre frontend (v10) e backend (v7). Sentry v8/9/10 mudaram API substancialmente — alinhar para v9+ no Deno. |
| R12 | **`@xmldom/xmldom@^0.9.9`** override | P3 | Já tratado via overrides (CVE histórica). Manter. |
| R13 | **`tar@^7.5.13`, `minimatch@^10`** overrides | P3 | Resolvidos. |
| R14 | **Capacitor 8 + plugins** | P3 | Versões alinhadas; sem risk de split. |
| R15 | **Postmark via fetch direto (sem SDK)** | P3 | Funcional mas perde retry/backoff nativo do SDK oficial. |

---

## 9. Bottlenecks de Stack & Lock-in

| # | Bottleneck | Impacto | Mitigação |
|---|-----------|---------|-----------|
| B1 | **Kapso Partner Mode lock-in** | Alta dependência de uma única empresa para WhatsApp Cloud. Se Kapso encerrar, perde-se inbox + auto-reply + Smart Reply IA + audio transcrição. | `_shared/kapso-client.ts` já tem abstração; adicionar adapter `meta-direct.ts` para WhatsApp Cloud sem intermediário (long-tail) |
| B2 | **Supabase Edge Functions = Deno** | Todo backend depende de Deno runtime. Cold start ~300-700ms. Limites de execução (10s default, 540s max) causam timeouts em tribunal-sync grandes. | Já tem `--max-time 540` no cron. Mover jobs >540s para fila externa (BullMQ + worker em Vercel/Fly) |
| B3 | **`recharts` (gigante)** + **`@xyflow/react`** + **`@fullcalendar/*` (6 pkgs)** | Bundle bloated. Embora estejam em manualChunks separados, são 200-400KB cada gzipped. | Lazy-load por rota (já parcial). Avaliar `react-flow` substitutos mais leves (`reactflow` mas sem custom edges) |
| B4 | **OpenAI hard dependency** | `_shared/ai-caller.ts` força gpt-4o-mini/gpt-4o. Sem fallback Anthropic/Google. | Abstrair via `_shared/llm-router.ts` com `provider: 'openai' \| 'anthropic'`. Útil para resiliência (rate limit OpenAI) |
| B5 | **Sentry payload (mesmo otimizado)** | Replay/Feedback removidos, mas `@sentry/react@10` ainda ~150KB | Considerar `@sentry/browser` com bare bones se aceitável |
| B6 | **52 edge functions deployadas individualmente** | Deploy demora ~3-5min por causa de loop sequencial em `deploy-production.yml`. | Paralelizar com `xargs -P 5` ou usar Supabase CLI batch (`supabase functions deploy --all`) |
| B7 | **3 estilos de import Supabase no Deno** | `https://esm.sh/...@2`, `jsr:...@2`, `esm.sh/...@2.50.0`. Versões podem divergir → bugs sutis em RLS/types. | Padronizar para `jsr:@supabase/supabase-js@2.50.0` em todas as funções |
| B8 | **Vercel free/pro tier limits** | Edge runtime e bandwidth limit pode estourar com tráfego (atualmente Pro). | Já em Pro; monitorar via Vercel Analytics |

---

## 10. Recomendações de Upgrade Priorizadas

### P0 (bloqueante / fazer essa semana)

1. **Pin `@supabase/supabase-js`** em todas as edge functions para `2.50.0` (ou `^2.50.0`). Prevenir breakage silencioso quando v3 sair.
2. **Padronizar import style** Deno: trocar todos `https://esm.sh/@supabase/supabase-js@2` por `jsr:@supabase/supabase-js@2.50.0`. Refactor mecânico — 49 ocorrências em ~33 arquivos.
3. **Investigar pdfjs-dist 3.11.174** vs CVE-2024-4367. Subir para 4.x se possível (verificar compat com `extract-document-text`).
4. **Upgrade `@sentry/deno`** v7.114.0 → v9 (alinhar com `@sentry/react@10`). Verificar quebras na captura de breadcrumbs custom.

### P1 (próximas 2 semanas)

5. **Migrar OpenAI Deno SDK** de `deno.land/x/openai@v4.24.0` → `npm:openai@6` (já tem em devDeps front). Centralizado em `_shared/ai-caller.ts` — uma única refatoração.
6. **Configurar `.prettierrc`** explícito (printWidth 100, singleQuote, trailingComma: 'all') para evitar inconsistência entre devs/CI.
7. **Stripe SDK** — fixar `apiVersion` explícita no constructor (`new Stripe(key, { apiVersion: '2025-09-30.acacia' })`) em todas as 3 edge functions Stripe; documentar política de upgrade.
8. **Paralelizar deploy edge functions** no `deploy-production.yml` (5 jobs em paralelo via matrix ou `xargs -P 5 -I{} supabase functions deploy {}`).
9. **Postmark SDK oficial** (`postmark@4.x` via npm:) substituindo fetch direto, ganhando retry, batch e tracking.

### P2 (próximo mês)

10. **react-router v7** — migration guide do time de Remix é direto; pago em type-safety e loaders.
11. **Tailwind v4** — avaliar quando shadcn/ui registry oficializar suporte (PR aberto upstream). Não fazer antes.
12. **Recharts v3** — types melhores, performance em tooltips. Risco baixo.
13. **Adapter LLM router** (`_shared/llm-router.ts`) — habilita Anthropic Claude como fallback para OpenAI rate limits, especialmente útil em pico de uso da Dra. Jacira Gomes.
14. **Adapter `meta-direct.ts`** em `kapso-client.ts` — reduz lock-in Kapso para WhatsApp Cloud direto via Meta API.
15. **Zod v4** — migration tool oficial (`zod-codemod`). Hold até react-hook-form/resolvers oficializar suporte.

### P3 (backlog / nice-to-have)

16. Bundle audit: substituir `@xyflow/react` por alternativa mais leve se uso for marginal.
17. Avaliar Bun como runtime de scripts (build acelera ~2x), mantendo Node em CI.
18. **Codecov gate de coverage 70%+** (atual: opcional `continue-on-error`).
19. **Renovate/Dependabot** PR semanal para minor/patch (não detectado nos workflows).

---

## 11. Apêndices

### A. Versão snapshot (parcial — pacotes críticos)

```
react              ^18.3.1
typescript         ^5.5.3
vite               ^7.3.1
eslint             ^9.32.0
@supabase/...      2.50.0 (pinned no front, mix no back)
@tanstack/react-query  ^5.56.2
react-hook-form    ^7.53.0
zod                ^3.25.76
@sentry/react      ^10.32.0
@sentry/deno (Deno) 7.114.0
deno openai        v4.24.0  ⚠ desatualizado
stripe (Deno)      14.21.0
pdfjs-dist         3.11.174 ⚠ CVE
pdf-lib            1.17.1   (manutenção parada)
tailwindcss        ^3.4.11
@radix-ui/*        ^1.x/^2.x (28 pacotes)
@capacitor/core    ^8.2.0   (mobile)
playwright         ^1.58.2
vitest             ^4.0.17
```

### B. Checklist de hardening pendente

- [ ] Pin @supabase/supabase-js em todos edge functions
- [ ] Padronizar para `jsr:` em vez de `esm.sh:` Deno
- [ ] Sentry SDK alinhar major (deno 7 → 9)
- [ ] OpenAI Deno SDK → npm:openai@6
- [ ] Prettier config explícita
- [ ] Stripe apiVersion pin
- [ ] Postmark SDK oficial
- [ ] Renovate/Dependabot
- [ ] pdfjs-dist CVE remediation
- [ ] Deploy paralelo edge functions

---

*Tech-stack mapping rodado em 2026-05-07 para Jurify v2.1.0. 187 migrations em prod, 52 edge functions, build verde (lint 0w, type-check 0, 1525+ testes). CI gates ativos: ESLint --max-warnings 0, type-check, circular check, npm audit critical, Trufflehog, RLS coverage, bundle size <4MB, Playwright chromium.*

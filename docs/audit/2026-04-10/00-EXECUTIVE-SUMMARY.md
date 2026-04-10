# Jurify — Auditoria Técnica Completa

**Data:** 2026-04-10
**Metodologia:** AIOX Brownfield Discovery (10 fases, 9 agentes paralelos)
**Escopo:** arquitetura, banco, UX, qualidade de código, testes, segurança, performance, devops, mapa de features
**Verdito geral:** NÃO PRONTO PARA PRODUÇÃO

---

## TL;DR

O Jurify tem ossos bons — layering limpo, multi-tenancy real, 34 features bem organizadas, WhatsApp/Kapso funcional, lazy loading em 100% das rotas, CSP/HSTS configurados, zero crypto-js. Mas tem **buracos que impedem ir para produção com clientes pagantes**, e o MEMORY.md reporta um estado melhor do que a realidade.

**Score consolidado (média ponderada):** 68/100

| Domínio | Score | Status |
|---|---|---|
| Arquitetura | 82/100 | Sólido |
| Banco de dados | 78/100 | Saudável com 3 landmines |
| UX/UI | 78/100 | Bom, drift de acessibilidade |
| Qualidade de código | 79/100 | Bom, mas build quebrado |
| **Testes (efetividade real)** | **38/100** | **TEATRO** |
| Segurança | 78/100 | Fundação boa, P0s bloqueantes |
| Performance | 78/100 | Bom com quick wins óbvios |
| **DevOps / SRE** | **48/100** | **Não sobrevive 3am** |
| Média | 68/100 | Não pronto |

**Total de achados:** 16 P0 · 62 P1 · 76 P2 = **154 findings**

---

## Os 5 achados mais graves (tudo que o usuário precisa saber em 2 minutos)

### 1. O build está quebrado. `npm run lint` e `npm run type-check` falham.
- `NovoAgendamentoForm.tsx:113` — erro de lint (unnecessary type assertion)
- `WhatsAppWidget.tsx:115` — warning react-refresh (fatal sob `--max-warnings 0`)
- `chatQuickActions.tsx:1` — TS6133 React import não usado

MEMORY.md diz "0 lint warnings, 0 TS errors". **Falso.** CI não deve estar rodando ou está green-lighting com falhas.

### 2. Os testes de caminhos críticos são fraude.
- `stripe-webhook.test.ts` — define `mapPriceToPlanId` e `mapStripeStatus` **dentro do próprio arquivo de teste**, testa as cópias. O edge function real nunca é importado. 37 assertions de teatro na rota de receita.
- `whatsapp-webhook.test.ts` — mesma coisa, redeclara normalizers inline.
- `rbac-database.test.ts` — escreve uma réplica TypeScript de `has_permission()` e testa a réplica contra a constante frontend. O banco nunca é tocado.
- **Zero testes** em `supabase/functions/` (50+ edge functions).
- Helper de mock Supabase usa Proxy chainable que retorna dado canned para qualquer método → `createLead/updateLead/deleteLead` sempre "passam", copiado em ~40 hook tests.

**Cobertura real estimada: 22-28%**, não os 60% implícitos. O número "1447 testes passando" é verdadeiro apenas no sentido de que rodam green. Não protegem contra regressão nos caminhos que importam.

### 3. Segurança — rotação de tokens de 2026-04-08 NÃO FOI FEITA.
- `git log` desde a data tem zero commits de rotação.
- Isso significa que se qualquer chave (service role, Stripe, OpenAI, Kapso) ainda é a antiga, um atacante pode emitir JWT service-role e **bypass RLS em todos os tenants** — comprometimento multi-tenant completo.
- JWT da Supabase anon está **hardcoded no SQL de migration** `20260307000007_prazos_alerts_scheduler.sql:18`. Comitado. A regex de pre-commit check deveria ter pego — não pegou.
- 9 vulnerabilidades high no `npm audit` (Vite dev-server arbitrary file read, tar hardlink traversal).
- Google OAuth pede scope `calendar` completo em vez de `calendar.events` — over-privileged.
- Webhook WhatsApp tem fallback HMAC global — qualquer tenant sem segredo próprio pode ser forjado se o segredo global vazar.
- JWTs da Supabase em `localStorage` → qualquer XSS (nome de lead, mensagem WhatsApp, nome de arquivo) exfiltra token.

### 4. RLS do `google_calendar_tokens` tem bypass + OAuth provavelmente está quebrado.
- `20260227000000_google_calendar_tokens_profile_fields.sql:12-16` cria policy `USING (true)` sem `TO service_role` → **todos os usuários autenticados podem ler os tokens de Google Calendar de todos os outros tenants**. Acesso aos calendários de todo mundo.
- Pior: os edge functions `google-calendar/oauth.ts:117-129` e `google-oauth.ts:31-50` ainda escrevem colunas `access_token`/`refresh_token` plaintext, mas `20260406000002_drop_plaintext_secrets.sql` dropa essas colunas. Ou o OAuth crasha silenciosamente, ou a criptografia é teatro e as colunas plaintext ainda estão lá.
- Materialized view `mv_leads_metrics` foi construída em fev/2026 com status antigos (`novo_lead`, `em_qualificacao`, `contrato_assinado`), renomeados em março por `20260323000001_unify_lead_status_system.sql`. A MV nunca foi reconstruída. `get_leads_metrics()` RPC retorna zeros plausíveis. Landmine.

### 5. DevOps: staging compartilha o banco de produção, Sentry não está ligado, sem paging.
- `.github/workflows/deploy-staging.yml:2-3` tem TODO explícito: staging aponta para o Supabase de produção. **Qualquer escrita em staging corrompe prod.**
- Sentry DSN não está configurado no Vercel → produção tem **zero telemetria de erro**. O código está A+, o wiring não.
- Sem alertas, sem paging, sem runbook de incidente.
- Dois edge functions (`auto-followup`, `weekly-report`) existem em `supabase/functions/` mas não estão no workflow de deploy → não rodam em produção.
- pg_cron: MEMORY.md diz indisponível, migrations assumem que está disponível. Ou os schedulers de prazos legais estão mortos (responsabilidade legal direta em Legal SaaS) ou estão vivos com JWT hardcoded.

**Diagnóstico:** "Competente mas perigoso". O pipeline de CI é melhor do que na maioria das Series A, observabilidade e alerting estão em nível de projeto de fim de semana.

---

## MEMORY.md × Realidade

O MEMORY.md tem drift significativo do estado real. Isso é o achado mais importante culturalmente — o sistema de auto-reporte está mentindo, o que significa que futuras decisões baseadas nele podem estar erradas.

| Claim em MEMORY.md | Realidade |
|---|---|
| "0 lint warnings" | FALSO — 1 error + 1 warning, lint exit 1 |
| "0 erros TypeScript" | FALSO — 2 erros (1 arquivo trivial) |
| "Zero componentes 400+ linhas" | FALSO — 14 arquivos de produção acima de 400 LOC |
| "Zero select('*')" | FALSO — 4 casos (e.g. `ApiKeysManager.tsx:49`) |
| "Zero queries sem .limit()" | Substancialmente verdadeiro (usa `.range()`) |
| "1447 testes passando" | Verdadeiro numericamente, falso em efetividade |
| "Rotação de tokens de 2026-04-08" | NÃO FEITA — sem commits de rotação |
| "Kapso funcional" | Verdadeiro |
| "lazyWithRetry em todas as rotas" | Verdadeiro (37 rotas) |
| "React.memo em list components" | Verdadeiro (44 usos) |
| "queryKeys factory intacto" | Verdadeiro |
| "Zero crypto-js" | Verdadeiro |
| "7 componentes decompostos" | Verdadeiro — mas não generalizado para os outros 14 |

---

## O que está bem feito (para não ser injusto)

- Layering limpo: zero hook→page, zero hook→feature.
- 37/37 rotas lazy com `lazyWithRetry`.
- CSP, HSTS, COOP, HSTS headers bem configurados.
- `isServiceRole()` timing-safe, confirmado no audit.
- Per-tenant webhook secrets (quando configurados).
- LGPD audit log imutável.
- Web Crypto API nativa (não crypto-js).
- Zod em 100% dos forms (19/19 auditados).
- Zero silent catches, zero TODO/FIXME/HACK.
- Trigger bidirecional de status lead↔conversation é loop-safe (verificado).
- 100% das rotas de feature têm `ProtectedRoute`.
- 9/9 subscriptions realtime têm cleanup.
- Bundle sem lodash, moment, crypto-js.
- Os 7 componentes que foram decompostos mantiveram coesão real.

A base arquitetural é boa. O problema não é estrutural — é execução incompleta nos detalhes que importam.

---

## Próximo passo

Ver `99-REMEDIATION-PLAN.md` para os planos de ação — correção (P0s bloqueantes) e otimização (quick wins + tech debt).

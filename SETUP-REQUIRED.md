# Jurify — Setup para produção

> **Status do código:** pronto. Lint 0 · TypeScript 0 · 1516 testes · 0 CVEs · 39 edge functions deployed · 71 security advisors WARN fechados em 2026-04-23.
>
> **Status do operacional:** Stripe/Sentry/Postmark/ZapSign/Google ainda não credenciados. Este arquivo é o checklist único pra fechar isso.

---

## Onde vai cada coisa

| Destino | Para que serve | Como acessar |
|---|---|---|
| **Vercel env vars** | Variáveis `VITE_*` que o frontend lê | https://vercel.com/[seu-usuario]/jurify-app/settings/environment-variables |
| **Supabase Edge Secrets** | Chaves usadas pelas edge functions | https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/functions |
| **Supabase Auth settings** | Toggles HIBP + OTP | https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/auth/providers |
| **Supabase Infrastructure** | Upgrade Postgres | https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/infrastructure |
| **SQL editor Supabase** | UPDATEs em `subscription_plans` (Stripe price_ids) | https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/sql/new |
| **GitHub secrets** | Para GitHub Actions cron rodar | https://github.com/[seu-usuario]/jurify/settings/secrets/actions |

---

## Fase 1 — Crítico (sem isso não dá pra ir a prod) · ~90 min

### 1. Stripe — destrava cobrança · 20 min
https://dashboard.stripe.com/products

- [ ] Criar produto **"Jurify Pro"** → preço recorrente mensal R$ 199,00
- [ ] Criar produto **"Jurify Enterprise"** → preço recorrente mensal R$ 999,90
- [ ] Copiar os 2 `price_` IDs (e opcionalmente os 2 anuais)
- [ ] Em https://dashboard.stripe.com/webhooks → **Add endpoint**
  - URL: `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/stripe-webhook`
  - Eventos: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `charge.refunded`
  - Copiar **Signing secret** (`whsec_...`)
- [ ] Em https://dashboard.stripe.com/apikeys → copiar **Secret key** (`sk_live_...`) + **Publishable key** (`pk_live_...`)

**Onde colar:**
| Chave | Destino |
|---|---|
| `pk_live_...` | Vercel: `VITE_STRIPE_PUBLISHABLE_KEY` |
| `price_..._PRO` | Vercel: `VITE_STRIPE_PRICE_PRO` |
| `price_..._ENT` | Vercel: `VITE_STRIPE_PRICE_ENTERPRISE` |
| `sk_live_...` | Supabase Edge Secret: `STRIPE_SECRET_KEY` |
| `whsec_...` | Supabase Edge Secret: `STRIPE_WEBHOOK_SECRET` |
| `price_..._PRO` | Supabase Edge Secret: `STRIPE_PRICE_PRO` |
| `price_..._ENT` | Supabase Edge Secret: `STRIPE_PRICE_ENTERPRISE` |

**Finalizar com SQL no Supabase:**
Abrir `scripts/update-stripe-plans.sql`, substituir os `price_XXXXXXXXXXXX_*` pelos IDs reais, e executar em https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/sql/new. O script valida que os placeholders foram trocados e falha caso não.

---

### 2. Sentry — destrava observabilidade · 15 min
https://sentry.io/signup (se não tem conta)

- [ ] Criar organização + projeto tipo **React** / framework **Vite**
- [ ] Copiar **DSN**
- [ ] Settings > Auth Tokens → criar token com scopes `project:releases` + `project:write`

**Onde colar:**
| Chave | Destino |
|---|---|
| DSN (`https://...@...ingest.sentry.io/...`) | Vercel: `VITE_SENTRY_DSN` |
| DSN (mesmo valor) | Supabase Edge Secret: `SENTRY_DSN` |
| `sntrys_...` | Vercel: `SENTRY_AUTH_TOKEN` |
| Nome da org | Vercel: `SENTRY_ORG` |
| Nome do projeto | Vercel: `SENTRY_PROJECT` |

**4 alert rules recomendadas** (do `docs/runbooks/sentry-alerts.md`):
- [ ] Error rate > 1% em 5min → Slack/Discord
- [ ] Novo unhandled error → Slack/Discord imediato
- [ ] p95 latency > 500ms → warning
- [ ] Crash-free users < 99% → critical

---

### 3. Reativar WhatsApp/Kapso — **provavelmente quebrado** · 10 min
**Diagnóstico atual:** último webhook real recebido foi em 2026-04-11. Nas últimas 24h o endpoint `whatsapp-webhook` só recebeu requisições de teste. Isso indica que o `WHATSAPP_VERIFY_TOKEN` mudou no Supabase mas não foi atualizado no Kapso, OU o tenant foi reconfigurado.

- [ ] Em https://app.kapso.ai → Configurações do tenant → Webhooks
- [ ] Confirmar URL: `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/whatsapp-webhook`
- [ ] Atualizar verify token para o valor atualmente configurado no Supabase
- [ ] Se quiser rotacionar o token:
  1. Gerar novo UUID (`uuidgen` ou `crypto.randomUUID()` no devtools)
  2. Atualizar `WHATSAPP_VERIFY_TOKEN` no Supabase Edge Secrets
  3. Atualizar no app.kapso.ai simultaneamente
- [ ] Enviar mensagem teste ao número do tenant → confirmar que `webhook_events` ganha uma linha nova

---

### 4. Postmark — destrava emails transacionais · 15 min
https://account.postmarkapp.com/signup

- [ ] Criar conta + adicionar domínio (ex: `jurify.com.br`)
- [ ] Configurar SPF e DKIM nos registros DNS do domínio → aguardar propagação
- [ ] Criar Server → copiar **Server Token**
- [ ] Sender Signatures → adicionar `no-reply@jurify.com.br`

**Onde colar (Supabase Edge Secrets):**
| Chave | Destino |
|---|---|
| Server token | `POSTMARK_SERVER_TOKEN` |
| `no-reply@jurify.com.br` | `POSTMARK_FROM_EMAIL` |
| `Jurify` | `POSTMARK_FROM_NAME` |

---

### 5. 3 toggles no Supabase Dashboard · 15 min + ~10 min downtime

**5.1 HIBP password check:**
https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/auth/providers
- [ ] Email → toggle **"Check for leaked passwords"** ON

**5.2 OTP expiry:**
Mesmo painel:
- [ ] Email → **OTP expiry** = `3600` (1 hora)

**5.3 Postgres upgrade (17.4.1.054 → patch mais recente):**
https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/infrastructure
- [ ] Clicar **Upgrade Project**. Downtime ~5-15 min. Agendar fora de horário de pico.

---

### 6. Corrigir GitHub Actions cron (401) · 10 min
**Diagnóstico:** logs mostram `auto-followup`, `process-prazos-alerts` e `data-retention-cleanup` retornando 401 quando o cron roda. Causa: `HEALTH_CHECK_TOKEN` desatualizado ou ausente no GitHub.

https://github.com/[seu-usuario]/jurify/settings/secrets/actions

- [ ] Gerar novo UUID
- [ ] Salvar como GitHub Secret: `HEALTH_CHECK_TOKEN`
- [ ] Salvar o MESMO valor em Supabase Edge Secret: `HEALTH_CHECK_TOKEN`
- [ ] Confirmar também:
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (do Dashboard API)
  - [ ] `SUPABASE_ACCESS_TOKEN` (https://supabase.com/dashboard/account/tokens)
  - [ ] `SUPABASE_PROJECT_REF` = `yfxgncbopvnsltjqetxw`
- [ ] Rodar manualmente um workflow em https://github.com/[seu-usuario]/jurify/actions → confirmar 200

---

### 7. Vercel — aplicar as env vars + redeploy · 10 min

Em https://vercel.com/[seu-usuario]/jurify-app/settings/environment-variables adicionar todas as `VITE_*` com valores reais. Inventário completo (13 variáveis):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_VERSION
VITE_APP_NAME
VITE_APP_DOMAIN
VITE_USE_MOCK
VITE_STRIPE_PUBLISHABLE_KEY
VITE_STRIPE_PRICE_PRO
VITE_STRIPE_PRICE_ENTERPRISE
VITE_SENTRY_DSN
VITE_GOOGLE_CLIENT_ID
VITE_GOOGLE_REDIRECT_URI
VITE_SALES_WHATSAPP
```

Opcionais (só configurar se usar):
```
VITE_PUBLIC_STATUS_TOKEN
VITE_GOOGLE_ANALYTICS_ID
VITE_ZAPSIGN_API_URL
VITE_ZAPSIGN_SANDBOX
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

- [ ] Fazer **Redeploy** em https://vercel.com/[seu-usuario]/jurify-app/deployments

---

## Fase 2 — Importante (destrava features) · ~45 min

### 8. ZapSign — assinatura digital
https://app.zapsign.com.br/signup · plano a partir de ~R$ 99/mês

- [ ] Settings > API → **API Key**
- [ ] Settings > Webhooks → URL `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/zapsign-webhook`, eventos `doc_pending`, `doc_signed`, `doc_refused`, `doc_expired`, copiar **Signing Secret**

**Supabase Edge Secrets:**
| Chave | Destino |
|---|---|
| API key | `ZAPSIGN_API_KEY` |
| `https://api.zapsign.com.br/api/v1` | `ZAPSIGN_API_URL` |
| Webhook signing | `ZAPSIGN_WEBHOOK_SECRET` |

---

### 9. Google Cloud OAuth — Calendar + Drive
https://console.cloud.google.com/apis/credentials

- [ ] Projeto Google Cloud (criar se não tem)
- [ ] Habilitar **Google Calendar API** + **Google Drive API**
- [ ] OAuth Consent Screen: App name "Jurify Legal SaaS", scopes `openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file`
- [ ] Credentials → Create → OAuth Client ID → Web application
  - Authorized redirect URIs: `https://jurify-app.vercel.app/auth/google/callback` + `http://localhost:8081/auth/google/callback`
- [ ] Copiar **Client ID** e **Client Secret**
- [ ] Gerar `ENCRYPTION_KEY` (32 bytes base64): no terminal `openssl rand -base64 32`

**Onde colar:**
| Chave | Destino |
|---|---|
| Client ID | Vercel: `VITE_GOOGLE_CLIENT_ID` |
| Client ID | Supabase Edge Secret: `GOOGLE_CLIENT_ID` |
| Client Secret | Supabase Edge Secret: `GOOGLE_CLIENT_SECRET` |
| base64 32b | Supabase Edge Secret: `ENCRYPTION_KEY` |

---

### 10. Tribunal — decisão pragmática
Duas opções:

**Opção A (MVP):** manter mock. Criar Supabase Edge Secret `TRIBUNAL_PROVIDER=fake`. Tribunal-sync para de retornar 400 nos cron runs e o código cai no fake provider (já implementado).

**Opção B (produção real):** Escavador. Requer contato comercial (não é signup self-service, ~R$ 0,15-0,50 por consulta CNJ).
- [ ] Supabase Edge Secret: `ESCAVADOR_API_KEY`
- [ ] Remover `TRIBUNAL_PROVIDER` ou definir como `escavador`

---

### 11. Features opcionais
- [ ] **FCM** (push notifications): https://console.firebase.google.com → Cloud Messaging → Server Key → `FCM_SERVER_KEY`
- [ ] **OCR.space**: https://ocr.space/ocrapi/freekey (25k req/dia grátis) → `OCR_SPACE_API_KEY`

---

## Fase 3 — Validação ponta-a-ponta · ~30 min

Após completar Fases 1 e 2, validar os fluxos críticos em https://jurify-app.vercel.app:

- [ ] `/signup` → criar conta nova → onboarding 7 steps completa
- [ ] `/billing` → clicar "Assinar Pro" → checkout Stripe abre (use `4242 4242 4242 4242` se estiver em test mode)
- [ ] Leads → criar → botão "Auto-rotear por área" aparece
- [ ] Processos → criar processo → aba "Andamentos" tem botão "Sincronizar"
- [ ] Honorários → tab "Dashboard" mostra 4 cards + chart
- [ ] Documentos → upload PDF → viewer abre em iframe
- [ ] Contratos → criar → "Abrir PDF" funciona
- [ ] Reports → exportar CSV funciona
- [ ] WhatsApp → mensagem teste ao tenant → IA responde
- [ ] `/admin/status` → todos os badges verdes
- [ ] Sentry capturando eventos (forçar um erro proposital para validar)
- [ ] GitHub Actions → Workflow "Scheduled Jobs" → run manualmente → 200

---

## Fase 4 — Pós-go-live (depois, sem pressa)

- [ ] Criar Supabase staging dedicado (sa-east-1)
- [ ] Apontar branch `develop` no Vercel pro staging
- [ ] Configurar alertas Discord/Slack no Sentry
- [ ] Monitorar Sentry 24h após go-live
- [ ] Backup restore test mensal

---

## Inventário completo de Supabase Edge Secrets

Configurar em https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/functions:

**Obrigatórias pra prod operacional:**
```
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO
STRIPE_PRICE_ENTERPRISE
SENTRY_DSN
POSTMARK_SERVER_TOKEN
POSTMARK_FROM_EMAIL
POSTMARK_FROM_NAME
KAPSO_API_KEY
KAPSO_API_URL          # default https://api.kapso.ai
KAPSO_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
HEALTH_CHECK_TOKEN
ALLOWED_ORIGINS        # ex: https://jurify-app.vercel.app,https://jurify.com.br
FRONTEND_URL           # https://jurify-app.vercel.app
```

**Opcionais:**
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
ENCRYPTION_KEY
ZAPSIGN_API_KEY
ZAPSIGN_API_URL
ZAPSIGN_WEBHOOK_SECRET
TRIBUNAL_PROVIDER       # 'fake' | 'escavador' (default escavador se tiver key)
ESCAVADOR_API_KEY
FCM_SERVER_KEY
OCR_SPACE_API_KEY
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_NAME` são injetadas automaticamente pelo Supabase — não configurar.

---

## Quick wins — o que já está resolvido no código

| Item | Status |
|---|---|
| 71 security advisors WARN (search_path + bucket listing) | ✅ fechados 2026-04-23 |
| RLS forced em 75/76 tabelas | ✅ |
| Husky v10 deprecation | ✅ fixed |
| 16 deep imports de features | ✅ migrados para barrel exports + `lint --max-warnings 0` |
| 39 edge functions deployed | ✅ incluindo tribunal-sync, zapsign-webhook, health-check, auto-followup, weekly-report |
| 1516 testes verdes · 0 CVEs · tsc 0 | ✅ |

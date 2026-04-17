# Runbook — Sentry Alert Rules

**Status:** Pendente de configuração operacional (Sentry DSN ainda não emitido em prod — ver `SETUP-REQUIRED.md`).

Este runbook descreve as alert rules obrigatórias que devem ser provisionadas no Sentry assim que o DSN de produção estiver disponível. O objetivo é detectar degradação do Jurify antes do usuário final reportar.

---

## 1. Pré-requisitos

1. Projeto Sentry criado (recomendado: `jurify-web-prod`).
2. `VITE_SENTRY_DSN` configurado no Vercel (frontend) e `SENTRY_DSN` nas edge functions do Supabase.
3. `SENTRY_AUTH_TOKEN` configurado no Vercel para upload de source maps.
4. Integração Slack ou Discord adicionada em **Settings → Integrations**.

---

## 2. Alert rules obrigatórias

Criar em **Alerts → Create Alert Rule** no Sentry UI.

### 2.1 Error rate > 1% (warning)

| Campo | Valor |
|-------|-------|
| Alert name | `High Error Rate — 5 min` |
| Environment | `production` |
| Dataset | Errors |
| Condition | `event.type:error` |
| Trigger | `count()` maior que 1% do total de eventos nos últimos 5 minutos |
| Threshold | 10 eventos OU 1% — o que ocorrer primeiro |
| Action | Send notification to Slack `#jurify-alerts` (ou Discord webhook) |
| Frequency | A cada 5 minutos |

### 2.2 New unhandled error (critical)

| Campo | Valor |
|-------|-------|
| Alert name | `New Unhandled Error — Immediate` |
| When | `A new issue is created` |
| Filter | `level:error AND mechanism.handled:false` |
| Action | Slack/Discord imediato + email para `alefchristiangomesvieira@gmail.com` |
| Frequency | Imediato (sem throttling) |

### 2.3 p95 latency > 500 ms em /api/* (warning)

| Campo | Valor |
|-------|-------|
| Alert name | `High API Latency` |
| Dataset | Performance (Transactions) |
| Condition | `transaction:/api/*` |
| Trigger | `p95(transaction.duration) > 500` por 10 minutos |
| Action | Slack `#jurify-alerts` |
| Frequency | A cada 10 minutos |

### 2.4 Crash-free users < 99% (critical)

| Campo | Valor |
|-------|-------|
| Alert name | `Crash-Free Users Drop` |
| Dataset | Release Health |
| Condition | `crash_free_users() < 99%` em 1h |
| Action | Slack/Discord + email |
| Frequency | A cada 1 hora |

---

## 3. Conectar Slack/Discord

### Slack
1. Sentry UI → **Settings → Integrations → Slack → Install**.
2. Autorizar no workspace e escolher canal (ex.: `#jurify-alerts`).
3. Em cada alert rule, selecionar `Send a Slack notification` → workspace e canal.

### Discord (via webhook)
1. No servidor Discord, criar webhook em **Server Settings → Integrations → Webhooks**.
2. Copiar URL do webhook.
3. Sentry UI → **Settings → Integrations → Discord → Install** (ou usar `Alerts → Webhooks` com URL custom).
4. Em cada alert rule, selecionar `Send a Discord notification` ou `Send a webhook request`.

---

## 4. Import via API (opcional)

Consultar `docs/runbooks/alerts-config.json` neste diretório — payload pronto para POST em
`https://sentry.io/api/0/projects/{org}/{project}/rules/` (requer `SENTRY_AUTH_TOKEN` com escopo `project:write`).

Exemplo:
```bash
for rule in $(jq -c '.rules[]' docs/runbooks/alerts-config.json); do
  curl -X POST \
    "https://sentry.io/api/0/projects/jurify/jurify-web-prod/rules/" \
    -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$rule"
done
```

---

## 5. Validação pós-setup

- [ ] Disparar erro proposital (ex.: `throw new Error('sentry-smoke-test')` em staging) e confirmar chegada no canal Slack/Discord.
- [ ] Verificar que `crash_free_users` aparece em **Releases → Health**.
- [ ] Gerar latência artificial em endpoint `/api/health-check` (sleep 600ms) e confirmar alert 2.3.
- [ ] Resolver alertas de teste com `Ignore` + `Archive`.

---

## 6. Escalação

Se os alertas dispararem em prod:

| Severidade | Primeiro responsável | Runbook |
|-----------|---------------------|---------|
| Error rate > 5% | On-call | `docs/runbooks/high-error-rate.md` |
| Supabase down | On-call | `docs/runbooks/supabase-down.md` |
| WhatsApp webhook failing | On-call | `docs/runbooks/whatsapp-webhook-failing.md` |
| Crash-free < 95% | Rollback imediato | `docs/runbooks/deploy-rollback.md` |

---

_Atualizado: 2026-04-17 — Onda 3 (Observability)._

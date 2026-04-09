# Guia de Configuração — Integrações Jurify

## Status Atual das Integrações

| Integração | Código | Configurado? | O que falta |
|-----------|--------|-------------|-------------|
| WhatsApp (Kapso) | OK | OK | Nada — funcionando |
| Google Calendar | OK | **NÃO** | Client ID + Secret |
| Stripe Pagamentos | OK | **NÃO** | Price IDs |
| Sentry Monitoramento | OK | **NÃO** | DSN + Auth Token |
| ZapSign Assinatura | OK | **NÃO** | API Key |
| Postmark Email | OK | **NÃO** | Server Token |

---

## 1. Google Calendar (IA agendar reuniões)

### Passo a passo:

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto novo ou use o existente
3. Ative a **Google Calendar API** em "APIs & Services > Library"
4. Vá em "APIs & Services > Credentials"
5. Clique "Create Credentials > OAuth 2.0 Client ID"
6. Tipo: **Web application**
7. Authorized redirect URIs: `https://jurify-app.vercel.app/auth/google/callback`
8. Copie o **Client ID** e o **Client Secret**

### Onde configurar:

**Vercel (frontend):**
```
VITE_GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=https://jurify-app.vercel.app/auth/google/callback
```

**Supabase Secrets (backend):**
```bash
supabase secrets set GOOGLE_CLIENT_SECRET=seu_client_secret
```

---

## 2. Stripe (Cobranças e Assinatura)

### Passo a passo:

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em "Products" e crie 2 produtos:
   - **Jurify Pro** — R$ X/mês (o preço que você definir)
   - **Jurify Enterprise** — R$ X/mês
3. Em cada produto, copie o **Price ID** (começa com `price_`)
4. Vá em "Developers > API Keys" e copie a **Publishable Key** e **Secret Key**
5. Vá em "Developers > Webhooks" e adicione endpoint:
   - URL: `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/stripe-webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `charge.refunded`
6. Copie o **Webhook Signing Secret** (começa com `whsec_`)

### Onde configurar:

**Vercel (frontend):**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_PRO=price_...
VITE_STRIPE_PRICE_ENTERPRISE=price_...
```

**Supabase Secrets (backend):**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 3. Sentry (Monitoramento de Erros)

### Passo a passo:

1. Acesse [Sentry.io](https://sentry.io/) e crie um projeto React
2. Copie o **DSN** do projeto
3. Vá em Settings > Auth Tokens e crie um token

### Onde configurar:

**Vercel (frontend):**
```
VITE_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=sntrys_...
```

---

## 4. ZapSign (Assinatura Digital)

### Passo a passo:

1. Acesse [ZapSign](https://app.zapsign.com.br/)
2. Vá em "Integrações > API" e copie sua API Key

### Onde configurar:

**Supabase Secrets:**
```bash
supabase secrets set ZAPSIGN_API_KEY=sua_api_key
supabase secrets set ZAPSIGN_API_URL=https://api.zapsign.com.br/api/v1
```

---

## 5. Postmark (Emails Transacionais)

### Passo a passo:

1. Acesse [Postmark](https://postmarkapp.com/) e crie um servidor
2. Copie o **Server API Token**
3. Verifique seu domínio de envio (DNS records)

### Onde configurar:

**Supabase Secrets:**
```bash
supabase secrets set POSTMARK_SERVER_TOKEN=seu_token
supabase secrets set POSTMARK_FROM_EMAIL=noreply@seudominio.com.br
supabase secrets set POSTMARK_FROM_NAME=Jurify
```

---

## Verificação Rápida

Após configurar, use o diagnóstico do WhatsApp no app para verificar conexões.
Para Stripe, teste com o cartão `4242 4242 4242 4242`.
Para Sentry, erros aparecerão automaticamente no dashboard do Sentry.

---

## Detecção de Leads Inativos (Cron)

O sistema tem uma RPC `detect_inactive_leads(inactivity_days)` que pode ser chamada via cron externo:

```bash
# Exemplo com curl (rodar diariamente via GitHub Actions ou similar):
curl -X POST "https://yfxgncbopvnsltjqetxw.supabase.co/rest/v1/rpc/detect_inactive_leads" \
  -H "apikey: SUA_ANON_KEY" \
  -H "Authorization: Bearer SUA_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inactivity_days": 3}'
```

Isso notifica responsáveis de leads parados há 3+ dias.

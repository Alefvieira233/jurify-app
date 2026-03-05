# Runbook: Deploy do Jurify

## Pré-requisitos
- Node.js 20+
- Supabase CLI (`npm i -g supabase`)
- Acesso ao Vercel (`npx vercel login`)
- Variáveis de ambiente configuradas (ver `.env.example`)

---

## 1. Deploy do Frontend (Vercel)

```bash
# Build local para validar
npm run build

# Deploy para produção
npx vercel --prod
```

**Variáveis obrigatórias no Vercel:**
| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública do Supabase |
| `VITE_SENTRY_DSN` | DSN do Sentry |
| `VITE_STRIPE_PRICE_PRO` | Price ID do plano Pro |
| `VITE_STRIPE_PRICE_ENTERPRISE` | Price ID do plano Enterprise |
| `VITE_GOOGLE_CLIENT_ID` | Client ID do Google OAuth |

---

## 2. Deploy das Edge Functions (Supabase)

```bash
# Login no CLI
supabase login

# Deploy de todas as functions
supabase functions deploy --project-ref $SUPABASE_PROJECT_REF

# Deploy de function específica
supabase functions deploy evolution-manager --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy send-email --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy cleanup-agent-memory --project-ref $SUPABASE_PROJECT_REF
```

**Secrets obrigatórios (Supabase Dashboard → Settings → Secrets):**
| Secret | Descrição |
|---|---|
| `OPENAI_API_KEY` | Chave da OpenAI |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe |
| `STRIPE_WEBHOOK_SECRET` | Webhook secret do Stripe |
| `EVOLUTION_API_URL` | URL da Evolution API |
| `EVOLUTION_API_KEY` | API key da Evolution |
| `ZAPSIGN_API_TOKEN` | Token do ZapSign |
| `ENCRYPTION_KEY` | Chave de criptografia (32 bytes hex) |
| `POSTMARK_SERVER_TOKEN` | Token do servidor Postmark |
| `POSTMARK_FROM_EMAIL` | Email remetente (ex: noreply@jurify.com.br) |
| `POSTMARK_FROM_NAME` | Nome remetente (ex: Jurify) |

---

## 3. Migrações do Banco

```bash
# Aplicar migrações pendentes
supabase db push --project-ref $SUPABASE_PROJECT_REF

# Verificar status
supabase db diff --project-ref $SUPABASE_PROJECT_REF
```

---

## 4. Configurar Cron de Limpeza de Memória

Após o deploy da `cleanup-agent-memory`, execute via Supabase SQL Editor:

```sql
-- Requer pg_cron e pg_net habilitados (Supabase Pro+)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'cleanup-agent-memory',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/cleanup-agent-memory',
    headers := json_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    )::text,
    body := '{}'::text
  )
  $$
);
```

---

## 5. Checklist Pós-Deploy

- [ ] Dashboard carrega sem erros 400
- [ ] MRR real aparece no card Revenue
- [ ] Response Time Chart carrega dados reais
- [ ] WhatsApp QR Code gera sem erro
- [ ] Stripe webhook respondendo (checar logs no Dashboard)
- [ ] Email de boas-vindas chegando após criar usuário
- [ ] Sentry capturando erros em produção
- [ ] Agentes IA processando leads (testar no Agentes IA)

---

## Rollback

```bash
# Reverter último deploy Vercel
npx vercel rollback

# Para Edge Functions: redeploy da versão anterior via git
git checkout <commit-anterior>
supabase functions deploy <nome-function> --project-ref $SUPABASE_PROJECT_REF
```

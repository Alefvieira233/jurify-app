# Deploy para Produção - Jurify v2.1

## Checklist de Deploy

- [x] Build de produção: **OK**
- [x] Type-check: **OK**
- [ ] Edge Functions no Supabase
- [ ] Frontend na Vercel

---

## Passo 1: Deploy das Edge Functions (Supabase)

### 1.1 Fazer login no Supabase

```bash
npx supabase login
```

Isso abrirá o navegador para autenticação. Após login, volte ao terminal.

### 1.2 Linkar o projeto

```bash
npx supabase link --project-ref yfxgncbopvnsltjqetxw
```

### 1.3 Configurar Secrets (se ainda não configurou)

```bash
# OpenAI API Key (OBRIGATÓRIO para agentes IA)
npx supabase secrets set OPENAI_API_KEY=sk-proj-sua-chave-aqui

# Stripe (se usar billing)
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 1.4 Deploy de TODAS as Edge Functions

```bash
npx supabase functions deploy agentes-ia-api
npx supabase functions deploy ai-agent-processor
npx supabase functions deploy chat-completion
npx supabase functions deploy health-check
npx supabase functions deploy admin-create-user
npx supabase functions deploy stripe-webhook
npx supabase functions deploy create-checkout-session
npx supabase functions deploy whatsapp-webhook
npx supabase functions deploy send-whatsapp-message
npx supabase functions deploy zapsign-integration
npx supabase functions deploy generate-document
```

**OU deploy de todas de uma vez:**

```bash
npx supabase functions deploy
```

### 1.5 Verificar deploy

```bash
npx supabase functions list
```

---

## Passo 2: Deploy do Frontend (Vercel)

### 2.1 Fazer login na Vercel

```bash
vercel login
```

### 2.2 Deploy inicial

```bash
cd E:/Jurify
vercel
```

Responda às perguntas:
- **Set up and deploy?** Yes
- **Which scope?** Seu usuário/time
- **Link to existing project?** No (primeira vez) ou Yes (se já existe)
- **Project name?** jurify-app
- **Directory?** ./
- **Override settings?** No

### 2.3 Configurar Variáveis de Ambiente na Vercel

Acesse: https://vercel.com/[seu-usuario]/jurify-app/settings/environment-variables

Adicione estas variáveis:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | `https://yfxgncbopvnsltjqetxw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (a chave completa) |
| `VITE_USE_MOCK` | `false` |
| `VITE_APP_VERSION` | `2.1.0` |
| `VITE_APP_NAME` | `Jurify` |
| `VITE_DEBUG_MODE` | `false` |

### 2.4 Deploy para produção

```bash
vercel --prod
```

---

## Passo 3: Configurar Domínio Personalizado (Opcional)

### Na Vercel:
1. Acesse Settings > Domains
2. Adicione seu domínio: `jurify.com.br` ou `app.jurify.com.br`
3. Configure DNS conforme instruções

### DNS:
```
CNAME www   cname.vercel-dns.com
A     @     76.76.21.21
```

---

## Passo 4: Verificação Pós-Deploy

### 4.1 Testar Health Check
```bash
curl https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/health-check
```

### 4.2 Testar Agentes IA
```bash
curl -X POST https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/agentes-ia-api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"action": "listar"}'
```

### 4.3 Acessar Frontend
Acesse a URL fornecida pela Vercel após o deploy.

---

## Comandos Rápidos (Copie e Cole)

```bash
# 1. Login Supabase + Deploy Functions
npx supabase login
npx supabase link --project-ref yfxgncbopvnsltjqetxw
npx supabase functions deploy

# 2. Login Vercel + Deploy Frontend
vercel login
vercel --prod
```

---

## Troubleshooting

### Erro: "Access token not provided"
```bash
npx supabase login
```

### Erro: "Project not linked"
```bash
npx supabase link --project-ref yfxgncbopvnsltjqetxw
```

### Erro: "OPENAI_API_KEY not set"
```bash
npx supabase secrets set OPENAI_API_KEY=sk-proj-xxx
```

### Erro de build na Vercel
- Verifique se as variáveis de ambiente estão configuradas
- Verifique o log de build em: https://vercel.com/[seu-usuario]/jurify-app/deployments

---

## URLs de Produção

| Serviço | URL |
|---------|-----|
| **Frontend** | https://jurify-app.vercel.app (ou domínio personalizado) |
| **Supabase API** | https://yfxgncbopvnsltjqetxw.supabase.co |
| **Edge Functions** | https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/[nome] |

---

**Status:** Pronto para deploy!
**Data:** 26/01/2026

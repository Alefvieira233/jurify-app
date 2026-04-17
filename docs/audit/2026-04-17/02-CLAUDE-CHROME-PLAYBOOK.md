# Playbook Claude Chrome — Credenciamento Onda 0 + Deploy final do Jurify

**Contexto para a extensão Claude Chrome:** O código do Jurify (Legal SaaS em E:\Jurify) está 100% pronto após 15 commits de hardening. Score 94/100. Falta apenas credenciamento operacional (secrets de serviços externos) + deploy de 3 edge functions novas. Este playbook te guia por cada passo — cole no chat do Claude Chrome e ele executa.

**Pré-requisitos do usuário (Alef):**
- Cartão de crédito para serviços pagos (Stripe, Postmark, Sentry paid se quiser)
- Conta Google (para OAuth)
- Conta GitHub com permissão no repo
- Terminal local com `npm` e `supabase` CLI instalados
- Conta Supabase com project ref `yfxgncbopvnsltjqetxw`

---

## 🎯 Prompt consolidado para Claude Chrome (cole inteiro)

```
Você é meu assistente executor. Vou te guiar por um playbook de credenciamento e deploy do Jurify Legal SaaS. Para cada passo:

1. Abra a URL indicada na aba ativa
2. Execute as ações no browser
3. Quando pegar um valor (API key, client ID, etc), cole aqui e diga em qual serviço do Supabase/Vercel vamos salvar
4. Após eu confirmar, navegue até o Supabase Dashboard e salve como secret
5. Marque o passo como ✅ antes de avançar

Se algum passo exigir pagamento, 2FA ou decisão crítica, pause e me pergunte.

Ambiente:
- Projeto Supabase: yfxgncbopvnsltjqetxw
- Frontend Vercel: jurify-app.vercel.app
- Repo GitHub: https://github.com/[meu-usuario]/jurify
- Diretório local: E:\Jurify

Comece pelo PASSO 1 da lista abaixo. Prossiga um de cada vez.
```

---

## 📋 Passos (18 tarefas, ~2h total)

### PARTE A — Secrets de integrações (60 min)

#### 1. Stripe — Price IDs + Webhook Secret
**URL:** https://dashboard.stripe.com/products

**Ação:**
- Crie 2 produtos:
  - **"Jurify Pro"** → preço recorrente mensal R$ 199,00 (price_xxx_pro)
  - **"Jurify Enterprise"** → preço recorrente mensal R$ 999,90 (price_xxx_ent)
- Copie os 2 `price_` IDs
- Vá em https://dashboard.stripe.com/webhooks → "Add endpoint"
  - URL: `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/stripe-webhook`
  - Eventos: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `charge.refunded`
- Copie o **Signing Secret** (`whsec_...`)
- Pegue também a **Secret Key** prod (`sk_live_...`) em https://dashboard.stripe.com/apikeys

**Destinos:**
- Supabase secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Vercel env vars: `VITE_STRIPE_PRICE_PRO`, `VITE_STRIPE_PRICE_ENTERPRISE`, `VITE_STRIPE_PUBLISHABLE_KEY` (`pk_live_...`)

**Verificação:** testar checkout em `/billing` na UI.

---

#### 2. Sentry DSN + Auth Token
**URL:** https://sentry.io/organizations/new/

**Ação:**
- Criar organização (se não tem) + projeto tipo "React"
- Platform: "React" · Framework: "Vite"
- Copiar o **DSN** gerado (ex: `https://abc@o0.ingest.sentry.io/0`)
- Em Settings > Auth Tokens → criar token com scopes `project:releases` + `project:write`

**Destinos:**
- Vercel env vars: `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- Supabase secrets: `SENTRY_DSN` (para edge functions)

**Configurar alert rules (Claude navega):**
- https://sentry.io/organizations/[org]/alerts/rules/
- Criar 4 regras (do `docs/runbooks/sentry-alerts.md`):
  - Error rate > 1% last 5min → Slack/Discord
  - New unhandled error → Slack/Discord imediato
  - p95 latency > 500ms → warning
  - Crash-free users < 99% → critical

**Webhook Slack/Discord (opcional mas recomendado):**
- Discord: Servidor → Configurações → Integrações → Webhooks → criar + copiar URL
- Adicionar em Sentry > Settings > Integrations > Discord

---

#### 3. Postmark — Server Token
**URL:** https://account.postmarkapp.com/signup

**Ação:**
- Criar conta + adicionar domínio (ex: `jurify.com.br`) e confirmar SPF/DKIM DNS
- Criar Server → pegar **Server Token**
- Em Sender Signatures → adicionar e-mail `no-reply@seudominio.com.br`

**Destinos:**
- Supabase secrets: `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL`, `POSTMARK_FROM_NAME`

**Verificação:** em Postmark → Message Streams → enviar email de teste.

---

#### 4. ZapSign — API Key + Webhook Secret
**URL:** https://app.zapsign.com.br/signup

**Ação:**
- Criar conta, planos começam em ~R$ 99/mês
- Settings > API → gerar **API Key**
- Settings > Webhooks:
  - URL: `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/zapsign-webhook`
  - Eventos: `doc_pending`, `doc_signed`, `doc_refused`, `doc_expired`
  - Copiar **Webhook Signing Secret**

**Destinos:**
- Supabase secrets: `ZAPSIGN_API_KEY`, `ZAPSIGN_API_URL` (`https://api.zapsign.com.br/api/v1`), `ZAPSIGN_WEBHOOK_SECRET`

---

#### 5. Google Cloud — OAuth App + Encryption Key
**URL:** https://console.cloud.google.com/apis/credentials

**Ação:**
- Criar projeto Google Cloud (se não tem)
- Habilitar APIs: "Google Calendar API" + "Google Drive API"
- OAuth Consent Screen:
  - App name: Jurify Legal SaaS
  - User support email: seu email
  - Scopes: `openid`, `email`, `profile`, `.../auth/calendar.events`
- Credentials → Create Credentials → OAuth Client ID
  - Type: Web application
  - Authorized redirect URI: `https://jurify-app.vercel.app/auth/google/callback` e `http://localhost:8081/auth/google/callback`
- Copiar **Client ID** e **Client Secret**

**Gerar ENCRYPTION_KEY (32 bytes base64):**
Peça ao Claude para rodar no terminal:
```bash
openssl rand -base64 32
```
(Ou use https://generate-random.org/encryption-key-generator com length 32 bytes)

**Destinos:**
- Vercel env vars: `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_REDIRECT_URI`
- Supabase secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ENCRYPTION_KEY`

---

#### 6. Escavador — API Key (opcional, mas diferencial)
**URL:** https://escavador.com/

**Ação:**
- Contato comercial (não há signup self-service) — plano tipicamente R$ 0,15-0,50 por consulta CNJ
- Receber **API Key** por email
- Alternativa self-service: **Codilo** (https://codilo.com.br) ou **Jusbrasil Pro** (pago)

**Destinos:**
- Supabase secrets: `ESCAVADOR_API_KEY` (ou `TRIBUNAL_PROVIDER=fake` para dev sem CNJ real)

**Verificação:** depois do deploy, abrir um processo no Jurify e clicar "Sincronizar andamentos".

---

#### 7. Rotacionar WHATSAPP_VERIFY_TOKEN
**URL:** https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/settings/functions

**Ação:**
- Gerar novo UUID v4 (o Claude Chrome pode rodar `crypto.randomUUID()` no devtools console)
- Atualizar secret `WHATSAPP_VERIFY_TOKEN` com o novo valor
- Ir em https://app.kapso.ai e atualizar o webhook URL com o novo verify token

**Destinos:**
- Supabase secrets: `WHATSAPP_VERIFY_TOKEN` (rotacionado)

---

#### 8. FCM e OCR (features secundárias — opcionais)
- **FCM Server Key:** https://console.firebase.google.com → criar projeto → Cloud Messaging → Server Key → `FCM_SERVER_KEY`
- **OCR.space Key:** https://ocr.space/ocrapi/freekey → `OCR_SPACE_API_KEY` (free tier 25k req/dia)

---

### PARTE B — Supabase staging + GitHub Actions secrets (20 min)

#### 9. Criar projeto Supabase staging
**URL:** https://supabase.com/dashboard/new

**Ação:**
- Nome: `jurify-staging`
- Região: `South America (São Paulo)` (sa-east-1)
- Pegar o novo project ref (ex: `abcxxx...`)
- Settings > API → copiar URL + anon key + service role key

**Destino:**
- Vercel env vars staging branch: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Supabase staging secrets: todos os secrets acima (menos DSN Sentry — usar projeto Sentry separado ou tag `environment=staging`)
- Atualizar `.github/workflows/deploy-staging.yml` com o novo ref

**Comando local depois:**
```bash
supabase link --project-ref [NOVO_REF]
supabase db push  # aplica todas as migrations no staging
```

---

#### 10. GitHub Actions Secrets (para cron rodar)
**URL:** https://github.com/[seu-usuario]/jurify/settings/secrets/actions

**Ação:** criar secrets:
- `SUPABASE_SERVICE_ROLE_KEY` (de production)
- `SUPABASE_ACCESS_TOKEN` (personal access token — https://supabase.com/dashboard/account/tokens)
- `SUPABASE_PROJECT_REF` → `yfxgncbopvnsltjqetxw`
- `HEALTH_CHECK_TOKEN` (gerar novo UUID e atualizar no Supabase secret também)

---

### PARTE C — Deploy de edge functions (10 min, local)

#### 11. Instalar/atualizar Supabase CLI local
No terminal do Alef (E:\Jurify):
```bash
npm install -g supabase
supabase login
supabase link --project-ref yfxgncbopvnsltjqetxw
```

---

#### 12. Deploy das edge functions novas da Onda 2/3
```bash
cd E:\Jurify
supabase functions deploy tribunal-sync
supabase functions deploy zapsign-webhook
supabase functions deploy health-check
supabase functions deploy stripe-webhook
supabase functions deploy whatsapp-webhook
```

**Verificação:** depois de cada deploy, o CLI mostra URL. Copiar e testar:
```bash
curl -fsS https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/health \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

---

#### 13. Instalar dependências local + husky
```bash
cd E:\Jurify
npm install
```
(Ativa o `prepare: "husky"` automaticamente)

Confirmar:
```bash
ls -la .husky/
```
Deve ter `pre-commit` e `_/.gitignore`.

---

### PARTE D — Configurar Vercel (15 min)

#### 14. Vercel env vars (production)
**URL:** https://vercel.com/[seu-usuario]/jurify-app/settings/environment-variables

**Ação:** criar 12 variáveis (Production + Preview):

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | https://yfxgncbopvnsltjqetxw.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | (do Supabase prod) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | pk_live_... |
| `VITE_STRIPE_PRICE_PRO` | price_... |
| `VITE_STRIPE_PRICE_ENTERPRISE` | price_... |
| `VITE_SENTRY_DSN` | https://.../... |
| `VITE_GOOGLE_CLIENT_ID` | ...googleusercontent.com |
| `VITE_GOOGLE_REDIRECT_URI` | https://jurify-app.vercel.app/auth/google/callback |
| `SENTRY_AUTH_TOKEN` | sntrys_... |
| `SENTRY_ORG` | seu-org |
| `SENTRY_PROJECT` | jurify |
| `VITE_PUBLIC_STATUS_TOKEN` | (opcional, gerar UUID — só se quiser detalhes em /status) |

---

#### 15. Trigger deploy Vercel
- Git push para main dispara deploy automático
- Ou: https://vercel.com/[user]/jurify-app/deployments → Redeploy latest

**Verificação:**
- Abrir https://jurify-app.vercel.app
- Login funciona? Dashboard carrega?
- `/status` responde?
- Console sem errors?

---

### PARTE E — Smoke tests em produção (15 min)

#### 16. Testar fluxos críticos
Playlist para Claude Chrome validar:

- [ ] Abrir https://jurify-app.vercel.app/signup → criar usuário novo
- [ ] Onboarding 7 steps: completa até o fim
- [ ] Billing → clicar "Assinar Pro" → checkout Stripe abre (usar `4242 4242 4242 4242` em test mode)
- [ ] Leads → criar lead → botão "Auto-rotear por área" aparece
- [ ] Processos → criar processo → aba "Andamentos" mostra empty state + botão "Sincronizar"
- [ ] Honorários → tab "Dashboard" mostra 4 cards + chart
- [ ] Documentos → upload PDF → clicar → viewer abre em iframe
- [ ] Contratos → criar → "Abrir PDF" funciona
- [ ] Reports → exportar CSV funciona
- [ ] WhatsApp → enviar mensagem teste ao tenant → IA responde

---

#### 17. Validar cron jobs rodando
**URL:** https://github.com/[user]/jurify/actions

**Ação:**
- Tab "Actions" → Workflow "Scheduled Jobs" → Run workflow (manual)
- Testar cada job individualmente: `data-retention-cleanup`, `process-prazos-alerts`, `tribunal-sync`
- Verificar que cada um retorna 200

---

#### 18. Monitorar Sentry primeiras 24h
**URL:** https://sentry.io/organizations/[org]/issues/

**Ação:**
- Filtrar por `environment:production`
- Se aparecer error rate > 1% → investigar
- Configurar dashboard com p95 latency + error rate + user sessions

---

## 🎉 Estado final esperado

Depois dos 18 passos:

| Métrica | Target |
|---|---|
| Stripe checkout | Funcional com price IDs reais |
| Sentry | Capturando eventos + alertas ativos |
| Emails | Chegando via Postmark |
| Assinatura digital | ZapSign processando contratos |
| Google Calendar | Sincronizando agendamentos |
| Tribunal CNJ | Puxando andamentos a cada 6h |
| WhatsApp IA | Respondendo + handoff cooldown 24h |
| Cron jobs | 6/6 GitHub Actions agendados |
| Observability | /status público + Sentry + admin metrics |
| Score de prontidão | **~96/100** |

---

## 🚨 Armadilhas comuns (para Claude Chrome pausar e perguntar)

1. **Stripe test mode vs live mode** — se Alef quer começar com test mode, use `sk_test_...` + `pk_test_...` + cards de teste. Depois trocar tudo.
2. **Sentry free tier** — 5k events/mês. Jurify low-traffic fica dentro. Se estourar, pagar ou tunar sampling.
3. **ZapSign plano free** — tem limite de 3 docs/mês. Pro começa ~R$ 99/mês.
4. **Postmark** — requer domínio próprio com SPF/DKIM. Se não tem domínio, Mailgun ou SES são alternativas.
5. **Escavador** — contato comercial obrigatório (não é signup). Se Alef não quer pagar ainda, setar `TRIBUNAL_PROVIDER=fake` e desabilitar o cron tribunal-sync.
6. **Staging Supabase** — criar mais tarde é ok; se não vai testar antes de cada deploy, pode ficar só com prod por enquanto (risco assumido).
7. **WHATSAPP_VERIFY_TOKEN** rotação — só rotacionar quando Kapso webhook estiver pronto para updates; senão webhook para.

---

## 📝 Checklist de entrega final (Claude Chrome marca)

- [ ] 1. Stripe Products + Webhook + Keys
- [ ] 2. Sentry DSN + Auth Token + Alert rules
- [ ] 3. Postmark Server Token + SPF/DKIM
- [ ] 4. ZapSign API Key + Webhook
- [ ] 5. Google Cloud OAuth + ENCRYPTION_KEY
- [ ] 6. Escavador (opcional)
- [ ] 7. WhatsApp verify token rotacionado
- [ ] 8. FCM + OCR (opcional)
- [ ] 9. Supabase staging criado
- [ ] 10. GitHub Actions secrets
- [ ] 11. Supabase CLI linkado
- [ ] 12. 5 edge functions deployadas
- [ ] 13. `npm install` + husky ativado
- [ ] 14. 12 Vercel env vars
- [ ] 15. Deploy Vercel triggered
- [ ] 16. Smoke tests (10 fluxos)
- [ ] 17. Cron jobs manuais OK
- [ ] 18. Sentry monitorado 24h

**Tempo estimado:** 2h30 (depende de approvals DNS/2FA)

**Quando tudo ✅:** Jurify está rodando em produção, score ~96/100, pronto para cobrar clientes reais. 🚀

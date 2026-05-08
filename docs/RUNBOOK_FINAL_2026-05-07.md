# Runbook final — destrava produção (Jurify, 2026-05-07)

> **Pré-requisitos:** este runbook assume que tudo o que era código já está em prod (commits `c479dab` → `cd58812`, 18 migrations aplicadas, 6 edge functions deployadas/redeployadas hoje). Aqui ficam **só as ações operacionais que dependem de credenciais externas** ou ações destrutivas de histórico.

---

## Estado atual dos Edge Secrets (auditoria 2026-05-07)

### ✅ Configurados (21)
`ALLOWED_ORIGINS`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, **`HEALTH_CHECK_TOKEN` (rotacionado hoje)**, `KAPSO_API_KEY`, `KAPSO_API_URL`, `KAPSO_MASTER_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_*` (5), `WHATSAPP_VERIFY_TOKEN`.

### ❌ Faltam (5 — bloqueiam features mas não core)
| Secret | Bloqueia |
|--------|----------|
| `POSTMARK_SERVER_TOKEN` | Welcome email + trial-expiring email |
| `POSTMARK_FROM_EMAIL` | Idem |
| `POSTMARK_FROM_NAME` | Idem |
| `SENTRY_DSN` (frontend `VITE_SENTRY_DSN`) | Erros em prod saem cego |
| `ZAPSIGN_API_TOKEN` | Contratos digitais não saem |

### 🟡 Não-bloqueante mas recomendado
- `TRIBUNAL_PROVIDER=fake` (ou Escavador real) — hoje em modo padrão

---

## Ação 1 — Sincronizar `HEALTH_CHECK_TOKEN` em GH Actions (5 min)

**Status:** o token foi rotacionado em prod (Supabase Edge Secret) e está no arquivo local `.secrets-pending/HEALTH_CHECK_TOKEN.txt` (gitignored).

```bash
# No teu terminal local (PowerShell ou Bash)
cat .secrets-pending/HEALTH_CHECK_TOKEN.txt
# (copia o valor)
```

1. Acessa https://github.com/Alefvieira233/jurify-app/settings/secrets/actions
2. Edita o secret `HEALTH_CHECK_TOKEN` (já existe)
3. Cola o novo valor
4. Salva

**Validação (D+1):**
- A próxima execução do cron `data-retention-cleanup` (02:00 UTC = 23:00 BRT) deve retornar 200 (não mais 401).
- GH Actions → cron-jobs.yml → workflow runs

---

## Ação 2 — Stripe (30 min)

**Status:** `STRIPE_SECRET_KEY` JÁ está configurado no Edge Secret. Falta só:

1. Criar produtos no Stripe Dashboard:
   - **Trial** (grátis 45 dias, depois converte pra Pro)
   - **Pro** (mensal e anual)
   - **Enterprise** (sob consulta)
2. Pegar os Price IDs reais (formato `price_1xxxx...`)
3. Atualizar no DB executando:

```sql
-- Substituir pelos Price IDs reais do Stripe
UPDATE public.subscription_plans
SET stripe_price_id_monthly = 'price_REAL_PRO_MONTHLY',
    stripe_price_id_yearly = 'price_REAL_PRO_YEARLY'
WHERE plan_id = 'pro';

UPDATE public.subscription_plans
SET stripe_price_id_monthly = 'price_REAL_ENTERPRISE_MONTHLY'
WHERE plan_id = 'enterprise';
```

4. Configurar webhook Stripe apontando pra `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/stripe-webhook` com signing secret salvo em `STRIPE_WEBHOOK_SECRET` (esse pode estar faltando, vale checar).

---

## Ação 3 — Sentry (15 min)

1. Cria conta gratuita em https://sentry.io (Tier free aceita até 5k erros/mês)
2. Cria 1 projeto **"Jurify Frontend"** (React)
3. Cria 1 projeto **"Jurify Edge Functions"** (Deno/Node)
4. Copia os DSNs (formato `https://xxx@yyy.ingest.sentry.io/zzz`)
5. Configura:

**No Vercel** (frontend):
- Settings → Environment Variables → adiciona `VITE_SENTRY_DSN` (DSN do projeto Frontend) → marca todos os environments → redeploy

**No Supabase Edge Secrets** (backend):
```bash
SUPABASE_ACCESS_TOKEN=$YOUR_ACCESS_TOKEN \
  npx supabase secrets set "SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz" \
  --project-ref yfxgncbopvnsltjqetxw
```

**Validação:** após redeploy do Vercel, abrir console do browser e fazer alguma ação que dê erro (ex: requisição com auth inválida) — deve aparecer no painel do Sentry em segundos.

---

## Ação 4 — Postmark (20 min)

1. Login em https://account.postmarkapp.com
2. Verifica o domínio `jurify.app` (Sender Signatures → Add Domain) e configura SPF/DKIM no Cloudflare/Registro.br
3. Cria um Server (ou usa o default) → copia o **Server Token**
4. Configura:

```bash
SUPABASE_ACCESS_TOKEN=$YOUR_ACCESS_TOKEN \
  npx supabase secrets set \
  "POSTMARK_SERVER_TOKEN=<token>" \
  "POSTMARK_FROM_EMAIL=noreply@jurify.app" \
  "POSTMARK_FROM_NAME=Jurify" \
  --project-ref yfxgncbopvnsltjqetxw
```

**Validação:** criar conta de teste em prod → email de welcome deve chegar em ~10s.

---

## Ação 5 — Kapso webhook (já 100% funcional)

**Status:** webhook está **funcionando** (validado por smoke test sintético hoje). Conexão "Escritório Dra Jacira Gomes" no Kapso está Active + Verified, e mensagens reais inbound vão funcionar end-to-end.

**Pra testar manualmente:** mande WhatsApp pro número `+55 83 8636-7755` de qualquer celular que NÃO seja `+55 96 8141-9460` (esse já está cadastrado como lead). A Ana deve responder em ~10s e fazer handoff pra Jacira se você falar de superendividamento/banco.

---

## Ação 6 — BFG / git filter-branch (1h, OPCIONAL antes do go-live público)

**Auditoria do histórico git executada hoje:**

| Tipo | Achados |
|------|---------|
| JWTs supabase (eyJ*) | **10+ distintos** em arquivos como `SECURITY_ALERT_CHAVES_COMPROMETIDAS.md`, `STATUS_ATUAL_COMPLETO.md`, `.env.production.example`, `DEPLOY_PRODUCAO.md` |
| Stripe `sk_live_51...` | 1 chave provavelmente real (commit `4b9fd23`) |
| Stripe placeholders (`sk_live_xxx`/`sk_live_your`) | 3 (irrelevantes) |
| OpenAI `sk-...` | 0 ✅ |
| Service role JWTs (header `"role":"service_role"`) | 0 ✅ |

**Status:** as chaves Supabase mais recentes (rotacionadas pós 2026-04-10) NÃO estão no histórico. Mas chaves antigas (anon, eventualmente JWT_SECRET) sim. Se o repo for público ou clonado por terceiros, esses JWTs antigos podem ser usados pra forjar tokens.

**NÃO EXECUTEI** o BFG porque é operação destrutiva (reescreve histórico, força push, invalida todos os clones existentes). Pra executar quando quiser:

```bash
# 1. Backup do repo
git clone --mirror https://github.com/Alefvieira233/jurify-app.git jurify-backup.git

# 2. Roda BFG removendo padrões
java -jar bfg.jar --replace-text patterns.txt jurify-app
# patterns.txt deve conter:
#   regex:eyJ[A-Za-z0-9_-]{50,}==>***REMOVED***
#   regex:sk_live_[A-Za-z0-9]{24,}==>***REMOVED***

# 3. Limpa refs e força push
cd jurify-app
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force --all
git push --force --tags
```

**Riscos:**
- Quem fez fork ou clone precisa re-clonar
- PRs abertos podem quebrar
- Histórico de blame muda

**Mitigação alternativa:** se as chaves antigas já foram rotacionadas no Supabase (e provavelmente foram), os JWTs no histórico ficam **inválidos** — não há atacante que possa usar pra autenticar. Ou seja: **rotacionar > BFG** em termos de segurança real. Se você confirma que rotacionou tudo pós 2026-04-10, BFG vira nice-to-have apenas pra hygiene de repo.

**Recomendo verificar primeiro:** rotacione as keys Supabase no Dashboard (anon/service_role/JWT_secret) → então qualquer JWT antigo vazado vira inútil → BFG vira opcional.

---

## Ação 7 — Google OAuth verification (1h trabalho + 4-8 sem espera, NÃO bloqueia)

Detalhes em [docs/GOOGLE_OAUTH_VERIFICATION_CHECKLIST.md](GOOGLE_OAUTH_VERIFICATION_CHECKLIST.md).

Resumo: enquanto não submeter, usuários veem aviso "App not verified" mas a conexão Calendar funciona normalmente (limite 100 OAuth tokens vivos).

---

## Checklist de go-live

- [ ] Ação 1 — `HEALTH_CHECK_TOKEN` em GH Actions (5 min)
- [ ] Ação 2 — Stripe produtos + price IDs (30 min)
- [ ] Ação 3 — Sentry DSN no Vercel + Supabase (15 min)
- [ ] Ação 4 — Postmark token + DNS (20 min)
- [ ] Validar manualmente: signup → welcome email → conectar WhatsApp → mandar mensagem real → IA responde → agendar consulta → evento Calendar criado
- [ ] (Opcional) Ação 6 — BFG no histórico
- [ ] (Opcional) Ação 7 — Google OAuth verification

**Tempo total das críticas (1-4): ~1h10m.** Após isso, o produto está 100% pronto pra clientes reais.

---

## Logs e monitoramento pós go-live

- **Sentry** (após Ação 3): erros frontend + backend
- **Supabase Logs** (Dashboard → Logs → Edge Functions): exceções edge function
- **GH Actions** (Settings → Actions): runs dos crons (data-retention, expire-trials, notify-expiring-trials, etc.)
- **Postmark** (Activity tab): emails enviados/bounce/spam complaints
- **Stripe** (Dashboard → Events): webhooks recebidos, charges, subscriptions

---

**Cleanup pós go-live:**

```bash
# Depois de aplicar Ação 1, deletar o arquivo de token
rm .secrets-pending/HEALTH_CHECK_TOKEN.txt
rmdir .secrets-pending
```

#!/usr/bin/env bash
# ============================================================
# JURIFY — Configurar Secrets Externos no Supabase + Vercel
# ============================================================
# Executar quando tiver as credenciais dos serviços externos.
#
# PRÉ-REQUISITO: supabase CLI instalado e logado
#   supabase login   (ou export SUPABASE_ACCESS_TOKEN=sbp_...)
#
# USO:
#   chmod +x docs/setup_secrets.sh
#   SUPABASE_ACCESS_TOKEN=sbp_... bash docs/setup_secrets.sh
# ============================================================

PROJECT_REF="yfxgncbopvnsltjqetxw"
VERCEL_TOKEN="YOUR_VERCEL_TOKEN_HERE"

# ============================================================
# 1. STRIPE — Billing e Assinaturas
# ============================================================
# Obter em: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY="sk_live_..."          # ou sk_test_...
STRIPE_WEBHOOK_SECRET="whsec_..."        # Webhook → Developers → Webhooks
STRIPE_PRICE_PRO="price_..."             # Products → Plano Pro → Price ID
STRIPE_PRICE_ENTERPRISE="price_..."      # Products → Plano Enterprise → Price ID

supabase secrets set \
  STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  STRIPE_PRICE_PRO="$STRIPE_PRICE_PRO" \
  STRIPE_PRICE_ENTERPRISE="$STRIPE_PRICE_ENTERPRISE" \
  --project-ref "$PROJECT_REF"

# ============================================================
# 2. ZAPSIGN — Contratos Digitais
# ============================================================
# Obter em: https://app.zapsign.com.br/configuracoes/integracao
ZAPSIGN_API_KEY="..."

supabase secrets set \
  ZAPSIGN_API_KEY="$ZAPSIGN_API_KEY" \
  --project-ref "$PROJECT_REF"

# ============================================================
# 3. POSTMARK — E-mail Transacional
# ============================================================
# Obter em: https://account.postmarkapp.com/servers
POSTMARK_SERVER_TOKEN="..."
POSTMARK_FROM_EMAIL="noreply@jurify.com.br"
POSTMARK_FROM_NAME="Jurify"

supabase secrets set \
  POSTMARK_SERVER_TOKEN="$POSTMARK_SERVER_TOKEN" \
  POSTMARK_FROM_EMAIL="$POSTMARK_FROM_EMAIL" \
  POSTMARK_FROM_NAME="$POSTMARK_FROM_NAME" \
  --project-ref "$PROJECT_REF"

# ============================================================
# 4. VERCEL — Env vars de frontend
# ============================================================
# Stripe public price IDs (os mesmos de cima, sem chave secreta)
printf '%s' "$STRIPE_PRICE_PRO"         | vercel env add VITE_STRIPE_PRICE_PRO         production --token "$VERCEL_TOKEN" --force
printf '%s' "$STRIPE_PRICE_ENTERPRISE"  | vercel env add VITE_STRIPE_PRICE_ENTERPRISE  production --token "$VERCEL_TOKEN" --force

# Sentry (opcional — para error tracking)
# VITE_SENTRY_DSN: obter em https://sentry.io → Settings → Projects → DSN
# SENTRY_AUTH_TOKEN: https://sentry.io → Settings → Auth Tokens
# printf '%s' "https://xxx@yyy.ingest.sentry.io/zzz" | vercel env add VITE_SENTRY_DSN     production --token "$VERCEL_TOKEN" --force
# printf '%s' "sntryu_..."                            | vercel env add SENTRY_AUTH_TOKEN   production --token "$VERCEL_TOKEN" --force

# ============================================================
# 5. REDEPLOY VERCEL
# ============================================================
echo ""
echo "=== Fazendo redeploy no Vercel ==="
vercel --prod --token "$VERCEL_TOKEN"

# ============================================================
# 6. TESTAR HEALTH-CHECK
# ============================================================
echo ""
echo "=== Testando health-check ==="
curl -s "https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/health-check" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeGduY2JvcHZuc2x0anFldHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzIzMTksImV4cCI6MjA2NTUwODMxOX0.NqVjMB81nBlAE4h7jvsHfDBOpMKXohNsquVIvEFH46A" \
  -H "x-health-check-token: b42379f3-7ffd-4e71-9137-d49c4db17c79" | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "=== Setup concluído! ==="

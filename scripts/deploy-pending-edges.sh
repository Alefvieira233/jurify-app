#!/usr/bin/env bash
# ============================================================================
# Deploy das edge functions pendentes da Onda 2/3
# ============================================================================
# Uso: bash scripts/deploy-pending-edges.sh
#
# Pré-requisitos:
#   1. Supabase CLI instalado:  npm install -g supabase
#   2. Login + link ao projeto:
#        supabase login
#        supabase link --project-ref yfxgncbopvnsltjqetxw
#
# O que faz:
#   - Deploy das 2 edge functions novas da Onda 2/3 (tribunal-sync, zapsign-webhook)
#   - Re-deploy das 3 modificadas (health-check v2.1, stripe-webhook com fix planId,
#     whatsapp-webhook com rate-limit 2 fases + handoff cooldown)
#   - Instala deps + ativa husky pre-commit
# ============================================================================

set -euo pipefail

PROJECT_REF="yfxgncbopvnsltjqetxw"
FUNCS_NEW=(
  "tribunal-sync"
  "zapsign-webhook"
)
FUNCS_UPDATED=(
  "health-check"
  "stripe-webhook"
  "whatsapp-webhook"
  "ai-agent-processor"
  "chat-completion"
  "assistant"
  "agent-orchestrator"
  "media-processor"
)

echo "======================================================================"
echo "  Jurify — Deploy edge functions pendentes (Onda 2/3)"
echo "  Project: $PROJECT_REF"
echo "======================================================================"

# Validação pré-deploy
command -v supabase >/dev/null 2>&1 || {
  echo "❌ supabase CLI não encontrado. Rode: npm install -g supabase"
  exit 1
}

echo ""
echo "→ Validando link ao projeto..."
supabase status 2>&1 | head -5 || {
  echo "❌ Projeto não linkado. Rode: supabase link --project-ref $PROJECT_REF"
  exit 1
}

# 1. Instalar deps + ativar husky
echo ""
echo "→ [1/3] Instalando deps + ativando husky..."
npm install

# 2. Deploy das funções NOVAS
echo ""
echo "→ [2/3] Deploy de ${#FUNCS_NEW[@]} edge functions novas..."
for fn in "${FUNCS_NEW[@]}"; do
  echo "    ↳ Deploying $fn..."
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
done

# 3. Re-deploy das funções MODIFICADAS
echo ""
echo "→ [3/3] Re-deploy de ${#FUNCS_UPDATED[@]} edge functions modificadas..."
for fn in "${FUNCS_UPDATED[@]}"; do
  echo "    ↳ Re-deploying $fn..."
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
done

echo ""
echo "======================================================================"
echo "  ✅ Deploy concluído!"
echo "======================================================================"
echo ""
echo "Próximos passos:"
echo "  1. Verificar no Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo "  2. Smoke test tribunal-sync:"
echo "       curl -sS https://$PROJECT_REF.supabase.co/functions/v1/tribunal-sync \\"
echo "         -H \"Authorization: Bearer \$SUPABASE_SERVICE_ROLE_KEY\" \\"
echo "         -H \"Content-Type: application/json\" \\"
echo "         -d '{\"batch\": true, \"limit\": 1}'"
echo "  3. Atualizar Kapso com novo WHATSAPP_VERIFY_TOKEN: https://app.kapso.ai"
echo "  4. Adicionar SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ACCESS_TOKEN no GitHub Actions"
echo ""

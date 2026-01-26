#!/bin/bash

# 💳 SETUP DO STRIPE - Script de Configuração
#
# Script interativo para configurar o Stripe no Jurify.
# Guia o usuário passo a passo na configuração completa.
#
# USO: bash scripts/setup-stripe.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  💳  ${BLUE}JURIFY - CONFIGURAÇÃO DO STRIPE${NC}  ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo ""
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# =========================================================
# INÍCIO
# =========================================================

print_header

print_info "Este script irá guiá-lo na configuração do Stripe."
print_info "Você precisará de:"
echo "  • Uma conta Stripe (https://stripe.com)"
echo "  • API Keys do Stripe"
echo "  • Price IDs dos produtos criados"
echo ""

read -p "Pressione ENTER para continuar..."

# =========================================================
# ETAPA 1: VERIFICAR CONTA STRIPE
# =========================================================

print_step "ETAPA 1: Conta Stripe"

print_info "Você tem uma conta no Stripe?"
echo ""
echo "1. Sim, já tenho"
echo "2. Não, preciso criar"
echo ""
read -p "Escolha (1 ou 2): " has_stripe_account

if [ "$has_stripe_account" = "2" ]; then
    print_warning "Por favor, crie sua conta primeiro:"
    echo ""
    echo "  1. Acesse: https://dashboard.stripe.com/register"
    echo "  2. Preencha o formulário"
    echo "  3. Verifique seu email"
    echo "  4. Complete o processo de onboarding"
    echo ""
    read -p "Pressione ENTER quando terminar..."
fi

print_success "Conta Stripe confirmada!"

# =========================================================
# ETAPA 2: OBTER API KEYS
# =========================================================

print_step "ETAPA 2: API Keys"

print_info "Agora vamos configurar as API Keys."
echo ""
echo "📋 INSTRUÇÕES:"
echo ""
echo "  1. Acesse: https://dashboard.stripe.com/test/apikeys"
echo "  2. Você verá duas chaves:"
echo "     • Publishable key (começa com pk_test_)"
echo "     • Secret key (começa com sk_test_) - clique 'Reveal'"
echo ""

read -p "Pressione ENTER quando estiver pronto..."
echo ""

# Publishable Key
print_info "Cole a Publishable Key (pk_test_...):"
read -p "> " publishable_key

if [[ ! "$publishable_key" =~ ^pk_test_ ]] && [[ ! "$publishable_key" =~ ^pk_live_ ]]; then
    print_error "Publishable Key inválida! Deve começar com pk_test_ ou pk_live_"
    exit 1
fi

print_success "Publishable Key válida!"
echo ""

# Secret Key
print_info "Cole a Secret Key (sk_test_...):"
read -p "> " secret_key

if [[ ! "$secret_key" =~ ^sk_test_ ]] && [[ ! "$secret_key" =~ ^sk_live_ ]]; then
    print_error "Secret Key inválida! Deve começar com sk_test_ ou sk_live_"
    exit 1
fi

print_success "Secret Key válida!"

# =========================================================
# ETAPA 3: CRIAR PRODUTOS
# =========================================================

print_step "ETAPA 3: Produtos e Price IDs"

print_info "Você já criou os produtos no Stripe?"
echo ""
echo "1. Sim, já criei"
echo "2. Não, preciso criar"
echo ""
read -p "Escolha (1 ou 2): " has_products

if [ "$has_products" = "2" ]; then
    print_warning "Vamos criar os produtos agora."
    echo ""
    echo "📋 PRODUTO 1: Jurify - Plano Profissional"
    echo "  ┌─────────────────────────────────────────┐"
    echo "  │ Name: Jurify - Plano Profissional      │"
    echo "  │ Description: 10 Agentes de IA, Leads... │"
    echo "  │ Price: R$ 99,00 / mês                   │"
    echo "  │ Type: Recurring                         │"
    echo "  └─────────────────────────────────────────┘"
    echo ""
    echo "📋 PRODUTO 2: Jurify - Escritório Elite"
    echo "  ┌─────────────────────────────────────────┐"
    echo "  │ Name: Jurify - Escritório Elite        │"
    echo "  │ Description: 100 Agentes, White Label...│"
    echo "  │ Price: R$ 299,00 / mês                  │"
    echo "  │ Type: Recurring                         │"
    echo "  └─────────────────────────────────────────┘"
    echo ""
    print_info "Criando produtos..."
    echo ""
    echo "  1. Acesse: https://dashboard.stripe.com/test/products"
    echo "  2. Clique em '+ Add Product'"
    echo "  3. Preencha conforme indicado acima"
    echo "  4. Após criar, copie o Price ID (price_...)"
    echo ""
    read -p "Pressione ENTER quando terminar..."
fi

echo ""
print_info "Cole o Price ID do Plano PRO (price_...):"
read -p "> " price_pro

if [[ ! "$price_pro" =~ ^price_ ]]; then
    print_error "Price ID inválido! Deve começar com price_"
    exit 1
fi

print_success "Price ID PRO válido!"
echo ""

print_info "Cole o Price ID do Plano ENTERPRISE (price_...):"
read -p "> " price_enterprise

if [[ ! "$price_enterprise" =~ ^price_ ]]; then
    print_error "Price ID inválido! Deve começar com price_"
    exit 1
fi

print_success "Price ID ENTERPRISE válido!"

# =========================================================
# ETAPA 4: CONFIGURAR WEBHOOK
# =========================================================

print_step "ETAPA 4: Webhook"

print_info "Configurando webhook..."
echo ""
echo "📋 INSTRUÇÕES:"
echo ""
echo "  1. Acesse: https://dashboard.stripe.com/test/webhooks"
echo "  2. Clique em '+ Add endpoint'"
echo "  3. Endpoint URL:"
echo "     https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/stripe-webhook"
echo ""
echo "  4. Events to send (selecione estes):"
echo "     • customer.subscription.created"
echo "     • customer.subscription.updated"
echo "     • customer.subscription.deleted"
echo "     • invoice.payment_succeeded"
echo "     • invoice.payment_failed"
echo ""
echo "  5. Após criar, copie o Signing secret (whsec_...)"
echo ""

read -p "Pressione ENTER quando estiver pronto..."
echo ""

print_info "Cole o Webhook Signing Secret (whsec_...):"
read -p "> " webhook_secret

if [[ ! "$webhook_secret" =~ ^whsec_ ]]; then
    print_error "Webhook Secret inválido! Deve começar com whsec_"
    exit 1
fi

print_success "Webhook Secret válido!"

# =========================================================
# ETAPA 5: SALVAR CONFIGURAÇÕES
# =========================================================

print_step "ETAPA 5: Salvando Configurações"

# Atualizar .env
print_info "Atualizando .env..."

ENV_FILE=".env"

# Backup do .env
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "${ENV_FILE}.backup-stripe-$(date +%Y%m%d-%H%M%S)"
    print_success "Backup do .env criado"
fi

# Atualizar ou adicionar variáveis
if grep -q "VITE_STRIPE_PUBLISHABLE_KEY=" "$ENV_FILE"; then
    sed -i.bak "s|VITE_STRIPE_PUBLISHABLE_KEY=.*|VITE_STRIPE_PUBLISHABLE_KEY=$publishable_key|" "$ENV_FILE"
else
    echo "VITE_STRIPE_PUBLISHABLE_KEY=$publishable_key" >> "$ENV_FILE"
fi

if grep -q "VITE_STRIPE_PRICE_PRO=" "$ENV_FILE"; then
    sed -i.bak "s|VITE_STRIPE_PRICE_PRO=.*|VITE_STRIPE_PRICE_PRO=$price_pro|" "$ENV_FILE"
else
    echo "VITE_STRIPE_PRICE_PRO=$price_pro" >> "$ENV_FILE"
fi

if grep -q "VITE_STRIPE_PRICE_ENTERPRISE=" "$ENV_FILE"; then
    sed -i.bak "s|VITE_STRIPE_PRICE_ENTERPRISE=.*|VITE_STRIPE_PRICE_ENTERPRISE=$price_enterprise|" "$ENV_FILE"
else
    echo "VITE_STRIPE_PRICE_ENTERPRISE=$price_enterprise" >> "$ENV_FILE"
fi

rm -f "${ENV_FILE}.bak"

print_success ".env atualizado!"
echo ""

# Configurar Supabase Secrets
print_info "Configurando Supabase Secrets..."
echo ""

if command -v supabase &> /dev/null; then
    echo "supabase secrets set STRIPE_SECRET_KEY='$secret_key'"
    supabase secrets set STRIPE_SECRET_KEY="$secret_key"

    echo "supabase secrets set STRIPE_WEBHOOK_SECRET='$webhook_secret'"
    supabase secrets set STRIPE_WEBHOOK_SECRET="$webhook_secret"

    print_success "Supabase Secrets configurados!"
else
    print_warning "Supabase CLI não encontrado. Configure manualmente:"
    echo ""
    echo "  supabase secrets set STRIPE_SECRET_KEY=$secret_key"
    echo "  supabase secrets set STRIPE_WEBHOOK_SECRET=$webhook_secret"
    echo ""
fi

# =========================================================
# ETAPA 6: DEPLOY DAS EDGE FUNCTIONS
# =========================================================

print_step "ETAPA 6: Deploy das Edge Functions"

print_info "As Edge Functions precisam ser deployadas..."
echo ""

if command -v supabase &> /dev/null; then
    print_info "Fazendo deploy de create-checkout-session..."
    supabase functions deploy create-checkout-session

    print_info "Fazendo deploy de stripe-webhook..."
    supabase functions deploy stripe-webhook

    print_success "Edge Functions deployadas!"
else
    print_warning "Deploy manual necessário:"
    echo ""
    echo "  supabase functions deploy create-checkout-session"
    echo "  supabase functions deploy stripe-webhook"
    echo ""
fi

# =========================================================
# CONCLUSÃO
# =========================================================

print_step "✅ CONFIGURAÇÃO CONCLUÍDA!"

print_success "Stripe configurado com sucesso!"
echo ""
echo "📊 RESUMO:"
echo ""
echo "  ✅ Publishable Key: ${publishable_key:0:20}..."
echo "  ✅ Secret Key: ${secret_key:0:15}... (em Secrets)"
echo "  ✅ Price PRO: $price_pro"
echo "  ✅ Price ENTERPRISE: $price_enterprise"
echo "  ✅ Webhook Secret: ${webhook_secret:0:15}... (em Secrets)"
echo ""

print_info "🧪 PRÓXIMOS PASSOS:"
echo ""
echo "  1. Testar o sistema:"
echo "     npm run dev"
echo "     Acesse: http://localhost:8080/planos"
echo ""
echo "  2. Fazer uma assinatura de teste:"
echo "     Cartão: 4242 4242 4242 4242"
echo "     Vencimento: 12/34"
echo "     CVC: 123"
echo ""
echo "  3. Verificar webhook:"
echo "     supabase functions logs stripe-webhook --tail"
echo ""

print_success "🎉 Sistema de billing pronto para uso!"
echo ""

exit 0

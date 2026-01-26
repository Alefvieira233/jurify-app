#!/bin/bash

# 🚀 DEPLOY DA CORREÇÃO DE SEGURANÇA - WhatsApp
#
# Script para fazer deploy da Edge Function send-whatsapp-message
# e verificar que a correção WA-001 e WA-002 está funcionando.
#
# USO: bash scripts/deploy-whatsapp-fix.sh

set -e  # Exit on error

echo "🚀 ========================================"
echo "   DEPLOY: WhatsApp Security Fix"
echo "   WA-001 & WA-002 Resolution"
echo "========================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para prints coloridos
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
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
# 1. VERIFICAÇÕES PRÉ-DEPLOY
# =========================================================

print_info "Verificando pré-requisitos..."
echo ""

# Verifica se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI não está instalado!"
    echo ""
    echo "Instale com:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

print_success "Supabase CLI instalado"

# Verifica se está na pasta correta
if [ ! -f "supabase/config.toml" ]; then
    print_error "Execute este script da raiz do projeto!"
    echo "Você está em: $(pwd)"
    exit 1
fi

print_success "Pasta correta"

# Verifica se a Edge Function existe
if [ ! -f "supabase/functions/send-whatsapp-message/index.ts" ]; then
    print_error "Edge Function send-whatsapp-message não encontrada!"
    echo "Esperado: supabase/functions/send-whatsapp-message/index.ts"
    exit 1
fi

print_success "Edge Function encontrada"
echo ""

# =========================================================
# 2. VERIFICAR SECRETS
# =========================================================

print_info "Verificando Supabase Secrets..."
echo ""

print_warning "ATENÇÃO: Certifique-se de que os seguintes secrets estão configurados:"
echo ""
echo "  • WHATSAPP_ACCESS_TOKEN"
echo "  • WHATSAPP_PHONE_NUMBER_ID"
echo "  • WHATSAPP_VERIFY_TOKEN"
echo "  • SUPABASE_SERVICE_ROLE_KEY (geralmente já configurado)"
echo "  • OPENAI_API_KEY (já deve estar configurado)"
echo ""

read -p "Os secrets estão configurados? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    print_warning "Configure os secrets antes de continuar:"
    echo ""
    echo "  supabase secrets set WHATSAPP_ACCESS_TOKEN=EAA..."
    echo "  supabase secrets set WHATSAPP_PHONE_NUMBER_ID=123..."
    echo "  supabase secrets set WHATSAPP_VERIFY_TOKEN=seu_token_secreto"
    echo ""
    echo "Depois execute este script novamente."
    exit 1
fi

print_success "Secrets confirmados"
echo ""

# =========================================================
# 3. BUILD & DEPLOY
# =========================================================

print_info "Fazendo deploy da Edge Function..."
echo ""

# Deploy da função
if supabase functions deploy send-whatsapp-message; then
    print_success "Edge Function deployada com sucesso!"
else
    print_error "Erro ao fazer deploy da Edge Function"
    exit 1
fi

echo ""

# =========================================================
# 4. VERIFICAÇÕES PÓS-DEPLOY
# =========================================================

print_info "Verificando deploy..."
echo ""

# Lista funções deployadas
print_info "Funções deployadas:"
supabase functions list
echo ""

# Mostra logs recentes
print_info "Logs recentes (últimas 5 linhas):"
supabase functions logs send-whatsapp-message --tail 5 || print_warning "Não há logs ainda (normal em primeiro deploy)"
echo ""

# =========================================================
# 5. PRÓXIMOS PASSOS
# =========================================================

print_success "========================================="
print_success "   DEPLOY CONCLUÍDO COM SUCESSO!"
print_success "========================================="
echo ""

echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Teste a Edge Function:"
echo "   USER_TOKEN=seu_token npx tsx scripts/test-whatsapp-send.ts"
echo ""
echo "2. Monitore os logs:"
echo "   supabase functions logs send-whatsapp-message --tail"
echo ""
echo "3. Teste no frontend:"
echo "   - Acesse /whatsapp no seu app"
echo "   - Envie uma mensagem"
echo "   - Verifique se chega no WhatsApp do lead"
echo ""

print_success "🔒 Correção WA-001 e WA-002 deployada!"
echo ""

print_warning "⚠️  IMPORTANTE:"
echo "   - Tokens nunca são expostos no client-side"
echo "   - Todas as mensagens são enviadas via servidor"
echo "   - Autenticação obrigatória via JWT"
echo ""

echo "📚 Documentação: WHATSAPP_SECURITY_FIX.md"
echo ""

# =========================================================
# 6. VERIFICAÇÃO DE SEGURANÇA
# =========================================================

print_info "Executando verificação de segurança..."
echo ""

# Verifica se não há tokens no build
if [ -d "dist" ]; then
    print_info "Verificando se não há tokens expostos no build..."

    if grep -r "EAA" dist/ 2>/dev/null | grep -v ".map"; then
        print_error "ATENÇÃO: Token WhatsApp encontrado no build!"
        print_warning "Isso NÃO deveria acontecer. Verifique o código."
        exit 1
    else
        print_success "Build seguro: Nenhum token encontrado"
    fi
else
    print_warning "Build não encontrado. Execute 'npm run build' para verificar segurança."
fi

echo ""
print_success "✅ Verificação de segurança concluída!"
echo ""

# Fim
exit 0

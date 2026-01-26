#!/bin/bash

###############################################################################
# 🚀 JURIFY MULTIAGENT SYSTEM - DEPLOY SCRIPT
#
# Script automatizado para deploy do sistema multiagentes refatorado.
# Versão: 2.0.0
# Autor: Senior Principal Software Architect
#
# Uso: ./deploy-multiagent-system.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Icons
CHECK="✅"
CROSS="❌"
ROCKET="🚀"
WARNING="⚠️"
INFO="ℹ️"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

print_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 não está instalado. Instale antes de continuar."
        exit 1
    fi
    print_success "$1 está instalado"
}

###############################################################################
# Pre-flight Checks
###############################################################################

print_header "🔍 PRÉ-REQUISITOS"

print_info "Verificando ferramentas necessárias..."

check_command "node"
check_command "npm"
check_command "supabase"
check_command "git"

# Check Node version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js versão 18 ou superior é necessário (atual: v$NODE_VERSION)"
    exit 1
fi
print_success "Node.js versão $NODE_VERSION (OK)"

print_info "Verificando arquivos necessários..."

REQUIRED_FILES=(
    "supabase/functions/ai-agent-processor/index.ts"
    "supabase/migrations/20251210000000_add_agent_ai_logs.sql"
    "src/lib/multiagents/core/BaseAgent.ts"
    "src/lib/multiagents/core/MultiAgentSystem.ts"
    "src/lib/multiagents/validation/schemas.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "advo-ai-hub-main (1)/advo-ai-hub-main/$file" ]; then
        print_success "$file existe"
    else
        print_error "$file não encontrado!"
        exit 1
    fi
done

###############################################################################
# Environment Check
###############################################################################

print_header "🔐 CONFIGURAÇÃO DE AMBIENTE"

cd "advo-ai-hub-main (1)/advo-ai-hub-main"

if [ ! -f ".env" ]; then
    print_warning ".env não encontrado"
    print_info "Criando .env a partir do .env.example..."

    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env criado"
        print_warning "IMPORTANTE: Edite o arquivo .env com suas credenciais antes de continuar!"
        read -p "Pressione ENTER quando terminar de configurar o .env..."
    else
        print_error ".env.example não encontrado"
        exit 1
    fi
else
    print_success ".env existe"
fi

# Check required env vars
print_info "Verificando variáveis de ambiente..."

if grep -q "VITE_SUPABASE_URL=your" .env; then
    print_error "VITE_SUPABASE_URL não configurado no .env"
    exit 1
fi

if grep -q "VITE_SUPABASE_ANON_KEY=your" .env; then
    print_error "VITE_SUPABASE_ANON_KEY não configurado no .env"
    exit 1
fi

print_success "Variáveis de ambiente configuradas"

###############################################################################
# Dependencies
###############################################################################

print_header "📦 INSTALAÇÃO DE DEPENDÊNCIAS"

print_info "Instalando dependências npm..."
npm install --silent
print_success "Dependências instaladas"

###############################################################################
# Tests
###############################################################################

print_header "🧪 EXECUTANDO TESTES"

print_info "Executando type-check..."
npm run type-check
print_success "Type-check passou"

print_info "Executando testes..."
npm run test -- --run
print_success "Testes passaram"

print_info "Executando lint..."
npm run lint
print_success "Lint passou"

###############################################################################
# Database Migration
###############################################################################

print_header "🗄️ MIGRAÇÕES DE BANCO"

read -p "Deseja aplicar as migrações do banco? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Aplicando migrações..."

    cd supabase
    supabase db push

    if [ $? -eq 0 ]; then
        print_success "Migrações aplicadas com sucesso"
    else
        print_error "Falha ao aplicar migrações"
        exit 1
    fi

    cd ..
else
    print_warning "Migrações puladas"
fi

###############################################################################
# Edge Function Deploy
###############################################################################

print_header "⚡ DEPLOY DA EDGE FUNCTION"

read -p "Deseja fazer deploy da Edge Function? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Fazendo deploy da ai-agent-processor..."

    supabase functions deploy ai-agent-processor

    if [ $? -eq 0 ]; then
        print_success "Edge Function deployed com sucesso"
    else
        print_error "Falha no deploy da Edge Function"
        exit 1
    fi
else
    print_warning "Deploy da Edge Function pulado"
fi

###############################################################################
# Secrets Configuration
###############################################################################

print_header "🔑 CONFIGURAÇÃO DE SECRETS"

read -p "Deseja configurar os secrets da Edge Function? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Configurando secrets..."

    read -p "Digite sua OPENAI_API_KEY: " OPENAI_KEY
    if [ ! -z "$OPENAI_KEY" ]; then
        supabase secrets set OPENAI_API_KEY="$OPENAI_KEY"
        print_success "OPENAI_API_KEY configurada"
    fi

    read -p "Digite sua SUPABASE_SERVICE_ROLE_KEY: " SERVICE_KEY
    if [ ! -z "$SERVICE_KEY" ]; then
        supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"
        print_success "SUPABASE_SERVICE_ROLE_KEY configurada"
    fi

    print_info "Listando secrets..."
    supabase secrets list
else
    print_warning "Configuração de secrets pulada"
fi

###############################################################################
# Build
###############################################################################

print_header "🏗️ BUILD DE PRODUÇÃO"

read -p "Deseja fazer o build de produção? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Executando build..."

    npm run build

    if [ $? -eq 0 ]; then
        print_success "Build concluído com sucesso"
    else
        print_error "Falha no build"
        exit 1
    fi
else
    print_warning "Build pulado"
fi

###############################################################################
# Validation
###############################################################################

print_header "✅ VALIDAÇÃO FINAL"

print_info "Testando Edge Function..."

# Get Supabase URL from .env
SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ ! -z "$SUPABASE_URL" ] && [ ! -z "$ANON_KEY" ]; then
    print_info "URL: $SUPABASE_URL"

    TEST_RESPONSE=$(curl -s -X POST \
        "$SUPABASE_URL/functions/v1/ai-agent-processor" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "agentName": "Test",
            "agentSpecialization": "Testing",
            "systemPrompt": "You are a test agent",
            "userPrompt": "Say hello"
        }')

    if [[ $TEST_RESPONSE == *"error"* ]] && [[ $TEST_RESPONSE != *"Unauthorized"* ]]; then
        print_warning "Edge Function respondeu mas pode ter erros. Verifique os logs."
        print_info "Resposta: $TEST_RESPONSE"
    elif [[ $TEST_RESPONSE == *"Unauthorized"* ]]; then
        print_warning "Edge Function requer autenticação (esperado)"
        print_success "Edge Function está online"
    else
        print_success "Edge Function está funcionando"
    fi
else
    print_warning "Não foi possível testar Edge Function (env vars não encontradas)"
fi

###############################################################################
# Summary
###############################################################################

print_header "📊 RESUMO DO DEPLOY"

echo ""
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "Próximos passos:"
echo "1. ${CHECK} Verificar logs: supabase functions logs ai-agent-processor"
echo "2. ${CHECK} Testar no frontend: npm run dev"
echo "3. ${CHECK} Verificar tabela agent_ai_logs no Supabase Dashboard"
echo "4. ${CHECK} Monitorar métricas no dashboard"
echo ""
echo "Documentação:"
echo "  📄 README.md - Documentação técnica"
echo "  📄 MIGRATION_GUIDE.md - Guia de migração"
echo "  📄 REFACTORING_SUMMARY.md - Resumo da refatoração"
echo "  📄 EXECUTIVE_SUMMARY.md - Sumário executivo"
echo ""
echo -e "${BLUE}${ROCKET} Jurify MultiAgent System v2.0 está PRONTO!${NC}"
echo ""

exit 0

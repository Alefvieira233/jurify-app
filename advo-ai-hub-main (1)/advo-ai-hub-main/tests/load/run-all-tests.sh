#!/bin/bash

# 🚀 Run All Load Tests Script
# Executa todos os testes de carga sequencialmente

set -e

echo "🚀 JURIFY LOAD TESTING SUITE"
echo "=============================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se k6 está instalado
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 não está instalado!${NC}"
    echo ""
    echo "Para instalar:"
    echo "  - Windows: choco install k6"
    echo "  - Mac: brew install k6"
    echo "  - Linux: sudo apt-get install k6"
    echo ""
    echo "Ou visite: https://k6.io/docs/get-started/installation/"
    exit 1
fi

echo -e "${GREEN}✅ k6 está instalado${NC}"
echo ""

# Carregar variáveis de ambiente do .env
if [ -f "../../.env" ]; then
    echo "📦 Carregando variáveis de ambiente..."
    export $(cat ../../.env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Variáveis carregadas${NC}"
else
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Usando valores padrão.${NC}"
fi

echo ""
echo "=============================="
echo ""

# Test 1: Health Check
echo -e "${YELLOW}🔍 TEST 1: Health Check${NC}"
echo "Target: 100 VUs por 30s"
echo ""
k6 run 01-health-check.js --out json=results-health-check.json
echo ""
echo -e "${GREEN}✅ Test 1 completed${NC}"
echo ""

# Pausa entre testes
sleep 5

# Test 2: Auth Stress
echo -e "${YELLOW}🔐 TEST 2: Authentication Stress${NC}"
echo "Target: 50 VUs por 2min"
echo ""
k6 run 02-auth-stress.js --out json=results-auth-stress.json
echo ""
echo -e "${GREEN}✅ Test 2 completed${NC}"
echo ""

# Pausa entre testes
sleep 5

# Test 3: AI Agents (opcional - custa dinheiro)
echo -e "${YELLOW}🤖 TEST 3: AI Agents Performance${NC}"
echo -e "${RED}⚠️  WARNING: Este teste consome tokens da OpenAI e gera custos!${NC}"
read -p "Deseja executar? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Target: 20 VUs por 3min"
    echo ""
    k6 run 03-ai-agents-performance.js --out json=results-ai-agents.json
    echo ""
    echo -e "${GREEN}✅ Test 3 completed${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping AI Agents test${NC}"
fi

echo ""
echo "=============================="
echo ""
echo -e "${GREEN}🎉 ALL TESTS COMPLETED!${NC}"
echo ""
echo "Resultados salvos em:"
echo "  - results-health-check.json"
echo "  - results-auth-stress.json"
echo "  - results-ai-agents.json (se executado)"
echo ""
echo "Para visualizar os resultados graficamente, use:"
echo "  k6 run --out influxdb=http://localhost:8086/k6 <test-file>.js"
echo ""

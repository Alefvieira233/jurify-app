#!/bin/bash

# 🔒 Script para configurar Git Hooks locais
# Detecta secrets antes de commitar

set -e

echo "🔒 Configurando Git Hooks para Jurify..."

# Criar pasta de hooks se não existir
mkdir -p .git/hooks

# ==========================================
# PRE-COMMIT HOOK
# ==========================================
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "🔍 Running pre-commit checks..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Detectar .env files
echo "🔍 Checking for .env files..."
if git diff --cached --name-only | grep -E '\.env$'; then
    echo -e "${RED}❌ ERROR: .env file detected!${NC}"
    echo "   .env files should NEVER be committed"
    echo "   Please remove it from staging: git reset HEAD .env"
    exit 1
fi

# 2. Detectar API keys comuns
echo "🔍 Scanning for API keys..."
if git diff --cached | grep -E "(sk-[a-zA-Z0-9]{48}|AKIA[A-Z0-9]{16}|AIza[a-zA-Z0-9_-]{35})"; then
    echo -e "${RED}❌ ERROR: Potential API key detected!${NC}"
    echo "   Please remove API keys from code"
    echo "   Use environment variables instead"
    exit 1
fi

# 3. Detectar senhas óbvias
echo "🔍 Checking for hardcoded passwords..."
if git diff --cached | grep -iE "(password|senha|pwd)\s*=\s*['\"][^'\"]{3,}['\"]"; then
    echo -e "${YELLOW}⚠️  WARNING: Possible hardcoded password detected!${NC}"
    echo "   Please review your changes"
fi

# 4. TypeScript check (se tsc estiver disponível)
if command -v npm &> /dev/null; then
    echo "🔍 Running TypeScript check..."
    npm run type-check || {
        echo -e "${RED}❌ TypeScript errors found${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✅ Pre-commit checks passed!${NC}"
exit 0
EOF

# Tornar hook executável
chmod +x .git/hooks/pre-commit

# ==========================================
# COMMIT-MSG HOOK
# ==========================================
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash

commit_msg_file=$1
commit_msg=$(cat "$commit_msg_file")

# Verificar se segue conventional commits (opcional mas recomendado)
if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{3,}"; then
    echo "⚠️  Commit message não segue Conventional Commits"
    echo "   Recomendado: feat|fix|docs|chore: descrição"
    echo "   Exemplo: feat: add user authentication"
    echo ""
    echo "   Permitindo mesmo assim..."
fi

# Bloquear commits com mensagens muito curtas
if [ ${#commit_msg} -lt 10 ]; then
    echo "❌ Commit message muito curta (mínimo 10 caracteres)"
    exit 1
fi

exit 0
EOF

chmod +x .git/hooks/commit-msg

echo "✅ Git hooks configurados com sucesso!"
echo ""
echo "Hooks instalados:"
echo "  - pre-commit: Detecta secrets e roda type-check"
echo "  - commit-msg: Valida mensagens de commit"
echo ""
echo "Para desabilitar temporariamente: git commit --no-verify"

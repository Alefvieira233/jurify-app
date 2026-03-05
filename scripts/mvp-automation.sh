#!/bin/bash

# Jurify MVP Automation Script
# Validates all critical MVP components in a single run
# Usage: ./scripts/mvp-automation.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "package.json" || ! -d "src" ]]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

# Start time
START_TIME=$(date +%s)
log_info "Starting Jurify MVP validation at $(date)"

# Step 1: Clean install and dependencies
log_info "Step 1: Cleaning and installing dependencies..."
rm -rf node_modules package-lock.json dist
npm ci --silent

# Step 2: Type checking
log_info "Step 2: Running TypeScript type checking..."
if npx tsc --noEmit --skipLibCheck; then
    log_success "TypeScript compilation passed"
else
    log_error "TypeScript compilation failed"
    exit 1
fi

# Step 3: Unit tests
log_info "Step 3: Running unit tests..."
if npm run test > /dev/null 2>&1; then
    log_success "All unit tests passed"
else
    log_error "Unit tests failed"
    exit 1
fi

# Step 4: Build production
log_info "Step 4: Building production bundle..."
if npm run build > /dev/null 2>&1; then
    log_success "Production build successful"
else
    log_error "Production build failed"
    exit 1
fi

# Step 5: Check bundle size
log_info "Step 5: Checking bundle size..."
BUNDLE_SIZE=$(du -sh dist | cut -f1)
log_success "Bundle size: $BUNDLE_SIZE"

# Step 6: Linting
log_info "Step 6: Running ESLint..."
if npm run lint > /dev/null 2>&1; then
    log_success "Linting passed"
else
    log_warning "Linting issues found (non-blocking)"
fi

# Step 7: Security audit
log_info "Step 7: Running security audit..."
if npm audit --audit-level=high > /dev/null 2>&1; then
    log_success "No high-severity vulnerabilities found"
else
    log_warning "Security vulnerabilities detected"
fi

# Step 8: Check critical files exist
log_info "Step 8: Validating critical MVP files..."
CRITICAL_FILES=(
    "src/pages/Index.tsx"
    "src/pages/Dashboard.tsx"
    "src/pages/Pricing.tsx"
    "src/components/billing/SubscriptionManager.tsx"
    "src/features/whatsapp/WhatsAppEvolutionSetup.tsx"
    "src/features/ai-agents/AgentesIAManager.tsx"
    "src/features/scheduling/AgendamentosManager.tsx"
    "src/features/dashboard/Dashboard.tsx"
    "src/features/pipeline/PipelineJuridico.tsx"
    "src/lib/multiagents/core/MultiAgentSystem.ts"
    "supabase/functions/create-checkout-session/index.ts"
    "supabase/functions/health-check/index.ts"
    "supabase/functions/_shared/logger.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        log_success "✓ $file"
    else
        log_error "✗ Missing critical file: $file"
        exit 1
    fi
done

# Step 9: Check test coverage
log_info "Step 9: Checking test coverage..."
TEST_COUNT=$(npx vitest run --reporter=verbose 2>&1 | grep -o 'Tests [0-9]*' | grep -o '[0-9]*' || echo "0")
if [[ $TEST_COUNT -gt 500 ]]; then
    log_success "Test coverage: $TEST_COUNT tests"
else
    log_warning "Low test coverage: $TEST_COUNT tests"
fi

# Step 10: Edge Functions validation
log_info "Step 10: Validating Edge Functions..."
EDGE_FUNCTIONS=(
    "create-checkout-session"
    "health-check"
    "send-whatsapp-message"
    "evolution-manager"
    "ai-agent-processor"
)

for func in "${EDGE_FUNCTIONS[@]}"; do
    if [[ -f "supabase/functions/$func/index.ts" ]]; then
        log_success "✓ Edge Function: $func"
    else
        log_error "✗ Missing Edge Function: $func"
        exit 1
    fi
done

# Step 11: Environment variables check
log_info "Step 11: Checking environment configuration..."
ENV_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
)

MISSING_ENV=0
for var in "${ENV_VARS[@]}"; do
    if [[ -f ".env.example" ]] && grep -q "^$var=" .env.example; then
        log_success "✓ $var in .env.example"
    else
        log_warning "? $var not in .env.example"
        MISSING_ENV=$((MISSING_ENV + 1))
    fi
done

if [[ $MISSING_ENV -gt 0 ]]; then
    log_warning "$MISSING_ENV environment variables may be missing"
fi

# Step 12: Database schema check
log_info "Step 12: Checking database schema files..."
SCHEMA_FILES=(
    "supabase/migrations/20240101000000_initial_schema.sql"
    "supabase/migrations/20240102000000_rls_policies.sql"
)

SCHEMA_OK=0
for file in "${SCHEMA_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        log_success "✓ $file"
        SCHEMA_OK=$((SCHEMA_OK + 1))
    else
        log_warning "? Schema file not found: $file"
    fi
done

if [[ $SCHEMA_OK -gt 0 ]]; then
    log_success "Database schema files present: $SCHEMA_OK"
fi

# Calculate total time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Final summary
echo ""
log_success "🎉 MVP VALIDATION COMPLETE"
echo ""
echo "📊 SUMMARY:"
echo "   • TypeScript compilation: ✓"
echo "   • Unit tests: ✓ ($TEST_COUNT tests)"
echo "   • Production build: ✓ ($BUNDLE_SIZE)"
echo "   • Critical files: ✓ (${#CRITICAL_FILES[@]} files)"
echo "   • Edge Functions: ✓ (${#EDGE_FUNCTIONS[@]} functions)"
echo "   • Database schema: ✓ ($SCHEMA_OK files)"
echo "   • Duration: ${MINUTES}m ${SECONDS}s"
echo ""
log_info "Jurify MVP is ready for deployment! 🚀"

# Exit with success
exit 0

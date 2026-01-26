Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  🚀 JURIFY - MASTER DEPLOYMENT SYSTEM" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Setup Environment
$env:SUPABASE_ACCESS_TOKEN = "sbp_b292e7b2bea28a0fe6e2e2cbe3e6b8a92148a41e"
$PROJECT_REF = "yfxgncbopvnsltjqetxw"

Write-Host "1. Linking Project [$PROJECT_REF]..." -ForegroundColor Yellow
npx supabase link --project-ref $PROJECT_REF

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error linking project!" -ForegroundColor Red
    exit 1
}

# 2. Database Migrations
Write-Host ""
Write-Host "2. Pushing Database Migrations (Include All)..." -ForegroundColor Yellow
npx supabase db push --include-all

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error pushing migrations!" -ForegroundColor Red
    exit 1
}

# 3. Edge Functions
Write-Host ""
Write-Host "3. Deploying Edge Functions..." -ForegroundColor Yellow

$functions = @(
    "ai-agent-processor",
    "whatsapp-webhook",
    "create-checkout-session",
    "generate-document"
)

foreach ($func in $functions) {
    Write-Host "   > Deploying $func..." -ForegroundColor Cyan
    npx supabase functions deploy $func --no-verify-jwt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Error deploying $func" -ForegroundColor Red
    }
}

# 4. Secrets Configuration
Write-Host ""
Write-Host "4. Configuring Production Secrets..." -ForegroundColor Yellow

# Note: In a real CI/CD, these would come from the environment.
# Here we set placeholders or critical known keys.
# The user should verify these in the dashboard.

# Example: Sentry DSN (Prompt or set if known)
# npx supabase secrets set SENTRY_DSN=...

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "👉 Verify your project at: https://supabase.com/dashboard/project/$PROJECT_REF"
Write-Host ""
Read-Host "Press Enter to exit"

# Deploy final do whatsapp-webhook (auditoria 2026-05-25)
# Os outros 4 edge functions modificados (transcribe/sentiment/summarize/extract)
# já foram deployados via MCP. Este script deploya apenas a função restante
# (process-message.ts com handoff + tool transfer_to_agent + gate parser).
#
# Uso:
#   $env:SUPABASE_ACCESS_TOKEN = "<seu-token-do-dashboard-supabase>"
#   .\scripts\deploy-whatsapp-webhook.ps1
#
# Token: https://supabase.com/dashboard/account/tokens

$ErrorActionPreference = 'Stop'

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "ERRO: defina SUPABASE_ACCESS_TOKEN antes de rodar." -ForegroundColor Red
  Write-Host "Pegue um token em: https://supabase.com/dashboard/account/tokens"
  Write-Host 'Depois rode: $env:SUPABASE_ACCESS_TOKEN = "sbp_xxx..."'
  exit 1
}

Write-Host "Deployando whatsapp-webhook em yfxgncbopvnsltjqetxw..." -ForegroundColor Cyan
supabase functions deploy whatsapp-webhook `
  --project-ref yfxgncbopvnsltjqetxw `
  --no-verify-jwt `
  --use-api

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "✓ whatsapp-webhook deployado com sucesso." -ForegroundColor Green
  Write-Host "Mudanças ativas em prod:"
  Write-Host "  - P0-1: detecção de intent de transferência na mensagem do LEAD"
  Write-Host "  - P0-2: tool transfer_to_agent + executor + short-circuit"
  Write-Host "  - P0-5: gate parser legacy por aiUsedSchedulingTool/aiUsedTransferTool"
  Write-Host "  - P0-6: agent_executions await + try/catch"
} else {
  Write-Host "Deploy falhou. Verifique erros acima." -ForegroundColor Red
  exit 1
}

# Runbook: Monitoramento do Jurify

## Dashboards e Ferramentas

| Ferramenta | URL | Uso |
|---|---|---|
| Sentry | https://sentry.io | Erros e alertas de produção |
| Supabase Dashboard | https://app.supabase.com | DB, Edge Functions, Auth |
| Vercel Dashboard | https://vercel.com | Frontend, builds, logs |
| Stripe Dashboard | https://dashboard.stripe.com | Pagamentos, webhooks |
| Postmark | https://account.postmarkapp.com | Emails enviados/bounced |

---

## Alertas Configurados no Sentry

### Alertas de Agentes IA
- **`captureAgentError`** — Qualquer erro não tratado em agente → alerta imediato (severity: error)
- **`reportSlowAgent`** — Tempo de resposta > 10s → alerta warning
- **`reportHighAgentFailureRate`** — Taxa de falha > 5% por tenant → alerta error

### Como criar alerta no Sentry Dashboard
1. Sentry → Alerts → Create Alert Rule
2. Selecionar: "Issues" (para erros) ou "Metric Alerts" (para performance)
3. Filtrar por tag: `agent.name` ou `alert.type`
4. Configurar notificação: email, Slack ou webhook

---

## Health Checks

### Verificação manual completa
```bash
# 1. Health check da plataforma
curl https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer <ANON_KEY>"

# 2. Verificar Evolution API
curl https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/evolution-manager \
  -X POST \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'

# 3. Verificar cleanup de memória (execução manual)
curl -X POST https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/cleanup-agent-memory \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Métricas Chave para Monitorar

### Banco de Dados
```sql
-- Execuções de agentes nas últimas 24h
SELECT
  status,
  COUNT(*) as total,
  AVG(tempo_execucao) as avg_tempo_s,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tempo_execucao) as p95_tempo_s
FROM logs_execucao_agentes
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Taxa de falha por agente (último 7 dias)
SELECT
  agente_id,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as erros,
  ROUND(
    100.0 * SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as taxa_falha_pct
FROM logs_execucao_agentes
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY agente_id
ORDER BY taxa_falha_pct DESC;

-- MRR atual
SELECT
  plan_id,
  COUNT(*) as assinaturas,
  status
FROM subscriptions
WHERE status = 'active'
GROUP BY plan_id, status;

-- Memória expirada pendente de limpeza
SELECT COUNT(*) as pendente_limpeza
FROM agent_memory
WHERE expires_at IS NOT NULL AND expires_at < NOW();

-- Top erros recentes
SELECT erro_detalhes, COUNT(*) as freq
FROM logs_execucao_agentes
WHERE status = 'error'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND erro_detalhes IS NOT NULL
GROUP BY erro_detalhes
ORDER BY freq DESC
LIMIT 10;
```

---

## Rotina Diária (5 min)

1. Verificar Sentry → 0 novos alertas críticos
2. Verificar Supabase → Edge Functions logs (últimas 24h)
3. Verificar Stripe → Webhooks (0 falhas)
4. Verificar Postmark → Bounce rate < 2%

## Rotina Semanal (15 min)

1. Executar queries de métricas acima
2. Verificar crescimento de `agent_memory` (cleanup rodando?)
3. Revisar taxa de falha dos agentes
4. Verificar MRR vs meta no Dashboard

---

## SLAs de Referência

| Componente | Uptime alvo | Tempo de resposta alvo |
|---|---|---|
| Frontend (Vercel) | 99.9% | < 2s |
| Edge Functions | 99.5% | < 5s |
| Agentes IA | 99% | < 10s |
| Evolution API | 98% | < 3s |
| Banco (Supabase) | 99.9% | < 500ms |

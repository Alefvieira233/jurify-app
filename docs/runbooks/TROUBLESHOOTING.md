# Runbook: Troubleshooting Jurify

## Diagnóstico Rápido

### Dashboard com erro 400
**Causa:** Query com coluna inexistente no Supabase.
**Fix:** Verificar se a coluna selecionada existe na tabela.
```sql
-- Inspecionar colunas de uma tabela
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'logs_execucao_agentes';
```
> Nota: a tabela `logs_execucao_agentes` usa `agente_id` como identificador, não `id`.

---

### Edge Function retornando "non-2xx status code"
**Causa:** Edge Function retornando 400/500 com erro no body que o SDK não expõe.
**Diagnóstico:**
```bash
# Ver logs da function
supabase functions logs evolution-manager --project-ref yfxgncbopvnsltjqetxw

# Testar diretamente via curl
curl -X POST https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/evolution-manager \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
```

---

### QR Code WhatsApp não gera
**Passos de diagnóstico:**
1. Verificar se `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` estão nos Secrets do Supabase
2. Testar acesso à Evolution API:
```bash
curl -H "apikey: <EVOLUTION_API_KEY>" <EVOLUTION_API_URL>/instance/fetchInstances
```
3. Verificar logs da `evolution-manager`:
```bash
supabase functions logs evolution-manager --project-ref yfxgncbopvnsltjqetxw
```
4. Se Evolution API inacessível, verificar container Docker na VPS:
```bash
docker ps | grep evolution
docker logs evolution-api --tail 50
```

---

### Agentes IA não processam leads
**Passos de diagnóstico:**
1. Verificar se `OPENAI_API_KEY` está configurado nos Secrets
2. Verificar logs da `ai-agent-processor`:
```bash
supabase functions logs ai-agent-processor --project-ref yfxgncbopvnsltjqetxw
```
3. Verificar tabela de execuções no banco:
```sql
SELECT agente_id, status, erro_detalhes, created_at
FROM logs_execucao_agentes
ORDER BY created_at DESC
LIMIT 20;
```
4. Testar agente manualmente via UI: Agentes IA → Testar

---

### Pagamento Stripe não reflete no plano
**Passos:**
1. Verificar webhook no Dashboard Stripe → Developers → Webhooks
2. Verificar se `STRIPE_WEBHOOK_SECRET` está correto nos Secrets
3. Ver logs do webhook:
```bash
supabase functions logs stripe-webhook --project-ref yfxgncbopvnsltjqetxw
```
4. Verificar tabela `subscriptions`:
```sql
SELECT user_id, status, plan_id, updated_at
FROM subscriptions
ORDER BY updated_at DESC
LIMIT 10;
```
5. Se necessário, reprocessar evento manualmente via Stripe Dashboard

---

### Email de boas-vindas não chega
**Passos:**
1. Verificar se `POSTMARK_SERVER_TOKEN` está configurado
2. Testar a function diretamente:
```bash
curl -X POST https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@email.com","template":"welcome","data":{"name":"Teste"}}'
```
3. Verificar logs:
```bash
supabase functions logs send-email --project-ref yfxgncbopvnsltjqetxw
```
4. Verificar Activity Log no Postmark Dashboard

---

### MRR no Dashboard zerado
**Passos:**
1. Verificar se existem assinaturas ativas:
```sql
SELECT count(*), plan_id, status
FROM subscriptions
GROUP BY plan_id, status;
```
2. Se status não é `active`, verificar integração Stripe
3. Verificar se `PLAN_PRICES` no `useMRR.ts` corresponde aos planos reais

---

### Memory leak de agent_memory
**Verificar registros expirados:**
```sql
SELECT count(*) FROM agent_memory WHERE expires_at < NOW();
```
**Executar limpeza manual:**
```bash
curl -X POST https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/cleanup-agent-memory \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### Multi-tenant data leaking (CRÍTICO)
**Se suspeitar de vazamento de dados entre tenants:**
1. Verificar políticas RLS imediatamente:
```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```
2. Verificar se RLS está habilitado em todas as tabelas críticas:
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND NOT relrowsecurity;
```
3. Escalar para equipe de segurança imediatamente se confirmado

---

## Contatos de Escalação

| Problema | Responsável |
|---|---|
| Infraestrutura VPS | DevOps |
| Stripe billing | Financeiro + DevOps |
| Vazamento de dados | Segurança (URGENTE) |
| OpenAI quota excedida | DevOps |
| Supabase downtime | Verificar status.supabase.com |

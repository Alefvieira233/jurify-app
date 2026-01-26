
-- Atualizar URL do webhook N8N para produção
UPDATE public.n8n_workflows 
SET webhook_url = 'https://primary-production-adcb.up.railway.app/webhook/Agente Jurify',
    updated_at = now()
WHERE nome = 'Agente Jurify Principal' 
   OR webhook_url LIKE '%webhook-test%';

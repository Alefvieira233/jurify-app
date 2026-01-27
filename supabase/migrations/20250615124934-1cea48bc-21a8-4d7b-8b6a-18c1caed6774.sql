
-- Criar tabela para workflows do N8N
CREATE TABLE IF NOT EXISTS public.n8n_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  api_key TEXT,
  ativo BOOLEAN DEFAULT true,
  tipo_workflow TEXT DEFAULT 'agente_ia',
  descricao TEXT,
  parametros_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.n8n_workflows ENABLE ROW LEVEL SECURITY;

-- Política para visualizar workflows (usuários autenticados)
CREATE POLICY "Users can view n8n workflows" ON public.n8n_workflows
  FOR SELECT USING (true);

-- Política para inserir workflows (usuários autenticados)
CREATE POLICY "Users can create n8n workflows" ON public.n8n_workflows
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política para atualizar workflows (usuários autenticados)
CREATE POLICY "Users can update n8n workflows" ON public.n8n_workflows
  FOR UPDATE USING (true);

-- Política para deletar workflows (usuários autenticados)
CREATE POLICY "Users can delete n8n workflows" ON public.n8n_workflows
  FOR DELETE USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_n8n_workflows_updated_at
  BEFORE UPDATE ON public.n8n_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir workflow padrão do Jurify
INSERT INTO public.n8n_workflows (nome, webhook_url, tipo_workflow, descricao, ativo)
VALUES (
  'Agente Jurify Principal',
  'https://primary-production-adcb.up.railway.app/webhook-test/Agente%20Jurify',
  'agente_ia',
  'Webhook principal para execução de agentes IA do Jurify',
  true
) ON CONFLICT DO NOTHING;

-- Adicionar coluna para tracking de N8N nos logs de execução
ALTER TABLE public.logs_execucao_agentes 
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS n8n_response JSONB,
ADD COLUMN IF NOT EXISTS n8n_error TEXT,
ADD COLUMN IF NOT EXISTS n8n_status TEXT DEFAULT 'pending';

-- ============================================
-- CRIAR TABELA: whatsapp_conversations
-- ============================================
-- Execução: Cole este SQL no SQL Editor do Supabase
-- Problema resolvido: relation 'public.whatsapp_conversations' does not exist
-- ============================================

CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamentos
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Dados do Contato
  phone_number TEXT NOT NULL,
  contact_name TEXT,

  -- Status da Conversa
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'aguardando', 'qualificado', 'finalizado')),
  area_juridica TEXT,

  -- Última Mensagem (cache para performance)
  last_message TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contadores
  unread_count INTEGER NOT NULL DEFAULT 0,

  -- IA Configuration
  ia_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant_id
  ON public.whatsapp_conversations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_lead_id
  ON public.whatsapp_conversations(lead_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_id
  ON public.whatsapp_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone_number
  ON public.whatsapp_conversations(phone_number);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status
  ON public.whatsapp_conversations(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at
  ON public.whatsapp_conversations(last_message_at DESC);

-- ============================================
-- TRIGGER: updated_at automático
-- ============================================

CREATE OR REPLACE FUNCTION update_whatsapp_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_conversations_updated_at();

-- ============================================
-- RLS (Row Level Security) - HABILITADO
-- ============================================

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários veem apenas conversas do seu tenant
CREATE POLICY "Users can view conversations from their tenant"
  ON public.whatsapp_conversations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem inserir conversas no seu tenant
CREATE POLICY "Users can insert conversations in their tenant"
  ON public.whatsapp_conversations
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem atualizar conversas do seu tenant
CREATE POLICY "Users can update conversations from their tenant"
  ON public.whatsapp_conversations
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem deletar conversas do seu tenant
CREATE POLICY "Users can delete conversations from their tenant"
  ON public.whatsapp_conversations
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- CONCLUÍDO!
-- ============================================

-- Verificar se tabela foi criada
SELECT 'whatsapp_conversations criada com sucesso!' AS status;

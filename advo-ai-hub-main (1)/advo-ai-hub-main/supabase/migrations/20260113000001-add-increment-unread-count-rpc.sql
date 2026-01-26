-- ✅ CORREÇÃO: Função RPC para incremento atômico de unread_count
-- Migration criada em: 2026-01-13
-- Objetivo: Corrigir bug de unread_count que sempre resetava para 1

-- Criar função para incrementar unread_count de forma atômica
CREATE OR REPLACE FUNCTION increment_unread_count(conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE whatsapp_conversations
  SET unread_count = COALESCE(unread_count, 0) + 1,
      updated_at = NOW()
  WHERE id = conversation_id;
END;
$$;

-- Adicionar comentário para documentação
COMMENT ON FUNCTION increment_unread_count IS 'Incrementa atomicamente o contador de mensagens não lidas de uma conversa WhatsApp';

-- Conceder permissão para execução autenticada
GRANT EXECUTE ON FUNCTION increment_unread_count TO authenticated;
GRANT EXECUTE ON FUNCTION increment_unread_count TO service_role;

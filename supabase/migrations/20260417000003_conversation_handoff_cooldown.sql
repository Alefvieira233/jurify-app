-- ============================================================================
-- Handoff cooldown em whatsapp_conversations
-- ============================================================================
-- Problema: o auto-reactivate de IA (ver process-message.ts) reabre uma
-- conversa em handoff humano após 2h de inatividade. Em conversas sensíveis
-- (cliente em crise, dúvida jurídica complexa, reclamação formal) isso
-- atropela o atendimento humano em curso.
--
-- Solução: nova coluna `handoff_until TIMESTAMPTZ NULL`. Quando o handoff é
-- disparado pelo regex em process-message.ts, escrevemos
--   handoff_until = NOW() + INTERVAL '24 hours'
-- e o auto-reactivate só pode reabrir se `handoff_until IS NULL OR
-- handoff_until < NOW()`. Humano pode limpar o campo via UI/endpoint
-- (fora de escopo desta migration).
-- ============================================================================

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS handoff_until TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.whatsapp_conversations.handoff_until IS
  'Cooldown até quando IA não pode ser reativada automaticamente após handoff humano. NULL = sem cooldown ativo.';

-- Index parcial para queries de polling/admin (raras hoje, mas preparadas).
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_handoff_until
  ON public.whatsapp_conversations (handoff_until)
  WHERE handoff_until IS NOT NULL;

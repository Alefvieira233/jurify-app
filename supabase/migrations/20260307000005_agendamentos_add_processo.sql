-- Migration: agendamentos_add_processo
-- Adiciona campo processo_id na tabela agendamentos (migração aditiva)

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS processo_id UUID REFERENCES public.processos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_processo
  ON public.agendamentos(processo_id) WHERE processo_id IS NOT NULL;

-- ============================================
-- CRM Operacional: Departamentos Expansion
-- ============================================

-- Expand departamentos with default responsavel + AI agent
ALTER TABLE public.departamentos ADD COLUMN IF NOT EXISTS responsavel_padrao_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.departamentos ADD COLUMN IF NOT EXISTS agente_ia_padrao_id UUID;

-- Expand departamento_membros with granular operational permissions
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_ver_todos_leads BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_atribuir_responsavel BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_mover_leads BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_editar_propriedades BOOLEAN DEFAULT true;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_arquivar BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_ver_metricas BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_gerenciar BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS receber_notificacoes BOOLEAN DEFAULT true;

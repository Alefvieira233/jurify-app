-- Migration: CRM Connections Foundation
-- Creates departamentos, departamento_membros, conexoes_whatsapp, conexoes_logs, conexoes_alertas
-- Alters leads and logs_atividades for archive + department support
-- Adds RLS policies, indexes, and updated_at triggers

-- ============================================================================
-- 1. departamentos
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#6b7280',
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, nome)
);

-- ============================================================================
-- 2. departamento_membros
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.departamento_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_no_depto TEXT DEFAULT 'membro',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(departamento_id, profile_id)
);

-- ============================================================================
-- 3. conexoes_whatsapp
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conexoes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  tipo TEXT NOT NULL DEFAULT 'evolution' CHECK (tipo IN ('evolution', 'oficial', 'cloud_api')),
  provider TEXT NOT NULL DEFAULT 'evolution_api',
  instance_name TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN (
    'idle', 'pending_qr', 'qr_generated', 'qr_scanned', 'authenticating',
    'connected', 'disconnected', 'expired', 'error'
  )),
  status_padrao TEXT,
  departamento_id UUID REFERENCES public.departamentos(id) ON DELETE SET NULL,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  last_heartbeat TIMESTAMPTZ,
  last_sync TIMESTAMPTZ,
  last_error TEXT,
  reconnect_attempts INT DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. conexoes_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conexoes_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conexao_id UUID NOT NULL REFERENCES public.conexoes_whatsapp(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  evento TEXT NOT NULL,
  severidade TEXT NOT NULL DEFAULT 'info' CHECK (severidade IN ('debug', 'info', 'warning', 'error', 'critical')),
  descricao TEXT,
  origem TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. conexoes_alertas
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conexoes_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conexao_id UUID NOT NULL REFERENCES public.conexoes_whatsapp(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('desconexao', 'qr_expirado', 'falha_reconexao', 'erro_autenticacao', 'instabilidade', 'falha_envio')),
  mensagem TEXT NOT NULL,
  severidade TEXT NOT NULL DEFAULT 'warning' CHECK (severidade IN ('info', 'warning', 'error', 'critical')),
  lido BOOLEAN DEFAULT false,
  resolvido BOOLEAN DEFAULT false,
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. ALTER leads — archive + department columns
-- ============================================================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES public.departamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS arquivado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_arquivamento TEXT,
  ADD COLUMN IF NOT EXISTS data_reativacao_prevista DATE,
  ADD COLUMN IF NOT EXISTS arquivado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proximo_responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- 7. ALTER logs_atividades — enrich for audit
-- ============================================================================
ALTER TABLE public.logs_atividades
  ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES public.departamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dados_anteriores JSONB,
  ADD COLUMN IF NOT EXISTS dados_novos JSONB;

-- ============================================================================
-- 8. Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_departamentos_tenant ON public.departamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_depto_membros_profile ON public.departamento_membros(profile_id);
CREATE INDEX IF NOT EXISTS idx_depto_membros_depto ON public.departamento_membros(departamento_id);
CREATE INDEX IF NOT EXISTS idx_leads_departamento ON public.leads(tenant_id, departamento_id);
CREATE INDEX IF NOT EXISTS idx_leads_arquivado ON public.leads(tenant_id, arquivado_em) WHERE arquivado_em IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conexoes_whatsapp_tenant ON public.conexoes_whatsapp(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conexoes_logs_conexao ON public.conexoes_logs(conexao_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conexoes_logs_tenant ON public.conexoes_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conexoes_alertas_conexao ON public.conexoes_alertas(conexao_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conexoes_alertas_tenant_unread ON public.conexoes_alertas(tenant_id) WHERE lido = false;

-- ============================================================================
-- 9. RLS Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamento_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conexoes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conexoes_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conexoes_alertas ENABLE ROW LEVEL SECURITY;

-- ---- departamentos ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'departamentos_select' AND tablename = 'departamentos') THEN
    CREATE POLICY departamentos_select ON public.departamentos
      FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'departamentos_insert' AND tablename = 'departamentos') THEN
    CREATE POLICY departamentos_insert ON public.departamentos
      FOR INSERT WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'departamentos_update' AND tablename = 'departamentos') THEN
    CREATE POLICY departamentos_update ON public.departamentos
      FOR UPDATE USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'departamentos_delete' AND tablename = 'departamentos') THEN
    CREATE POLICY departamentos_delete ON public.departamentos
      FOR DELETE USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
      );
  END IF;
END $$;

-- ---- departamento_membros ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'depto_membros_select' AND tablename = 'departamento_membros') THEN
    CREATE POLICY depto_membros_select ON public.departamento_membros
      FOR SELECT USING (
        departamento_id IN (
          SELECT id FROM public.departamentos
          WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'depto_membros_insert' AND tablename = 'departamento_membros') THEN
    CREATE POLICY depto_membros_insert ON public.departamento_membros
      FOR INSERT WITH CHECK (
        departamento_id IN (
          SELECT id FROM public.departamentos
          WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'depto_membros_update' AND tablename = 'departamento_membros') THEN
    CREATE POLICY depto_membros_update ON public.departamento_membros
      FOR UPDATE USING (
        departamento_id IN (
          SELECT id FROM public.departamentos
          WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'depto_membros_delete' AND tablename = 'departamento_membros') THEN
    CREATE POLICY depto_membros_delete ON public.departamento_membros
      FOR DELETE USING (
        departamento_id IN (
          SELECT id FROM public.departamentos
          WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
      );
  END IF;
END $$;

-- ---- conexoes_whatsapp ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conexoes_whatsapp_select' AND tablename = 'conexoes_whatsapp') THEN
    CREATE POLICY conexoes_whatsapp_select ON public.conexoes_whatsapp
      FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conexoes_whatsapp_insert' AND tablename = 'conexoes_whatsapp') THEN
    CREATE POLICY conexoes_whatsapp_insert ON public.conexoes_whatsapp
      FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conexoes_whatsapp_update' AND tablename = 'conexoes_whatsapp') THEN
    CREATE POLICY conexoes_whatsapp_update ON public.conexoes_whatsapp
      FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conexoes_whatsapp_delete' AND tablename = 'conexoes_whatsapp') THEN
    CREATE POLICY conexoes_whatsapp_delete ON public.conexoes_whatsapp
      FOR DELETE USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ---- conexoes_logs ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conexoes_logs_select' AND tablename = 'conexoes_logs') THEN
    CREATE POLICY conexoes_logs_select ON public.conexoes_logs
      FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conexoes_logs_insert' AND tablename = 'conexoes_logs') THEN
    CREATE POLICY conexoes_logs_insert ON public.conexoes_logs
      FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ---- conexoes_alertas ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conexoes_alertas_select' AND tablename = 'conexoes_alertas') THEN
    CREATE POLICY conexoes_alertas_select ON public.conexoes_alertas
      FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conexoes_alertas_insert' AND tablename = 'conexoes_alertas') THEN
    CREATE POLICY conexoes_alertas_insert ON public.conexoes_alertas
      FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conexoes_alertas_update' AND tablename = 'conexoes_alertas') THEN
    CREATE POLICY conexoes_alertas_update ON public.conexoes_alertas
      FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- 10. updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_departamentos_updated_at') THEN
    CREATE TRIGGER trg_departamentos_updated_at
      BEFORE UPDATE ON public.departamentos
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conexoes_whatsapp_updated_at') THEN
    CREATE TRIGGER trg_conexoes_whatsapp_updated_at
      BEFORE UPDATE ON public.conexoes_whatsapp
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

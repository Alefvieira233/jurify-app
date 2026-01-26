-- ========================================
-- 🔒 SCRIPT COMPLETO DE SEGURANÇA RLS - VERSÃO CORRIGIDA
-- ========================================
-- Execute este script no Supabase SQL Editor
-- ========================================

-- ========================================
-- PARTE 1: ADICIONAR tenant_id NAS TABELAS PRINCIPAIS
-- ========================================

-- Leads
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN tenant_id UUID;
        CREATE INDEX idx_leads_tenant_id ON public.leads(tenant_id);
        RAISE NOTICE 'tenant_id adicionado em leads';
    END IF;
END $$;

-- Contratos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'contratos' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.contratos ADD COLUMN tenant_id UUID;
        CREATE INDEX idx_contratos_tenant_id ON public.contratos(tenant_id);
        RAISE NOTICE 'tenant_id adicionado em contratos';
    END IF;
END $$;

-- Agendamentos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'agendamentos' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.agendamentos ADD COLUMN tenant_id UUID;
        CREATE INDEX idx_agendamentos_tenant_id ON public.agendamentos(tenant_id);
        RAISE NOTICE 'tenant_id adicionado em agendamentos';
    END IF;
END $$;

-- Agentes IA
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'agentes_ia' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.agentes_ia ADD COLUMN tenant_id UUID;
        CREATE INDEX idx_agentes_ia_tenant_id ON public.agentes_ia(tenant_id);
        RAISE NOTICE 'tenant_id adicionado em agentes_ia';
    END IF;
END $$;

-- Logs de Execução
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'logs_execucao_agentes' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.logs_execucao_agentes ADD COLUMN tenant_id UUID;
        CREATE INDEX idx_logs_execucao_tenant_id ON public.logs_execucao_agentes(tenant_id);
        RAISE NOTICE 'tenant_id adicionado em logs_execucao_agentes';
    END IF;
END $$;

-- Notificações
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notificacoes' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.notificacoes ADD COLUMN tenant_id UUID;
        CREATE INDEX idx_notificacoes_tenant_id ON public.notificacoes(tenant_id);
        RAISE NOTICE 'tenant_id adicionado em notificacoes';
    END IF;
END $$;

-- ========================================
-- PARTE 2: GARANTIR QUE PROFILES TEM tenant_id E role
-- ========================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid();
        CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);
        RAISE NOTICE 'tenant_id adicionado em profiles';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'advogado';
        RAISE NOTICE 'role adicionado em profiles';
    END IF;
END $$;

-- ========================================
-- PARTE 3: CRIAR TABELA user_permissions SE NÃO EXISTIR
-- ========================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, resource, action, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_tenant ON public.user_permissions(tenant_id);

-- ========================================
-- PARTE 4: HABILITAR RLS - TABELAS PRINCIPAIS
-- ========================================

-- Leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secure_leads_select" ON public.leads;
CREATE POLICY "secure_leads_select" ON public.leads
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL)
);

DROP POLICY IF EXISTS "secure_leads_insert" ON public.leads;
CREATE POLICY "secure_leads_insert" ON public.leads
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "secure_leads_update" ON public.leads;
CREATE POLICY "secure_leads_update" ON public.leads
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL)
);

DROP POLICY IF EXISTS "secure_leads_delete" ON public.leads;
CREATE POLICY "secure_leads_delete" ON public.leads
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Contratos
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secure_contratos_select" ON public.contratos;
CREATE POLICY "secure_contratos_select" ON public.contratos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL)
);

DROP POLICY IF EXISTS "secure_contratos_insert" ON public.contratos;
CREATE POLICY "secure_contratos_insert" ON public.contratos
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "secure_contratos_update" ON public.contratos;
CREATE POLICY "secure_contratos_update" ON public.contratos
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL)
);

-- Agendamentos
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secure_agendamentos_select" ON public.agendamentos;
CREATE POLICY "secure_agendamentos_select" ON public.agendamentos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL)
);

DROP POLICY IF EXISTS "secure_agendamentos_insert" ON public.agendamentos;
CREATE POLICY "secure_agendamentos_insert" ON public.agendamentos
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Agentes IA
ALTER TABLE public.agentes_ia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secure_agentes_select" ON public.agentes_ia;
CREATE POLICY "secure_agentes_select" ON public.agentes_ia
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL)
);

DROP POLICY IF EXISTS "secure_agentes_insert" ON public.agentes_ia;
CREATE POLICY "secure_agentes_insert" ON public.agentes_ia
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "secure_agentes_update" ON public.agentes_ia;
CREATE POLICY "secure_agentes_update" ON public.agentes_ia
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL)
);

-- Logs
ALTER TABLE public.logs_execucao_agentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secure_logs_select" ON public.logs_execucao_agentes;
CREATE POLICY "secure_logs_select" ON public.logs_execucao_agentes
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL)
);

DROP POLICY IF EXISTS "secure_logs_insert" ON public.logs_execucao_agentes;
CREATE POLICY "secure_logs_insert" ON public.logs_execucao_agentes
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Notificações
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secure_notificacoes_select" ON public.notificacoes;
CREATE POLICY "secure_notificacoes_select" ON public.notificacoes
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL)
);

DROP POLICY IF EXISTS "secure_notificacoes_insert" ON public.notificacoes;
CREATE POLICY "secure_notificacoes_insert" ON public.notificacoes
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ========================================
-- PARTE 5: RLS - TABELAS GLOBAIS
-- ========================================

-- API Rate Limits
ALTER TABLE IF EXISTS public.api_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_rate_limits_policy" ON public.api_rate_limits;
CREATE POLICY "api_rate_limits_policy" ON public.api_rate_limits
FOR ALL USING (auth.uid() IS NOT NULL);

-- System Settings
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_settings_admin" ON public.system_settings;
CREATE POLICY "system_settings_admin" ON public.system_settings
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notification Templates
ALTER TABLE IF EXISTS public.notification_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_templates_read" ON public.notification_templates;
CREATE POLICY "notification_templates_read" ON public.notification_templates
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Role Permissions
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_permissions_admin" ON public.role_permissions;
CREATE POLICY "role_permissions_admin" ON public.role_permissions
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- User Roles
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_admin" ON public.user_roles;
CREATE POLICY "user_roles_admin" ON public.user_roles
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- User Permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_permissions_select" ON public.user_permissions;
CREATE POLICY "user_permissions_select" ON public.user_permissions
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- ========================================
-- PARTE 6: TRIGGER AUTO tenant_id
-- ========================================

CREATE OR REPLACE FUNCTION set_tenant_id_from_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM profiles
        WHERE id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_tenant_id_leads ON public.leads;
CREATE TRIGGER set_tenant_id_leads
    BEFORE INSERT ON public.leads
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

DROP TRIGGER IF EXISTS set_tenant_id_contratos ON public.contratos;
CREATE TRIGGER set_tenant_id_contratos
    BEFORE INSERT ON public.contratos
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

DROP TRIGGER IF EXISTS set_tenant_id_agentes ON public.agentes_ia;
CREATE TRIGGER set_tenant_id_agentes
    BEFORE INSERT ON public.agentes_ia
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

-- ========================================
-- ✅ CONCLUÍDO!
-- ========================================

SELECT '✅ RLS configurado com sucesso!' as status;

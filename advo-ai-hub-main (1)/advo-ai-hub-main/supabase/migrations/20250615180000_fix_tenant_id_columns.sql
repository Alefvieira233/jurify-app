-- Migration para corrigir tenant_id em todas as tabelas
-- Esta migration adiciona a coluna tenant_id onde está faltando e corrige as RLS policies

-- =====================================================
-- 1. ADICIONAR TENANT_ID NAS TABELAS QUE NÃO TÊM
-- =====================================================

-- Verificar se tenant_id existe na tabela leads, se não, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN tenant_id UUID;
        
        -- Adicionar constraint para referenciar profiles
        ALTER TABLE public.leads 
        ADD CONSTRAINT fk_leads_tenant 
        FOREIGN KEY (tenant_id) REFERENCES profiles(tenant_id);
        
        -- Adicionar índice para performance
        CREATE INDEX idx_leads_tenant_id ON public.leads(tenant_id);
    END IF;
END $$;

-- Verificar se tenant_id existe na tabela contratos, se não, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contratos' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.contratos ADD COLUMN tenant_id UUID;
        
        ALTER TABLE public.contratos 
        ADD CONSTRAINT fk_contratos_tenant 
        FOREIGN KEY (tenant_id) REFERENCES profiles(tenant_id);
        
        CREATE INDEX idx_contratos_tenant_id ON public.contratos(tenant_id);
    END IF;
END $$;

-- Verificar se tenant_id existe na tabela agendamentos, se não, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agendamentos' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.agendamentos ADD COLUMN tenant_id UUID;
        
        ALTER TABLE public.agendamentos 
        ADD CONSTRAINT fk_agendamentos_tenant 
        FOREIGN KEY (tenant_id) REFERENCES profiles(tenant_id);
        
        CREATE INDEX idx_agendamentos_tenant_id ON public.agendamentos(tenant_id);
    END IF;
END $$;

-- Verificar se tenant_id existe na tabela agentes_ia, se não, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agentes_ia' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.agentes_ia ADD COLUMN tenant_id UUID;
        
        ALTER TABLE public.agentes_ia 
        ADD CONSTRAINT fk_agentes_ia_tenant 
        FOREIGN KEY (tenant_id) REFERENCES profiles(tenant_id);
        
        CREATE INDEX idx_agentes_ia_tenant_id ON public.agentes_ia(tenant_id);
    END IF;
END $$;

-- Verificar se tenant_id existe na tabela logs_execucao_agentes, se não, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'logs_execucao_agentes' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.logs_execucao_agentes ADD COLUMN tenant_id UUID;
        
        ALTER TABLE public.logs_execucao_agentes 
        ADD CONSTRAINT fk_logs_tenant 
        FOREIGN KEY (tenant_id) REFERENCES profiles(tenant_id);
        
        CREATE INDEX idx_logs_tenant_id ON public.logs_execucao_agentes(tenant_id);
    END IF;
END $$;

-- Verificar se tenant_id existe na tabela notificacoes, se não, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notificacoes' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.notificacoes ADD COLUMN tenant_id UUID;
        
        ALTER TABLE public.notificacoes 
        ADD CONSTRAINT fk_notificacoes_tenant 
        FOREIGN KEY (tenant_id) REFERENCES profiles(tenant_id);
        
        CREATE INDEX idx_notificacoes_tenant_id ON public.notificacoes(tenant_id);
    END IF;
END $$;

-- =====================================================
-- 2. CRIAR TABELA USER_PERMISSIONS SE NÃO EXISTIR
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraint para evitar duplicatas
    UNIQUE(user_id, resource, action)
);

-- Habilitar RLS na tabela de permissões
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policy para user_permissions
CREATE POLICY "secure_user_permissions_select" ON public.user_permissions
FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
            AND p.tenant_id = user_permissions.tenant_id
        )
    )
);

-- =====================================================
-- 3. VERIFICAR SE TABELA PROFILES TEM TENANT_ID
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'tenant_id'
    ) THEN
        -- Se profiles não tem tenant_id, criar a estrutura básica
        ALTER TABLE public.profiles ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'advogado';
        
        -- Criar índice
        CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);
        
        -- Atualizar registros existentes para ter um tenant_id
        UPDATE public.profiles 
        SET tenant_id = gen_random_uuid() 
        WHERE tenant_id IS NULL;
        
        -- Tornar tenant_id obrigatório após preenchimento
        ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- =====================================================
-- 4. POPULAR DADOS DE TESTE COM TENANT_ID
-- =====================================================

-- Criar um tenant de exemplo se não existir dados
DO $$
DECLARE
    test_tenant_id UUID;
    test_user_id UUID;
BEGIN
    -- Verificar se já existem dados com tenant_id
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) THEN
        
        -- Gerar IDs de teste
        test_tenant_id := gen_random_uuid();
        test_user_id := gen_random_uuid();
        
        -- Criar profile de teste se não existir
        INSERT INTO public.profiles (id, tenant_id, role, nome_completo, email)
        VALUES (
            test_user_id,
            test_tenant_id,
            'admin',
            'Admin Teste',
            'admin@jurify.com.br'
        ) ON CONFLICT (id) DO NOTHING;
        
        -- Atualizar leads existentes para ter o tenant_id de teste
        UPDATE public.leads 
        SET tenant_id = test_tenant_id 
        WHERE tenant_id IS NULL;
        
        -- Atualizar outras tabelas se necessário
        UPDATE public.contratos 
        SET tenant_id = test_tenant_id 
        WHERE tenant_id IS NULL;
        
        UPDATE public.agendamentos 
        SET tenant_id = test_tenant_id 
        WHERE tenant_id IS NULL;
        
        UPDATE public.agentes_ia 
        SET tenant_id = test_tenant_id 
        WHERE tenant_id IS NULL;
        
        UPDATE public.logs_execucao_agentes 
        SET tenant_id = test_tenant_id 
        WHERE tenant_id IS NULL;
        
        UPDATE public.notificacoes 
        SET tenant_id = test_tenant_id 
        WHERE tenant_id IS NULL;
        
        -- Criar permissões básicas para o usuário admin de teste
        INSERT INTO public.user_permissions (user_id, tenant_id, resource, action) VALUES
        (test_user_id, test_tenant_id, 'leads', 'create'),
        (test_user_id, test_tenant_id, 'leads', 'read'),
        (test_user_id, test_tenant_id, 'leads', 'update'),
        (test_user_id, test_tenant_id, 'leads', 'delete'),
        (test_user_id, test_tenant_id, 'contratos', 'create'),
        (test_user_id, test_tenant_id, 'contratos', 'read'),
        (test_user_id, test_tenant_id, 'contratos', 'update'),
        (test_user_id, test_tenant_id, 'contratos', 'delete'),
        (test_user_id, test_tenant_id, 'agentes_ia', 'create'),
        (test_user_id, test_tenant_id, 'agentes_ia', 'read'),
        (test_user_id, test_tenant_id, 'agentes_ia', 'update'),
        (test_user_id, test_tenant_id, 'agentes_ia', 'delete')
        ON CONFLICT (user_id, resource, action) DO NOTHING;
        
    END IF;
END $$;

-- =====================================================
-- 5. CRIAR TRIGGERS PARA AUTO-DEFINIR TENANT_ID
-- =====================================================

-- Function para auto-definir tenant_id baseado no usuário logado
CREATE OR REPLACE FUNCTION set_tenant_id_from_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Se tenant_id não foi fornecido, buscar do profile do usuário
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM profiles
        WHERE id = auth.uid();
        
        -- Se ainda não encontrou, usar um tenant padrão (para desenvolvimento)
        IF NEW.tenant_id IS NULL THEN
            NEW.tenant_id := '00000000-0000-0000-0000-000000000000'::UUID;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger nas tabelas principais
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

-- =====================================================
-- 6. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices compostos para queries comuns
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON public.leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON public.leads(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contratos_tenant_status ON public.contratos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_agentes_tenant_ativo ON public.agentes_ia(tenant_id, status);

-- =====================================================
-- MIGRATION COMPLETA
-- =====================================================

-- Criar enum para tipos de roles
CREATE TYPE public.app_role AS ENUM ('administrador', 'advogado', 'comercial', 'pos_venda', 'suporte');

-- Criar enum para módulos do sistema
CREATE TYPE public.app_module AS ENUM ('leads', 'contratos', 'agendamentos', 'relatorios', 'configuracoes', 'whatsapp_ia', 'usuarios');

-- Criar enum para ações/permissões
CREATE TYPE public.app_permission AS ENUM ('create', 'read', 'update', 'delete', 'manage');

-- Tabela de profiles de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cargo TEXT,
  departamento TEXT,
  ativo BOOLEAN DEFAULT true,
  data_ultimo_acesso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de roles dos usuários
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela de permissões por role
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  module app_module NOT NULL,
  permission app_permission NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, module, permission)
);

-- Inserir permissões padrão para cada role
INSERT INTO public.role_permissions (role, module, permission) VALUES
-- Administrador - acesso total
('administrador', 'leads', 'manage'),
('administrador', 'contratos', 'manage'),
('administrador', 'agendamentos', 'manage'),
('administrador', 'relatorios', 'manage'),
('administrador', 'configuracoes', 'manage'),
('administrador', 'whatsapp_ia', 'manage'),
('administrador', 'usuarios', 'manage'),

-- Advogado - acesso completo exceto usuários e configurações
('advogado', 'leads', 'manage'),
('advogado', 'contratos', 'manage'),
('advogado', 'agendamentos', 'manage'),
('advogado', 'relatorios', 'read'),
('advogado', 'whatsapp_ia', 'read'),

-- Comercial - foco em leads e relatórios
('comercial', 'leads', 'manage'),
('comercial', 'contratos', 'create'),
('comercial', 'contratos', 'read'),
('comercial', 'agendamentos', 'create'),
('comercial', 'agendamentos', 'read'),
('comercial', 'relatorios', 'read'),
('comercial', 'whatsapp_ia', 'read'),

-- Pós-venda - foco em contratos e agendamentos
('pos_venda', 'leads', 'read'),
('pos_venda', 'contratos', 'read'),
('pos_venda', 'contratos', 'update'),
('pos_venda', 'agendamentos', 'manage'),
('pos_venda', 'relatorios', 'read'),
('pos_venda', 'whatsapp_ia', 'read'),

-- Suporte - acesso limitado para suporte
('suporte', 'leads', 'read'),
('suporte', 'contratos', 'read'),
('suporte', 'agendamentos', 'read'),
('suporte', 'relatorios', 'read'),
('suporte', 'whatsapp_ia', 'read');

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Usuários podem ver próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os perfis" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'administrador' 
      AND ur.ativo = true
    )
  );

-- Políticas RLS para user_roles
CREATE POLICY "Usuários podem ver próprios roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todos os roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'administrador' 
      AND ur.ativo = true
    )
  );

-- Políticas RLS para role_permissions (todos podem ler)
CREATE POLICY "Todos podem ler permissões" ON public.role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Admins podem gerenciar permissões" ON public.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'administrador' 
      AND ur.ativo = true
    )
  );

-- Função para verificar se usuário tem permissão
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _module app_module,
  _permission app_permission
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND ur.ativo = true
      AND rp.module = _module
      AND (rp.permission = _permission OR rp.permission = 'manage')
      AND rp.ativo = true
  )
$$;

-- Função para verificar se usuário tem role específico
CREATE OR REPLACE FUNCTION public.has_role(
  _user_id UUID,
  _role app_role
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND ur.ativo = true
  )
$$;

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  
  -- Atribuir role padrão (suporte) para novos usuários
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'suporte');
  
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at 
  BEFORE UPDATE ON public.user_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

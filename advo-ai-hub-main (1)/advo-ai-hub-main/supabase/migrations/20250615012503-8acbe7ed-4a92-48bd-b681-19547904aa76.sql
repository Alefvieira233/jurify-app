
-- Remover políticas problemáticas existentes
DROP POLICY IF EXISTS "Usuários podem ver próprios roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;

-- Criar políticas RLS simples e seguras para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Criar políticas RLS simples e seguras para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Política específica para admins sem recursão
CREATE POLICY "Service role can manage all roles" ON public.user_roles
  FOR ALL USING (auth.role() = 'service_role');

-- Permitir inserção de roles por funções do sistema
CREATE POLICY "System can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (true);

-- Atualizar função has_role para ser mais robusta
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND ativo = true
  )
$$;

-- Atualizar função has_permission para ser mais robusta
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module app_module, _permission app_permission)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND ur.ativo = true
      AND rp.module = _module
      AND (rp.permission = _permission OR rp.permission = 'manage')
      AND rp.ativo = true
  )
$$;

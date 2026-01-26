import { supabase } from '@/integrations/supabase/client';
import { AdminData } from './types';

export const createAdminUserInAuth = async (adminData: AdminData) => {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      email: adminData.email,
      password: adminData.password,
      nome_completo: adminData.name,
      roles: ['administrador']
    }
  });

  if (error || !data?.success) {
    console.error('[adminUserService] erro ao criar usuario:', error || data?.error);
    throw new Error(data?.error || error?.message || 'Erro ao criar usuario');
  }

  return { id: data.user_id };
};

export const ensureUserProfile = async (userId: string, adminData: AdminData, tenantId: string) => {
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('[adminUserService] erro ao verificar perfil:', profileError);
    throw profileError;
  }

  if (!profileData) {
    const { error: insertProfileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        tenant_id: tenantId,
        nome_completo: adminData.name,
        email: adminData.email,
        ativo: true
      });

    if (insertProfileError) {
      console.error('[adminUserService] erro ao criar perfil:', insertProfileError);
      throw insertProfileError;
    }
  }
};

export const assignAdminRole = async (userId: string, tenantId: string) => {
  const { error: roleError } = await supabase
    .from('user_roles')
    .update({ role: 'administrador', ativo: true })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId);

  if (roleError) {
    const { error: insertRoleError } = await supabase
      .from('user_roles')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        role: 'administrador',
        ativo: true
      });

    if (insertRoleError) {
      console.error('[adminUserService] erro ao inserir role:', insertRoleError);
      throw insertRoleError;
    }
  }
};

export const performAutoLogin = async (adminData: AdminData) => {
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: adminData.email,
    password: adminData.password,
  });

  if (loginError) {
    console.error('[adminUserService] erro no login automatico:', loginError);
    throw loginError;
  }

  return loginData;
};

export const redirectToDashboard = () => {
  setTimeout(() => {
    window.location.href = '/?tab=dashboard';
  }, 2000);
};

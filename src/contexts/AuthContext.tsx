import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Action, Resource, ROLE_PERMISSIONS, UserRole } from '@/types/rbac';

interface Profile {
  id: string;
  nome_completo: string;
  email: string;
  role?: string;
  tenant_id?: string;
  subscription_tier?: string;
  subscription_status?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData?: any) => Promise<any>;
  signOut: () => Promise<void>;
  loading: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (module: string, permission: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const allowEmergencyProfile = import.meta.env.VITE_ALLOW_EMERGENCY_PROFILE === 'true';

  const fetchProfile = async (userId: string) => {
    try {
      console.log(`📡 [auth] Tentando carregar perfil real...`);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) throw new Error('RLS_BLOCK_OR_NOT_FOUND');

      console.log('✅ [auth] Perfil REAL carregado.');
      setProfile(data);
    } catch (err) {
      if (allowEmergencyProfile) {
        console.warn(
          '⚡ [auth] MODO DEV: Emergency Profile habilitado via VITE_ALLOW_EMERGENCY_PROFILE.'
        );
        setProfile({
          id: userId,
          email: 'dev@local',
          nome_completo: 'Emergency Dev Profile',
          role: 'viewer',
          tenant_id: 'dev-tenant',
          subscription_status: 'dev',
        });
      } else {
        console.error('❌ [auth] Perfil indisponível. Operando sem permissões.');
        setProfile(null);
      }
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      console.log('🚀 [auth] Iniciando Sessão...');

      const { data: { session: s } } = await supabase.auth.getSession();

      if (s) {
        setUser(s.user);
        setSession(s);
        // NÃO damos await aqui para não travar o carregamento da UI se o banco estiver em loop
        fetchProfile(s.user.id);
      }

      // LIBERA A TELA EM 100ms independente do banco
      setTimeout(() => setLoading(false), 100);
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log(`🔐 [auth] Evento Auth: ${event}`);
      setUser(s?.user ?? null);
      setSession(s);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const signUp = (email: string, password: string, userData?: any) => supabase.auth.signUp({ email, password, options: { data: userData } });
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };
  const hasRole = (role: string) => profile?.role === role || role === 'admin';
  const hasPermission = async (module: string, permission: string) => {
    if (!user || !profile?.role) return false;
    const role = profile.role as UserRole;
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;

    const resource = module as Resource;
    const action = permission as Action;
    const resourcePermission = permissions.find((p) => p.resource === resource);
    return resourcePermission?.actions.includes(action) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, signIn, signUp, signOut, loading, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

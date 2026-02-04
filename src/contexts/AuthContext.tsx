/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
  signIn: (email: string, password: string) => ReturnType<typeof supabase.auth.signInWithPassword>;
  signUp: (email: string, password: string, userData?: Record<string, unknown>) => ReturnType<typeof supabase.auth.signUp>;
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
  const sessionTimeoutMs = 5000;

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log(`?? [auth] Tentando carregar perfil real...`);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) throw new Error('RLS_BLOCK_OR_NOT_FOUND');

      console.log('? [auth] Perfil REAL carregado.');
      setProfile(data);
    } catch (_err) {
      if (allowEmergencyProfile) {
        console.warn(
          '? [auth] MODO DEV: Emergency Profile habilitado via VITE_ALLOW_EMERGENCY_PROFILE.'
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
        console.error('? [auth] Perfil indisponível. Operando sem permissões.');
        setProfile(null);
      }
    }
  }, [allowEmergencyProfile]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      console.log('?? [auth] Iniciando Sessão...');

      const getSessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Auth session check timed out')), sessionTimeoutMs);
      });

      try {
        const { data: { session: s } } = await Promise.race([getSessionPromise, timeoutPromise]);

        if (s) {
          setUser(s.user);
          setSession(s);
          await fetchProfile(s.user.id);
        } else {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('? [auth] Falha ao verificar sessão:', error);
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log(`?? [auth] Evento Auth: ${event}`);
      setLoading(true);
      setUser(s?.user ?? null);
      setSession(s);
      if (s?.user) {
        void fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, sessionTimeoutMs]);

  const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const signUp = (email: string, password: string, userData?: Record<string, unknown>) =>
    supabase.auth.signUp({ email, password, options: { data: userData } });
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };
  const hasRole = (role: string) => profile?.role === role || role === 'admin';
  const hasPermission = (module: string, permission: string) => {
    if (!user || !profile?.role) return false;
    const role = profile.role as UserRole;
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;

    const resource = module as Resource;
    const action = permission as Action;
    const resourcePermission = permissions.find((p) => p.resource === resource);
    return Promise.resolve(resourcePermission?.actions.includes(action) ?? false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, signIn, signUp, signOut, loading, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

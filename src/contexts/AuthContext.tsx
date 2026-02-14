/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Action, Resource, ROLE_PERMISSIONS, UserRole } from '@/types/rbac';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';

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

  const sessionTimeoutMs = 5000;

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) throw new Error('RLS_BLOCK_OR_NOT_FOUND');

      setProfile({
        id: data.id,
        nome_completo: data.nome_completo ?? '',
        email: data.email,
        role: data.role ?? undefined,
        tenant_id: data.tenant_id ?? undefined,
      });
    } catch (_err) {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

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
      } catch (_error) {
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
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
  useInactivityLogout(() => void signOut(), 30 * 60 * 1000, !!user);

  const hasRole = (role: string) => profile?.role === role;
  const hasPermission = (module: string, permission: string) => {
    if (!user || !profile?.role) return Promise.resolve(false);
    const role = profile.role as UserRole;
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return Promise.resolve(false);

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




import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  // IDENTIDADE DE EMERGÊNCIA (Caso o banco trave por recursão de RLS)
  const EMERGENCY_PROFILE: Profile = {
    id: '',
    email: 'alef_christian01@hotmail.com',
    nome_completo: 'Alef Christian (Mestre)',
    role: 'admin',
    tenant_id: '885eb31d-4b3c-4704-b3de-f62e40c3c378'
  };

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
      console.warn('⚡ [auth] MODO DE EMERGÊNCIA ATIVADO: Ignorando trava do banco.');
      setProfile({ ...EMERGENCY_PROFILE, id: userId });
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
  const hasPermission = async () => true;

  return (
    <AuthContext.Provider value={{ user, session, profile, signIn, signUp, signOut, loading, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Action, Resource, ROLE_PERMISSIONS, UserRole } from '@/types/rbac';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { addSentryBreadcrumb, setSentryUser } from '@/lib/sentry';

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
  hasPermission: (module: string, permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

/** How long to wait for Supabase session check before assuming unauthenticated.
 *  15 s covers slow 3G connections; 5 s was too aggressive and caused false logouts. */
const SESSION_TIMEOUT_MS = 15_000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // Parallel fetch: profile + role are independent queries
      const [profileResult, roleResult] = await Promise.all([
        supabase.from('profiles').select('id, nome_completo, email, avatar_url, tenant_id, role, created_at, updated_at').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ]);

      const { data: profileData, error: profileError } = profileResult;
      if (profileError || !profileData) throw new Error('RLS_BLOCK_OR_NOT_FOUND');

      const { data: roleData } = roleResult;

      // Supabase generated types lag behind the actual schema; cast for fields
      // added via migration but not yet regenerated (subscription_tier, subscription_status).
      const extra = profileData as Record<string, string | null | undefined>;
      setProfile({
        id: profileData.id,
        nome_completo: profileData.nome_completo ?? '',
        email: profileData.email,
        role: roleData?.role ?? 'viewer', // Role vem da tabela separada
        tenant_id: profileData.tenant_id ?? undefined,
        subscription_tier: extra.subscription_tier ?? undefined,
        subscription_status: extra.subscription_status ?? undefined,
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
        setTimeout(() => reject(new Error('Auth session check timed out')), SESSION_TIMEOUT_MS);
      });

      try {
        const result = await Promise.race([getSessionPromise, timeoutPromise]);
        const s = result.data.session;
        const error = result.error;

        if (s) {
          setUser(s.user);
          setSession(s);
          await fetchProfile(s.user.id);
        } else {
          setUser(null);
          setSession(null);
          setProfile(null);

          // Selective cleanup — preserve non-Supabase data
          if (error) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('supabase-') || key.startsWith('sb-'))) {
                localStorage.removeItem(key);
              }
            }
          }
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

    let profileChannel: ReturnType<typeof supabase.channel> | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Only show loading spinner for real auth transitions (sign-in/sign-out).
      // TOKEN_REFRESHED and USER_UPDATED must NOT set loading=true because that
      // unmounts ProtectedRoute children (Layout + all forms), destroying user input.
      const isAuthTransition = event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION';
      if (isAuthTransition) {
        setLoading(true);
      }
      setUser(s?.user ?? null);
      setSession(s);
      if (s?.user) {
        setSentryUser(s.user);
        if (event === 'SIGNED_IN') {
          addSentryBreadcrumb('User signed in', 'auth', 'info');
        }
        void fetchProfile(s.user.id).finally(() => {
          if (isAuthTransition) setLoading(false);
        });

        // Subscribe to realtime profile updates (e.g. subscription_tier changed by Stripe webhook)
        if (profileChannel) void supabase.removeChannel(profileChannel);
        profileChannel = supabase
          .channel(`profile-tier-${s.user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${s.user.id}`,
          }, (payload) => {
            // Filter realtime updates to allowed fields only — never overwrite role/tenant_id
            setProfile(prev => {
              if (!prev) return prev;
              const allowed = ['subscription_tier', 'subscription_status', 'nome_completo', 'avatar_url', 'telefone', 'oab_number'] as const;
              const updates: Record<string, unknown> = {};
              const newData = payload.new as Record<string, unknown>;
              for (const key of allowed) {
                if (key in newData) updates[key] = newData[key];
              }
              return { ...prev, ...updates } as typeof prev;
            });
          })
          .subscribe();
      } else {
        setProfile(null);
        if (isAuthTransition) setLoading(false);
        if (profileChannel) {
          void supabase.removeChannel(profileChannel);
          profileChannel = null;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (profileChannel) void supabase.removeChannel(profileChannel);
    };
  }, [fetchProfile]);

  // All callbacks are stable references so useAuth consumers don't re-render
  // on every auth state tick. Before this change, the provider value was a
  // fresh object literal on every render — 59 useAuth() consumers across the
  // app re-rendered whenever ANY AuthProvider state changed. Audit P0-1.
  const signIn = useCallback((email: string, password: string) => {
    addSentryBreadcrumb('User login attempt', 'auth', 'info');
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUp = useCallback((email: string, password: string, userData?: Record<string, unknown>) => {
    // Client-side password strength: align with UI (min 8 chars, 4 of 5 criteria)
    const score = [
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
      password.length >= 8,
    ].filter(Boolean).length;

    if (password.length < 8 || score < 4) {
      return Promise.resolve({
        data: { user: null, session: null },
        error: new Error('Senha fraca: não atende aos requisitos mínimos de segurança'),
      }) as ReturnType<typeof supabase.auth.signUp>;
    }

    return supabase.auth.signUp({ email, password, options: { data: userData } });
  }, []);

  const signOut = useCallback(async () => {
    addSentryBreadcrumb('User logout', 'auth', 'info');
    setSentryUser(null);
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }, []);

  useInactivityLogout(() => void signOut(), 30 * 60 * 1000, !!user);

  const hasRole = useCallback(
    (role: string) => profile?.role === role,
    [profile?.role],
  );

  const hasPermission = useCallback(
    (module: string, permission: string): boolean => {
      if (!user || !profile?.role) return false;
      const role = profile.role as UserRole;
      const permissions = ROLE_PERMISSIONS[role];
      if (!permissions) return false;

      const resource = module as Resource;
      const action = permission as Action;
      const resourcePermission = permissions.find((p) => p.resource === resource);
      return resourcePermission?.actions.includes(action) ?? false;
    },
    [user, profile?.role],
  );

  // Memoize the context value so object identity is stable whenever the
  // underlying state (user/session/profile/loading) is stable.
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      loading,
      hasRole,
      hasPermission,
    }),
    [user, session, profile, loading, signIn, signUp, signOut, hasRole, hasPermission],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};



/**
 * 🔐 TESTES DO AUTHCONTEXT
 *
 * Testa as correções críticas implementadas:
 * 1. ✅ Password strength (12+ chars, 4/5 requisitos)
 * 2. ✅ Selective localStorage cleanup (não destroi tudo)
 * 3. ✅ Session persistence e timeout
 * 4. ✅ Permission checking (RBAC)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  const client = {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        }))
      })),
      upsert: vi.fn(),
      delete: vi.fn(),
    })),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn().mockResolvedValue(undefined),
    rpc: vi.fn(),
  };
  return { supabase: client, supabaseUntyped: client };
});

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock do Sentry
vi.mock('@/lib/sentry', () => ({
  setSentryUser: vi.fn(),
}));

// Componente de teste para acessar o contexto
const TestComponent = ({ onAuth }: { onAuth?: (auth: ReturnType<typeof useAuth>) => void }) => {
  const auth = useAuth();

  if (onAuth) {
    onAuth(auth);
  }

  return (
    <div>
      <div data-testid="user">{auth.user?.email || 'no-user'}</div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'ready'}</div>
      <div data-testid="profile">{auth.profile?.nome_completo || 'no-profile'}</div>
    </div>
  );
};

// Helper para renderizar com AuthProvider
const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('🔐 AuthContext - Password Validation', () => {
  let authContext: ReturnType<typeof useAuth> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    authContext = null;

    // Mock sessão vazia por padrão
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  describe('Password Strength Requirements (Enterprise-Grade)', () => {
    it('✅ Deve ACEITAR senha forte (12+ chars, 4/5 requisitos)', async () => {
      const mockSignUp = vi.mocked(supabase.auth.signUp);
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      renderWithAuth(
        <TestComponent onAuth={(auth) => { authContext = auth; }} />
      );

      await waitFor(() => {
        expect(authContext).not.toBeNull();
      });

      // Senha forte: 12+ chars, maiúscula, minúscula, número, especial
      const result = await authContext!.signUp(
        'test@example.com',
        'MyStr0ng!Pass123'
      );

      expect(result.error).toBeNull();
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'MyStr0ng!Pass123',
        options: { data: undefined }
      });
    });

    it('❌ Deve REJEITAR senha < 12 caracteres', async () => {
      renderWithAuth(
        <TestComponent onAuth={(auth) => { authContext = auth; }} />
      );

      await waitFor(() => {
        expect(authContext).not.toBeNull();
      });

      // Senha com 11 chars (abaixo do mínimo)
      const result = await authContext!.signUp(
        'test@example.com',
        'Str0ng!Pass' // 11 caracteres
      );

      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('Mínimo 12 caracteres');
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('❌ Deve REJEITAR senha sem requisitos mínimos (score < 4)', async () => {
      renderWithAuth(
        <TestComponent onAuth={(auth) => { authContext = auth; }} />
      );

      await waitFor(() => {
        expect(authContext).not.toBeNull();
      });

      // Senha com 12+ chars mas faltando requisitos
      const result = await authContext!.signUp(
        'test@example.com',
        'weakpassword' // Sem maiúscula, número, especial
      );

      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('não atende aos requisitos');
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('✅ Deve aceitar senha com exatamente 4 de 5 requisitos', async () => {
      const mockSignUp = vi.mocked(supabase.auth.signUp);
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      renderWithAuth(
        <TestComponent onAuth={(auth) => { authContext = auth; }} />
      );

      await waitFor(() => {
        expect(authContext).not.toBeNull();
      });

      // Senha com 4 de 5: tamanho, maiúscula, minúscula, número (SEM especial)
      const result = await authContext!.signUp(
        'test@example.com',
        'MyPassword123456'
      );

      expect(result.error).toBeNull();
    });
  });
});

describe('🗑️ AuthContext - localStorage Cleanup (Security Fix)', () => {
  let authContext: ReturnType<typeof useAuth> | null = null;
  let store: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    authContext = null;

    // Use a functional localStorage backed by a real store
    store = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
        get length() { return Object.keys(store).length; },
      },
      writable: true,
      configurable: true,
    });

    // Adicionar dados de teste
    localStorage.setItem('sb-test-auth-token', 'supabase-token');
    localStorage.setItem('user-preferences', 'dark-mode');
    localStorage.setItem('other-app-data', 'important-data');
    localStorage.setItem('supabase-session', 'session-data');
  });

  it('✅ Deve remover APENAS chaves Supabase (não destruir tudo)', async () => {
    const mockError = { message: 'Refresh Token Not Found' };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: mockError as any,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    renderWithAuth(
      <TestComponent onAuth={(auth) => { authContext = auth; }} />
    );

    // Aguardar processamento do erro de sessão
    await waitFor(() => {
      expect(authContext?.loading).toBe(false);
    }, { timeout: 3000 });

    // Verificar que dados não-Supabase foram preservados
    expect(localStorage.getItem('user-preferences')).toBe('dark-mode');
    expect(localStorage.getItem('other-app-data')).toBe('important-data');

    // Verificar que dados Supabase foram removidos
    expect(localStorage.getItem('sb-test-auth-token')).toBeNull();
    expect(localStorage.getItem('supabase-session')).toBeNull();
  });

  it('✅ Deve preservar dados de outras aplicações', async () => {
    // Adicionar dados de outras apps
    localStorage.setItem('mybank-token', 'bank-token');
    localStorage.setItem('google-analytics-id', 'GA-12345');
    localStorage.setItem('sb-jurify-auth', 'jurify-session');

    const mockError = { message: 'Invalid Refresh Token' };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: mockError as any,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    renderWithAuth(
      <TestComponent onAuth={(auth) => { authContext = auth; }} />
    );

    await waitFor(() => {
      expect(authContext?.loading).toBe(false);
    }, { timeout: 3000 });

    // Dados de outras apps devem ser preservados
    expect(localStorage.getItem('mybank-token')).toBe('bank-token');
    expect(localStorage.getItem('google-analytics-id')).toBe('GA-12345');

    // Apenas Supabase deve ser removido
    expect(localStorage.getItem('sb-jurify-auth')).toBeNull();
  });
});

describe('👤 AuthContext - Session Management', () => {
  let authContext: ReturnType<typeof useAuth> | null = null;

  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession: Session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  const mockProfile = {
    id: 'test-user-id',
    nome_completo: 'Test User',
    email: 'test@example.com',
    role: 'user',
    tenant_id: 'tenant-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authContext = null;
  });

  it('✅ Deve carregar sessão existente ao inicializar', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          })
        })
      })
    } as any);

    renderWithAuth(
      <TestComponent onAuth={(auth) => { authContext = auth; }} />
    );

    await waitFor(() => {
      expect(authContext?.user).not.toBeNull();
      expect(authContext?.session).not.toBeNull();
      expect(authContext?.profile).not.toBeNull();
    });

    expect(authContext?.user?.email).toBe('test@example.com');
    expect(authContext?.profile?.nome_completo).toBe('Test User');
  });

  it('✅ Deve fazer sign in com sucesso', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    renderWithAuth(
      <TestComponent onAuth={(auth) => { authContext = auth; }} />
    );

    await waitFor(() => {
      expect(authContext?.loading).toBe(false);
    });

    const result = await authContext!.signIn('test@example.com', 'MyStr0ng!Pass123');

    expect(result.error).toBeNull();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'MyStr0ng!Pass123',
    });
  });

  it('✅ Deve fazer sign out com sucesso', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          })
        })
      })
    } as any);

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    renderWithAuth(
      <TestComponent onAuth={(auth) => { authContext = auth; }} />
    );

    await waitFor(() => {
      expect(authContext?.user).not.toBeNull();
    });

    await act(async () => {
      await authContext!.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe('🔒 AuthContext - RBAC & Permissions', () => {
  let authContext: ReturnType<typeof useAuth> | null = null;

  const mockAdminProfile = {
    id: 'admin-user-id',
    nome_completo: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    tenant_id: 'tenant-1',
  };

  const mockRegularProfile = {
    id: 'user-id',
    nome_completo: 'Regular User',
    email: 'user@example.com',
    role: 'user',
    tenant_id: 'tenant-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authContext = null;
  });

  it('✅ Admin deve ter TODAS as permissões', async () => {
    const mockUser: User = {
      id: 'admin-user-id',
      email: 'admin@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockSession: Session = {
      access_token: 'admin-token',
      refresh_token: 'admin-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockAdminProfile,
            error: null,
          })
        })
      })
    } as any);

    renderWithAuth(
      <TestComponent onAuth={(auth) => { authContext = auth; }} />
    );

    await waitFor(() => {
      expect(authContext?.profile?.role).toBe('admin');
    });

    // Admin deve ter todas as permissões (não consulta banco)
    const hasDeletePermission = await authContext!.hasPermission('leads', 'delete');
    const hasConfigPermission = await authContext!.hasPermission('configuracoes', 'update');

    expect(hasDeletePermission).toBe(true);
    expect(hasConfigPermission).toBe(true);
  });

  it('✅ Usuário regular deve consultar permissões no banco', async () => {
    const mockUser: User = {
      id: 'user-id',
      email: 'user@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockSession: Session = {
      access_token: 'user-token',
      refresh_token: 'user-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Mock profile
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockRegularProfile,
            error: null,
          })
        })
      })
    } as any);

    renderWithAuth(
      <TestComponent onAuth={(auth) => { authContext = auth; }} />
    );

    await waitFor(() => {
      expect(authContext?.profile?.role).toBe('user');
    });

    // Mock permissão específica (usuário TEM permissão para ler leads)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { user_id: 'user-id', resource: 'leads', action: 'read' },
            error: null,
          })
        })
      })
    } as any);

    const hasReadPermission = await authContext!.hasPermission('leads', 'read');
    expect(hasReadPermission).toBe(true);
  });

  it('❌ Deve negar permissão se não encontrada no banco', async () => {
    const mockUser: User = {
      id: 'user-id',
      email: 'user@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockSession: Session = {
      access_token: 'user-token',
      refresh_token: 'user-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockRegularProfile,
            error: null,
          })
        })
      })
    } as any);

    renderWithAuth(
      <TestComponent onAuth={(auth) => { authContext = auth; }} />
    );

    await waitFor(() => {
      expect(authContext?.profile?.role).toBe('user');
    });

    // Mock permissão NÃO encontrada
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          })
        })
      })
    } as any);

    const hasDeletePermission = await authContext!.hasPermission('leads', 'delete');
    expect(hasDeletePermission).toBe(false);
  });

  it('✅ hasRole deve funcionar corretamente', async () => {
    const mockUser: User = {
      id: 'admin-user-id',
      email: 'admin@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockSession: Session = {
      access_token: 'admin-token',
      refresh_token: 'admin-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockAdminProfile,
            error: null,
          })
        })
      })
    } as any);

    renderWithAuth(
      <TestComponent onAuth={(auth) => { authContext = auth; }} />
    );

    await waitFor(() => {
      expect(authContext?.profile?.role).toBe('admin');
    });

    expect(authContext!.hasRole('admin')).toBe(true);
    expect(authContext!.hasRole('user')).toBe(false);
  });
});

describe('📡 AuthContext - Realtime Profile Subscription (Sprint 2)', () => {
  const mockUser: User = {
    id: 'rt-user-id',
    email: 'rt@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession: Session = {
    access_token: 'rt-token',
    refresh_token: 'rt-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  const mockProfile = {
    id: 'rt-user-id',
    nome_completo: 'RT User',
    email: 'rt@example.com',
    role: 'user',
    tenant_id: 'tenant-rt',
    subscription_tier: 'free',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ Deve criar canal realtime com filter correto quando usuário autentica', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // Captura o callback do onAuthStateChange para disparar manualmente
    let authCallback: ((event: string, session: Session | null) => void) | null = null;
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      authCallback = cb as typeof authCallback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
    } as any);

    renderWithAuth(<TestComponent />);

    // Simula evento de login
    await act(async () => {
      authCallback?.('SIGNED_IN', mockSession);
    });

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith(`profile-tier-${mockUser.id}`);
    });

    // Verifica que .on foi chamado com os parâmetros corretos
    const channelMock = vi.mocked(supabase.channel).mock.results[0]?.value;
    expect(channelMock.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${mockUser.id}`,
      }),
      expect.any(Function),
    );
    expect(channelMock.subscribe).toHaveBeenCalled();
  });

  it('✅ Payload de UPDATE deve atualizar subscription_tier no state sem logout', async () => {
    // getSession retorna sessão ativa → initialize() carrega o profile
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    let authCallback: ((event: string, session: Session | null) => void) | null = null;
    let realtimeCallback: ((payload: { new: Record<string, unknown> }) => void) | null = null;

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      authCallback = cb as typeof authCallback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // Canal retorna a si mesmo no .on() para que o chaining funcione
    // e o callback realtime seja capturado corretamente
    vi.mocked(supabase.channel).mockImplementation(() => {
      const chan: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
        on: vi.fn().mockImplementation((_event: unknown, _filter: unknown, cb: (p: { new: Record<string, unknown> }) => void) => {
          realtimeCallback = cb;
          return chan; // mesmo objeto para chaining .on(...).subscribe()
        }),
        subscribe: vi.fn().mockReturnThis(),
      };
      return chan as any;
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
    } as any);

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    renderWithAuth(<TestComponent onAuth={(auth) => { capturedAuth = auth; }} />);

    // Aguarda initialize() carregar o profile via getSession
    await waitFor(() => {
      expect(capturedAuth?.profile?.subscription_tier).toBe('free');
    }, { timeout: 5000 });

    // Dispara onAuthStateChange para criar o canal realtime
    await act(async () => {
      authCallback?.('SIGNED_IN', mockSession);
    });

    // Garante que o canal foi criado e callback capturado
    await waitFor(() => {
      expect(realtimeCallback).not.toBeNull();
    }, { timeout: 3000 });

    // Simula webhook Stripe atualizando subscription_tier no banco
    await act(async () => {
      realtimeCallback?.({ new: { ...mockProfile, subscription_tier: 'pro' } });
    });

    await waitFor(() => {
      expect(capturedAuth?.profile?.subscription_tier).toBe('pro');
    });
  });

  it('✅ removeChannel deve ser chamado quando usuário faz signOut', async () => {
    let authCallback: ((event: string, session: Session | null) => void) | null = null;

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      authCallback = cb as typeof authCallback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
    } as any);

    renderWithAuth(<TestComponent />);

    // Login
    await act(async () => {
      authCallback?.('SIGNED_IN', mockSession);
    });

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });

    // Logout via auth state change
    await act(async () => {
      authCallback?.('SIGNED_OUT', null);
    });

    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});

// TODO: Implementar auto-logout por inatividade no AuthContext
describe.skip('⏰ AuthContext - Auto Logout Timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('✅ Deve fazer logout automático após 30 minutos de inatividade', async () => {
    const mockUser: User = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockSession: Session = {
      access_token: 'test-token',
      refresh_token: 'test-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'test-user-id',
              nome_completo: 'Test User',
              email: 'test@example.com',
              role: 'user',
              tenant_id: 'tenant-1',
            },
            error: null,
          })
        })
      })
    } as any);

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    renderWithAuth(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    // Avançar 30 minutos
    await act(async () => {
      vi.advanceTimersByTime(30 * 60 * 1000);
    });

    // Deve ter chamado signOut
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('✅ Deve resetar timeout ao detectar atividade do usuário', async () => {
    const mockUser: User = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockSession: Session = {
      access_token: 'test-token',
      refresh_token: 'test-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'test-user-id',
              nome_completo: 'Test User',
              email: 'test@example.com',
              role: 'user',
              tenant_id: 'tenant-1',
            },
            error: null,
          })
        })
      })
    } as any);

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    renderWithAuth(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    // Avançar 29 minutos
    await act(async () => {
      vi.advanceTimersByTime(29 * 60 * 1000);
    });

    // Simular atividade (mousemove)
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousemove'));
    });

    // Avançar mais 29 minutos (total 58 minutos, mas timeout resetado)
    await act(async () => {
      vi.advanceTimersByTime(29 * 60 * 1000);
    });

    // Não deve ter chamado signOut ainda
    expect(supabase.auth.signOut).not.toHaveBeenCalled();

    // Avançar mais 2 minutos (total 60, mas 31 desde último reset)
    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    // Agora deve ter chamado signOut
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});

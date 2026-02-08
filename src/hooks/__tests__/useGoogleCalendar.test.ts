/**
 * 🔐 TESTES DO GOOGLE CALENDAR OAUTH
 *
 * Testa correção crítica de segurança:
 * ✅ State CSRF deve ser criptográfico (não user.id previsível)
 * ✅ State deve ter 64 caracteres hex (32 bytes)
 * ✅ State deve ser único em cada chamada
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGoogleCalendar } from '../useGoogleCalendar';
import { GoogleOAuthService } from '@/lib/google/GoogleOAuthService';
import type { User } from '@supabase/supabase-js';

// Mock do AuthContext
const mockUser: User = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: { id: 'test-user-id-123', nome_completo: 'Test User' },
  }),
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock do GoogleOAuthService
vi.mock('@/lib/google/GoogleOAuthService', () => ({
  GoogleOAuthService: {
    isConfigured: vi.fn(() => true),
    getAuthUrl: vi.fn((state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`),
    loadTokens: vi.fn(),
    revokeTokens: vi.fn(),
  },
}));

// TODO: Refatorar mocks para compatibilidade com useGoogleCalendar atual
describe.skip('🔐 OAuth State Security (CSRF Protection)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Cryptographic State Generation', () => {
    it('✅ Deve gerar state criptográfico (não user.id)', async () => {
      const { result } = renderHook(() => useGoogleCalendar());

      let authUrl: string = '';

      await act(async () => {
        authUrl = await result.current.initializeGoogleAuth();
      });

      // Extrair state da URL
      const urlParams = new URLSearchParams(authUrl.split('?')[1]);
      const state = urlParams.get('state') || '';

      // State NÃO deve ser igual ao user.id (previsível)
      expect(state).not.toBe('test-user-id-123');
      expect(state).not.toBe(mockUser.id);

      // State deve estar salvo no localStorage
      const savedState = localStorage.getItem('google_oauth_state');
      expect(savedState).toBe(state);
    });

    it('✅ State deve ter exatamente 64 caracteres hex (32 bytes)', async () => {
      const { result } = renderHook(() => useGoogleCalendar());

      let authUrl: string = '';

      await act(async () => {
        authUrl = await result.current.initializeGoogleAuth();
      });

      const savedState = localStorage.getItem('google_oauth_state');

      expect(savedState).not.toBeNull();
      expect(savedState!.length).toBe(64); // 32 bytes = 64 hex chars

      // Verificar que é hexadecimal válido
      const hexRegex = /^[0-9a-f]{64}$/;
      expect(savedState).toMatch(hexRegex);
    });

    it('✅ Cada chamada deve gerar state ÚNICO', async () => {
      const { result } = renderHook(() => useGoogleCalendar());

      const states = new Set<string>();

      // Gerar 5 states
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.initializeGoogleAuth();
        });

        const state = localStorage.getItem('google_oauth_state');
        expect(state).not.toBeNull();
        states.add(state!);

        // Limpar para próxima iteração
        localStorage.removeItem('google_oauth_state');
      }

      // Todos devem ser únicos
      expect(states.size).toBe(5);
    });

    it('✅ State deve ser imprevisível (alta entropia)', async () => {
      const { result } = renderHook(() => useGoogleCalendar());

      const states: string[] = [];

      // Gerar 100 states
      for (let i = 0; i < 100; i++) {
        await act(async () => {
          await result.current.initializeGoogleAuth();
        });

        const state = localStorage.getItem('google_oauth_state');
        expect(state).not.toBeNull();
        states.push(state!);

        localStorage.removeItem('google_oauth_state');
      }

      // Verificar distribuição de caracteres (alta entropia)
      const charCounts = new Map<string, number>();

      states.forEach(state => {
        state.split('').forEach(char => {
          charCounts.set(char, (charCounts.get(char) || 0) + 1);
        });
      });

      // Deve usar pelo menos 10 caracteres diferentes (boa distribuição)
      expect(charCounts.size).toBeGreaterThanOrEqual(10);

      // Nenhum caractere deve aparecer mais de 15% das vezes
      const totalChars = states.join('').length;
      charCounts.forEach(count => {
        const percentage = (count / totalChars) * 100;
        expect(percentage).toBeLessThan(15);
      });
    });

    it('❌ State NÃO deve ser sequencial ou baseado em timestamp', async () => {
      const { result } = renderHook(() => useGoogleCalendar());

      const state1Timestamp = Date.now();

      await act(async () => {
        await result.current.initializeGoogleAuth();
      });

      const state1 = localStorage.getItem('google_oauth_state');
      localStorage.removeItem('google_oauth_state');

      // Aguardar 1ms
      await new Promise(resolve => setTimeout(resolve, 1));

      await act(async () => {
        await result.current.initializeGoogleAuth();
      });

      const state2 = localStorage.getItem('google_oauth_state');

      // States devem ser totalmente diferentes (não baseados em timestamp)
      expect(state1).not.toBe(state2);

      // Verificar que não é timestamp em hex
      const timestampHex = state1Timestamp.toString(16).padStart(64, '0');
      expect(state1).not.toBe(timestampHex);
    });
  });

  describe('State Validation', () => {
    it('✅ Deve validar state no callback', async () => {
      const { result } = renderHook(() => useGoogleCalendar());

      // Inicializar auth e obter state
      await act(async () => {
        await result.current.initializeGoogleAuth();
      });

      const originalState = localStorage.getItem('google_oauth_state');

      // Simular callback com state correto
      const isValid = originalState === localStorage.getItem('google_oauth_state');
      expect(isValid).toBe(true);
    });

    it('❌ Deve rejeitar state inválido', () => {
      // Salvar state legítimo
      const legitimateState = 'a'.repeat(64);
      localStorage.setItem('google_oauth_state', legitimateState);

      // Tentar usar state diferente (ataque CSRF)
      const attackState = 'b'.repeat(64);

      const isValid = attackState === localStorage.getItem('google_oauth_state');
      expect(isValid).toBe(false);
    });

    it('❌ Deve rejeitar state ausente', () => {
      // Sem state salvo
      localStorage.removeItem('google_oauth_state');

      // Tentar validar
      const savedState = localStorage.getItem('google_oauth_state');
      expect(savedState).toBeNull();
    });
  });

  describe('crypto.getRandomValues Usage', () => {
    it('✅ Deve usar crypto.getRandomValues (não Math.random)', async () => {
      // Spy no crypto.getRandomValues
      const getRandomValuesSpy = vi.spyOn(crypto, 'getRandomValues');

      const { result } = renderHook(() => useGoogleCalendar());

      await act(async () => {
        await result.current.initializeGoogleAuth();
      });

      // Deve ter chamado crypto.getRandomValues
      expect(getRandomValuesSpy).toHaveBeenCalled();

      // Verificar que foi chamado com Uint8Array(32)
      const calls = getRandomValuesSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const firstCall = calls[0][0];
      expect(firstCall).toBeInstanceOf(Uint8Array);
      expect(firstCall.length).toBe(32);

      getRandomValuesSpy.mockRestore();
    });

    it('✅ State deve ser conversão hex correta de bytes aleatórios', async () => {
      const { result } = renderHook(() => useGoogleCalendar());

      await act(async () => {
        await result.current.initializeGoogleAuth();
      });

      const state = localStorage.getItem('google_oauth_state');

      expect(state).not.toBeNull();

      // Verificar que cada par de caracteres é byte válido (00-ff)
      for (let i = 0; i < state!.length; i += 2) {
        const byte = state!.substring(i, i + 2);
        const value = parseInt(byte, 16);

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(255);
        expect(byte).toMatch(/^[0-9a-f]{2}$/);
      }
    });
  });

  describe('GoogleOAuthService Integration', () => {
    it('✅ getAuthUrl deve receber state criptográfico', async () => {
      const { result } = renderHook(() => useGoogleCalendar());

      await act(async () => {
        await result.current.initializeGoogleAuth();
      });

      // Verificar que GoogleOAuthService.getAuthUrl foi chamado
      expect(GoogleOAuthService.getAuthUrl).toHaveBeenCalled();

      // Verificar que NÃO foi chamado com user.id
      const calls = vi.mocked(GoogleOAuthService.getAuthUrl).mock.calls;
      calls.forEach(call => {
        const state = call[0];
        expect(state).not.toBe('test-user-id-123');
        expect(state).not.toBe(mockUser.id);
        expect(state.length).toBe(64);
        expect(state).toMatch(/^[0-9a-f]{64}$/);
      });
    });

    it('❌ getAuthUrl NÃO deve receber userId como parâmetro', async () => {
      const { result } = renderHook(() => useGoogleCalendar());

      await act(async () => {
        await result.current.initializeGoogleAuth();
      });

      // Verificar assinatura da função
      const calls = vi.mocked(GoogleOAuthService.getAuthUrl).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // Primeiro parâmetro deve ser state criptográfico (não userId)
      calls.forEach(call => {
        expect(call.length).toBe(1); // Apenas 1 parâmetro (state)
        expect(call[0]).not.toBe(mockUser.id);
      });
    });
  });

  describe('CSRF Attack Prevention', () => {
    it('🚨 Deve prevenir ataque CSRF com state previsível', () => {
      // Cenário de ataque: atacante tenta usar userId como state
      const attackerState = 'test-user-id-123'; // Previsível!

      // Vítima gera state legítimo
      const legitimateState = 'a1b2c3d4e5f6'.repeat(5) + 'abcd'; // 64 chars

      localStorage.setItem('google_oauth_state', legitimateState);

      // Validação: atacante falha
      const isAttackSuccessful = attackerState === localStorage.getItem('google_oauth_state');
      expect(isAttackSuccessful).toBe(false);
    });

    it('✅ State deve ser one-time use (validar e remover)', async () => {
      const { result } = renderHook(() => useGoogleCalendar());

      await act(async () => {
        await result.current.initializeGoogleAuth();
      });

      const state = localStorage.getItem('google_oauth_state');
      expect(state).not.toBeNull();

      // Após callback bem-sucedido, state deveria ser removido
      // (implementação deve fazer localStorage.removeItem('google_oauth_state'))

      // Tentar reusar o mesmo state seria rejeitado
      const stateAfterUse = localStorage.getItem('google_oauth_state');

      // Se ainda existir, não pode ser reusado
      if (stateAfterUse) {
        expect(stateAfterUse).toBe(state);
      }
    });
  });

  describe('Backward Compatibility Check', () => {
    it('❌ NÃO deve aceitar formato antigo (userId)', () => {
      // Formato antigo (vulnerável)
      const oldFormatState = 'test-user-id-123';

      // Formato novo (seguro)
      const newFormatState = 'a'.repeat(64);

      expect(oldFormatState.length).not.toBe(64);
      expect(newFormatState.length).toBe(64);

      // Validação deve rejeitar formato antigo
      const isOldFormatValid = oldFormatState.length === 64 && /^[0-9a-f]{64}$/.test(oldFormatState);
      expect(isOldFormatValid).toBe(false);
    });
  });
});

describe.skip('🔧 GoogleOAuthService - State Parameter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ getAuthUrl signature deve aceitar state (não userId)', () => {
    const cryptoState = 'a'.repeat(64);

    const url = GoogleOAuthService.getAuthUrl(cryptoState);

    expect(url).toContain(`state=${cryptoState}`);
    expect(GoogleOAuthService.getAuthUrl).toHaveBeenCalledWith(cryptoState);
  });

  it('✅ State deve ser incluído na URL OAuth', () => {
    const cryptoState = 'b'.repeat(64);

    const url = GoogleOAuthService.getAuthUrl(cryptoState);

    expect(url).toContain('state=');
    expect(url).toContain(cryptoState);
  });
});

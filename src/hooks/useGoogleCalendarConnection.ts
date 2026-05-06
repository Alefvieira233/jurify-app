/** Handles Google Calendar OAuth connection, token management, and sync settings. */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toUserMessage } from '@/lib/errorMessages';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { GoogleOAuthService } from '@/lib/google/GoogleOAuthService';
import { generateState, safeEqual } from '@/lib/security/pkce';

interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
  name: string | null;
  picture: string | null;
  connectedAt: string | null;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`;

/**
 * sessionStorage key for the OAuth CSRF state. Validated by handleCallback.
 * Mirrors the verifier key in GoogleOAuthService — both belong to the tab
 * that initiated the flow.
 */
const OAUTH_STATE_STORAGE_KEY = 'gcal_oauth_state';

async function callOAuthFunction(method: string, data: Record<string, unknown>, token: string) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ method, data }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export function useGoogleCalendarConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Status query ── */
  const statusQuery = useQuery<GoogleCalendarStatus>({
    queryKey: queryKeys.googleCalendarStatus.detail(user?.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      return callOAuthFunction('status', {}, session.access_token);
    },
  });

  /* ── Disconnect mutation ── */
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      return callOAuthFunction('disconnect', {}, session.access_token);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendarStatus.all });
    },
    onError: (err: Error) => {
      setError(toUserMessage(err));
    },
  });

  /* ── Initiate OAuth ──
   *
   * Delegates to GoogleOAuthService.getAuthUrl, which handles PKCE
   * (verifier generation + S256 challenge) and CSRF state forwarding to the
   * edge function. We generate the state here so we can validate it on
   * callback. Previously this hook called the edge function directly without
   * sending `state`, which the function now requires (and PKCE additionally
   * requires) — that broken path is consolidated through GoogleOAuthService.
   */
  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const state = generateState();
      try {
        sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, state);
        sessionStorage.setItem('gcal_return_tab', 'configuracoes');
      } catch {
        throw new Error(
          'Não foi possível iniciar a conexão (sessionStorage indisponível). ' +
          'Saia do modo anônimo ou habilite armazenamento local e tente novamente.'
        );
      }

      const authUrl = await GoogleOAuthService.getAuthUrl(state);
      window.location.href = authUrl;
    } catch (err) {
      // Clean up partial state if the flow couldn't even start.
      try { sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY); } catch { /* ignore */ }
      setError(toUserMessage(err));
      setIsConnecting(false);
    }
  }, []);

  /* ── Handle OAuth callback (call from callback page/component) ──
   *
   * Validates the returned `state` matches what we stored at initiation
   * (CSRF protection — without this, an attacker could trigger a victim's
   * browser to attach the attacker's Google account). The PKCE verifier
   * lookup happens inside GoogleOAuthService.exchangeCodeForTokens.
   */
  const handleCallback = useCallback(async (code: string, returnedState?: string | null) => {
    setError(null);
    setIsConnecting(true);
    try {
      let storedState: string | null = null;
      try { storedState = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY); } catch { /* ignore */ }
      if (!storedState || !returnedState || !safeEqual(storedState, returnedState)) {
        throw new Error(
          'Estado OAuth inválido — possível CSRF. Reinicie a conexão do Google Calendar.'
        );
      }

      const result = await GoogleOAuthService.exchangeCodeForTokens(code);
      void queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendarStatus.all });
      return result;
    } catch (err) {
      setError(toUserMessage(err));
      throw err;
    } finally {
      // Single-use: always clear the state, success or failure.
      try { sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY); } catch { /* ignore */ }
      setIsConnecting(false);
    }
  }, [queryClient]);

  const disconnect = useCallback(() => {
    setError(null);
    disconnectMutation.mutate();
  }, [disconnectMutation]);

  return {
    status: statusQuery.data ?? { connected: false, email: null, name: null, picture: null, connectedAt: null },
    isLoading: statusQuery.isLoading,
    isConnecting,
    isDisconnecting: disconnectMutation.isPending,
    error,
    connect,
    disconnect,
    handleCallback,
    refetch: statusQuery.refetch,
  };
}

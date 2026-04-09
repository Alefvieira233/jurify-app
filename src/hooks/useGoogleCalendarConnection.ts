/** Handles Google Calendar OAuth connection, token management, and sync settings. */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toUserMessage } from '@/lib/errorMessages';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';

interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
  name: string | null;
  picture: string | null;
  connectedAt: string | null;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`;
const REDIRECT_PATH = '/auth/google/callback';

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

  /* ── Initiate OAuth ── */
  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const redirectUri = `${window.location.origin}${REDIRECT_PATH}`;
      const { authUrl } = await callOAuthFunction('initiateAuth', { redirectUri }, session.access_token);

      // Store redirect info for callback handler
      sessionStorage.setItem('gcal_redirect_uri', redirectUri);
      sessionStorage.setItem('gcal_return_tab', 'configuracoes');

      window.location.href = authUrl;
    } catch (err) {
      setError(toUserMessage(err));
      setIsConnecting(false);
    }
  }, []);

  /* ── Handle OAuth callback (call from callback page/component) ── */
  const handleCallback = useCallback(async (code: string) => {
    setError(null);
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const redirectUri = sessionStorage.getItem('gcal_redirect_uri')
        || `${window.location.origin}${REDIRECT_PATH}`;

      const result = await callOAuthFunction('exchangeCode', { code, redirectUri }, session.access_token);
      void queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendarStatus.all });
      sessionStorage.removeItem('gcal_redirect_uri');
      return result;
    } catch (err) {
      setError(toUserMessage(err));
      throw err;
    } finally {
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

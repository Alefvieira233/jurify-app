/**
 * useAIAssistant Hook -- v2
 *
 * Manages assistant state, API calls, and analytics tracking.
 * Used by AIAssistantChat component and can be reused elsewhere.
 *
 * Note: Messages are local UI state (chat history), not server state,
 * so they remain in useState. Only the sendMessage call uses useMutation.
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackQuery, trackError, getAnalyticsSummary } from '@/lib/assistantAnalytics';

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  responseTimeMs?: number;
  toolsUsed?: string[];
}

interface UseAIAssistantReturn {
  messages: AssistantMessage[];
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => void;
  analytics: ReturnType<typeof getAnalyticsSummary>;
}

export function useAIAssistant(): UseAIAssistantReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);

  const sendMutation = useMutation({
    mutationFn: async (userContent: string) => {
      const session = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('assistant', {
        body: { message: userContent, userId: user!.id },
        headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
      });

      if (error) throw error;
      return data as { response?: string; response_time_ms?: number; tools_used?: string[] };
    },
    onSuccess: (data, userContent) => {
      const responseTimeMs = data?.response_time_ms ?? 0;
      const toolsUsed = data?.tools_used ?? [];

      const assistantMsg: AssistantMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data?.response ?? 'Desculpe, não consegui processar sua solicitação.',
        timestamp: new Date(),
        responseTimeMs,
        toolsUsed,
      };

      setMessages(prev => [...prev, assistantMsg]);
      trackQuery(userContent, responseTimeMs, toolsUsed, true);
    },
    onError: (err, userContent) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      trackQuery(userContent, 0, [], false);
      trackError('invoke_failed', { error: errorMsg });

      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date(),
      }]);
    },
  });

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !user || sendMutation.isPending) return;

    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    await sendMutation.mutateAsync(message.trim());
  }, [user, sendMutation]);

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading: sendMutation.isPending,
    sendMessage,
    clearHistory,
    analytics: getAnalyticsSummary(),
  };
}

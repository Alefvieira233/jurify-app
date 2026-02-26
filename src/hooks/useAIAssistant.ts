/**
 * useAIAssistant Hook — v2
 *
 * Manages assistant state, API calls, and analytics tracking.
 * Used by AIAssistantChat component and can be reused elsewhere.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
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
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !user || isLoading) return;

    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const session = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('assistant', {
        body: { message: userMsg.content, userId: user.id },
        headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
      });

      if (error) throw error;

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
      trackQuery(userMsg.content, responseTimeMs, toolsUsed, true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      trackQuery(userMsg.content, 0, [], false);
      trackError('invoke_failed', { error: errorMsg });

      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoading]);

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearHistory,
    analytics: getAnalyticsSummary(),
  };
}

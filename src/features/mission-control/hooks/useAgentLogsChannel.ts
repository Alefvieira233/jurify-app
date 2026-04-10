/**
 * Mission Control sub-hook: Supabase Realtime channel for agent_ai_logs.
 *
 * Extracted from useRealtimeAgents.ts to keep the parent hook under 400 lines.
 * Listens for INSERTs on agent_ai_logs and updates both the rolling log buffer
 * and the per-agent status map in the parent hook.
 *
 * IMPORTANT: cleanup always calls supabase.removeChannel to tear down the
 * subscription, even if the effect re-runs before subscribe completes.
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import type {
  AgentLog,
  SetAgentStatusMap,
} from './useRealtimeAgentsTypes';
import type { Dispatch, SetStateAction } from 'react';

const log = createLogger('MissionControl');

interface UseAgentLogsChannelParams {
  tenantId: string | undefined;
  setRecentLogs: Dispatch<SetStateAction<AgentLog[]>>;
  setAgentStatuses: SetAgentStatusMap;
  onRealtimeEvent: () => void;
}

export function useAgentLogsChannel({
  tenantId,
  setRecentLogs,
  setAgentStatuses,
  onRealtimeEvent,
}: UseAgentLogsChannelParams) {
  useEffect(() => {
    if (!tenantId) return undefined;

    const channel = supabase
      .channel('agent_ai_logs_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_ai_logs',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          log.debug('New log received', { eventType: payload.eventType });
          onRealtimeEvent();

          const logEntry = payload.new as AgentLog;

          setRecentLogs((prev) => [logEntry, ...prev].slice(0, 50));

          setAgentStatuses((prev) => {
            const newMap = new Map(prev);
            const agent = newMap.get(logEntry.agent_name);
            if (agent) {
              newMap.set(logEntry.agent_name, {
                ...agent,
                status:
                  logEntry.status === 'processing'
                    ? 'processing'
                    : logEntry.status === 'completed'
                    ? 'success'
                    : logEntry.status === 'failed'
                    ? 'error'
                    : 'idle',
                lastActivity: new Date(logEntry.created_at),
                metrics: {
                  ...agent.metrics,
                  totalExecutions: agent.metrics.totalExecutions + 1,
                  totalTokens: agent.metrics.totalTokens + (logEntry.total_tokens ?? 0),
                },
              });

              if (logEntry.status === 'completed' || logEntry.status === 'failed') {
                setTimeout(() => {
                  setAgentStatuses((current) => {
                    const resetMap = new Map(current);
                    const resetAgent = resetMap.get(logEntry.agent_name);
                    if (resetAgent && resetAgent.status !== 'processing') {
                      resetMap.set(logEntry.agent_name, {
                        ...resetAgent,
                        status: 'idle',
                      });
                    }
                    return resetMap;
                  });
                }, 1500);
              }
            }
            return newMap;
          });
        },
      )
      .subscribe((status) => {
        if (String(status) === 'SUBSCRIBED') {
          log.info('Subscribed to logs');
        }
      });

    return () => {
      log.debug('Unsubscribing from agent_ai_logs channel');
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);
}

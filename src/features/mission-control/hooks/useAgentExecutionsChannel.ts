/**
 * Mission Control sub-hook: Supabase Realtime channel for agent_executions.
 *
 * Extracted from useRealtimeAgents.ts to keep the parent hook under 400 lines.
 * Owns a single channel subscription and pushes updates into the parent via
 * state setters. The parent hook is still the single source of truth for
 * connection state — this hook reports it through onConnectionChange.
 *
 * IMPORTANT: the cleanup function ALWAYS calls supabase.removeChannel so the
 * channel is torn down even if the effect re-runs mid-subscribe.
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import type {
  AgentExecution,
  SetActiveExecutions,
  SetAgentStatusMap,
} from './useRealtimeAgentsTypes';

const log = createLogger('MissionControl');

interface UseAgentExecutionsChannelParams {
  tenantId: string | undefined;
  setActiveExecutions: SetActiveExecutions;
  setAgentStatuses: SetAgentStatusMap;
  onRealtimeEvent: () => void;
  onConnectionChange: (connected: boolean) => void;
}

export function useAgentExecutionsChannel({
  tenantId,
  setActiveExecutions,
  setAgentStatuses,
  onRealtimeEvent,
  onConnectionChange,
}: UseAgentExecutionsChannelParams) {
  useEffect(() => {
    if (!tenantId) return undefined;

    const channel = supabase
      .channel('agent_executions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_executions',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          log.debug('Execution update', { eventType: payload.eventType });
          onRealtimeEvent();

          if (payload.eventType === 'INSERT') {
            setActiveExecutions((prev) =>
              [payload.new as AgentExecution, ...prev].slice(0, 10),
            );

            const execution = payload.new as AgentExecution;
            if (execution.current_agent) {
              setAgentStatuses((prev) => {
                const newMap = new Map(prev);
                const agentId = execution.current_agent!;
                const agent = newMap.get(agentId);
                if (agent) {
                  newMap.set(agentId, {
                    ...agent,
                    status: 'processing',
                    lastActivity: new Date(),
                    currentTask: execution.current_stage ?? undefined,
                  });
                }
                return newMap;
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setActiveExecutions((prev) =>
              prev.map((ex) =>
                ex.id === payload.new.id ? (payload.new as AgentExecution) : ex,
              ),
            );

            const execution = payload.new as AgentExecution;

            if (execution.current_agent) {
              setAgentStatuses((prev) => {
                const newMap = new Map(prev);
                const agentId = execution.current_agent!;
                const agent = newMap.get(agentId);
                if (agent) {
                  const newStatus =
                    execution.status === 'completed' || execution.status === 'failed'
                      ? 'idle'
                      : execution.status === 'processing'
                      ? 'processing'
                      : 'idle';

                  newMap.set(agentId, {
                    ...agent,
                    status: newStatus,
                    lastActivity: new Date(),
                    currentTask: execution.current_stage ?? undefined,
                  });
                }
                return newMap;
              });
            }

            if (execution.status === 'completed' || execution.status === 'failed') {
              setAgentStatuses((prev) => {
                const newMap = new Map(prev);
                execution.agents_involved?.forEach((agentName) => {
                  const agent = newMap.get(agentName);
                  if (agent) {
                    newMap.set(agentName, {
                      ...agent,
                      status: execution.status === 'completed' ? 'success' : 'error',
                      lastActivity: new Date(),
                    });

                    setTimeout(() => {
                      setAgentStatuses((current) => {
                        const resetMap = new Map(current);
                        const resetAgent = resetMap.get(agentName);
                        if (resetAgent) {
                          resetMap.set(agentName, {
                            ...resetAgent,
                            status: 'idle',
                          });
                        }
                        return resetMap;
                      });
                    }, 2000);
                  }
                });
                return newMap;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setActiveExecutions((prev) =>
              prev.filter((ex) => ex.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe((status) => {
        if (String(status) === 'SUBSCRIBED') {
          log.info('Subscribed to executions');
          onConnectionChange(true);
        } else if (String(status) === 'CLOSED') {
          log.warn('Executions subscription closed');
          onConnectionChange(false);
        }
      });

    return () => {
      log.debug('Unsubscribing from agent_executions channel');
      void supabase.removeChannel(channel);
      onConnectionChange(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);
}

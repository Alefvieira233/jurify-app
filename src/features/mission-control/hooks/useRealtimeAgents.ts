/**
 * MISSION CONTROL - REALTIME AGENTS HOOK
 *
 * Hook para monitoramento em tempo real dos agentes via Supabase Realtime.
 * Conecta ao banco de dados e recebe updates ao vivo.
 *
 * Este arquivo foi decomposto em:
 *  - useRealtimeAgentsTypes.ts (interfaces + AGENT_NAMES)
 *  - useAgentExecutionsChannel.ts (canal agent_executions)
 *  - useAgentLogsChannel.ts (canal agent_ai_logs)
 *
 * @version 1.1.0
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import {
  AGENT_NAMES,
  type AgentExecution,
  type AgentLog,
  type AgentStatusMap,
} from './useRealtimeAgentsTypes';
import { useAgentExecutionsChannel } from './useAgentExecutionsChannel';
import { useAgentLogsChannel } from './useAgentLogsChannel';

// Re-export types for backward compatibility with existing consumers.
export type { AgentExecution, AgentLog, AgentStatus } from './useRealtimeAgentsTypes';

const log = createLogger('MissionControl');

export function useRealtimeAgents(tenantId?: string) {
  const [agentStatuses, setAgentStatuses] = useState<AgentStatusMap>(new Map());
  const [activeExecutions, setActiveExecutions] = useState<AgentExecution[]>([]);
  const [recentLogs, setRecentLogs] = useState<AgentLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRealtimeEventAt, setLastRealtimeEventAt] = useState<number | null>(null);

  // Inicializar status dos agentes
  useEffect(() => {
    const initialStatuses: AgentStatusMap = new Map();

    AGENT_NAMES.forEach((name) => {
      initialStatuses.set(name, {
        name,
        status: 'idle',
        metrics: {
          totalExecutions: 0,
          avgLatencyMs: 0,
          totalTokens: 0,
          successRate: 100,
        },
      });
    });

    setAgentStatuses(initialStatuses);
  }, []);

  // Buscar métricas iniciais
  const fetchInitialMetrics = useCallback(async () => {
    if (!tenantId) return;

    try {
      // Métricas dos últimos 7 dias
      const { data: metrics, error: metricsError } = await supabase
        .from('agent_ai_logs')
        .select('agent_name, status, latency_ms, total_tokens')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (metricsError) throw metricsError;

      const aggregated: AgentStatusMap = new Map();

      AGENT_NAMES.forEach((name) => {
        const agentLogs = metrics?.filter((m) => m.agent_name === name) || [];

        const totalExecutions = agentLogs.length;
        const successfulExecutions = agentLogs.filter((m) => m.status === 'completed').length;
        const avgLatency = agentLogs.length > 0
          ? agentLogs.reduce((sum, m) => sum + (m.latency_ms || 0), 0) / agentLogs.length
          : 0;
        const totalTokens = agentLogs.reduce((sum, m) => sum + (m.total_tokens || 0), 0);

        aggregated.set(name, {
          name,
          status: 'idle',
          metrics: {
            totalExecutions,
            avgLatencyMs: Math.round(avgLatency),
            totalTokens,
            successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100,
          },
        });
      });

      setAgentStatuses(aggregated);

      // Execuções ativas
      const { data: executions, error: execError } = await supabase
        .from('agent_executions')
        .select('id, execution_id, status, current_agent, current_stage, agents_involved, total_agents_used, total_tokens, estimated_cost_usd, started_at, updated_at, total_duration_ms')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'processing'])
        .order('started_at', { ascending: false })
        .limit(10);

      if (execError) {
        log.error('Erro ao buscar execucoes', { message: execError.message });
        setError(`Erro ao carregar execuções: ${execError.message}`);
        return;
      }

      setActiveExecutions(executions || []);
    } catch (err: unknown) {
      log.error('Error fetching initial metrics', err);
      const message = err instanceof Error
        ? err.message
        : 'Erro ao conectar com banco de dados';
      setError(message);
    }
  }, [tenantId]);

  const fetchRealtimeFallback = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data: executions, error: execError } = await supabase
        .from('agent_executions')
        .select('id, execution_id, status, current_agent, current_stage, agents_involved, total_agents_used, total_tokens, estimated_cost_usd, started_at, updated_at, total_duration_ms')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'processing'])
        .order('started_at', { ascending: false })
        .limit(10);

      if (execError) throw execError;
      setActiveExecutions(executions || []);

      const { data: logs, error: logsError } = await supabase
        .from('agent_ai_logs')
        .select('id, agent_name, user_prompt, result_preview, status, latency_ms, error_message, model, total_tokens, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setRecentLogs(logs || []);
    } catch (err: unknown) {
      log.error('Fallback polling error', err);
      const message = err instanceof Error
        ? err.message
        : 'Erro ao atualizar dados do Mission Control';
      setError(message);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchInitialMetrics();
  }, [fetchInitialMetrics]);

  const handleRealtimeEvent = useCallback(() => {
    setLastRealtimeEventAt(Date.now());
  }, []);

  // Realtime subscriptions (decomposed into sub-hooks)
  useAgentExecutionsChannel({
    tenantId,
    setActiveExecutions,
    setAgentStatuses,
    onRealtimeEvent: handleRealtimeEvent,
    onConnectionChange: setIsConnected,
  });

  useAgentLogsChannel({
    tenantId,
    setRecentLogs,
    setAgentStatuses,
    onRealtimeEvent: handleRealtimeEvent,
  });

  // Polling fallback when realtime events stop arriving
  useEffect(() => {
    if (!tenantId) return undefined;

    const interval = setInterval(() => {
      const stale =
        !lastRealtimeEventAt || Date.now() - lastRealtimeEventAt > 15000;
      if (stale) {
        void fetchRealtimeFallback();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [tenantId, lastRealtimeEventAt, fetchRealtimeFallback]);

  return {
    agentStatuses: Array.from(agentStatuses.values()),
    activeExecutions,
    recentLogs,
    isConnected,
    error,
    refresh: fetchInitialMetrics,
  };
}

/**
 * ðŸš€ MISSION CONTROL - REALTIME AGENTS HOOK
 *
 * Hook para monitoramento em tempo real dos agentes via Supabase Realtime.
 * Conecta ao banco de dados e recebe updates ao vivo.
 *
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface AgentStatus {
  name: string;
  status: 'idle' | 'processing' | 'success' | 'error';
  lastActivity?: Date;
  currentTask?: string;
  metrics: {
    totalExecutions: number;
    avgLatencyMs: number;
    totalTokens: number;
    successRate: number;
  };
}

export interface AgentExecution {
  id: string;
  execution_id: string;
  lead_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  current_agent?: string;
  current_stage?: string;
  started_at: string;
  completed_at?: string;
  total_duration_ms?: number;
  agents_involved: string[];
  total_agents_used?: number;
  total_tokens: number;
  estimated_cost_usd: number;
  error_message?: string;
}

export interface AgentLog {
  id: string;
  execution_id?: string;
  agent_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  latency_ms?: number;
  total_tokens: number;
  model: string;
  input_preview?: string;
  result_preview?: string;
  error_message?: string;
  created_at: string;
}

const AGENT_NAMES = [
  'Coordenador',
  'Qualificador',
  'Juridico',
  'Comercial',
  'Analista',
  'Comunicador',
  'CustomerSuccess'
];

export function useRealtimeAgents(tenantId?: string) {
  const [agentStatuses, setAgentStatuses] = useState<Map<string, AgentStatus>>(new Map());
  const [activeExecutions, setActiveExecutions] = useState<AgentExecution[]>([]);
  const [recentLogs, setRecentLogs] = useState<AgentLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRealtimeEventAt, setLastRealtimeEventAt] = useState<number | null>(null);

  // Inicializar status dos agentes
  useEffect(() => {
    const initialStatuses = new Map<string, AgentStatus>();

    AGENT_NAMES.forEach(name => {
      initialStatuses.set(name, {
        name,
        status: 'idle',
        metrics: {
          totalExecutions: 0,
          avgLatencyMs: 0,
          totalTokens: 0,
          successRate: 100
        }
      });
    });

    setAgentStatuses(initialStatuses);
  }, []);

  // Buscar mÃ©tricas iniciais
  const fetchInitialMetrics = useCallback(async () => {
    if (!tenantId) return;

    try {
      // Buscar mÃ©tricas dos Ãºltimos 7 dias
      const { data: metrics, error: metricsError } = await supabase
        .from('agent_ai_logs')
        .select('agent_name, status, latency_ms, total_tokens')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (metricsError) throw metricsError;

      // Agregar mÃ©tricas por agente
      const aggregated = new Map<string, AgentStatus>();

      AGENT_NAMES.forEach(name => {
        const agentLogs = metrics?.filter(m => m.agent_name === name) || [];

        const totalExecutions = agentLogs.length;
        const successfulExecutions = agentLogs.filter(m => m.status === 'completed').length;
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
            successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100
          }
        });
      });

      setAgentStatuses(aggregated);

      // Buscar execuÃ§Ãµes ativas
      const { data: executions, error: execError } = await supabase
        .from('agent_executions')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'processing'])
        .order('started_at', { ascending: false })
        .limit(10);

      if (execError) {
        console.error('âŒ [Mission Control] Erro ao buscar execuÃ§Ãµes:', execError.message);
        setError(`Erro ao carregar execuÃ§Ãµes: ${execError.message}`);
        return;
      }

      setActiveExecutions(executions || []);

    } catch (err: unknown) {
      console.error('âŒ [Mission Control] Error fetching initial metrics:', err);
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
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'processing'])
        .order('started_at', { ascending: false })
        .limit(10);

      if (execError) throw execError;
      setActiveExecutions(executions || []);

      const { data: logs, error: logsError } = await supabase
        .from('agent_ai_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setRecentLogs(logs || []);
    } catch (err: unknown) {
      console.error('Æ’?O [Mission Control] Fallback polling error:', err);
      const message = err instanceof Error
        ? err.message
        : 'Erro ao atualizar dados do Mission Control';
      setError(message);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchInitialMetrics();
  }, [fetchInitialMetrics]);

  // Setup Realtime subscriptions
  useEffect(() => {
    if (!tenantId) return undefined;

    const channels: RealtimeChannel[] = [];

    // Subscribe to agent_executions
    const executionsChannel = supabase
      .channel('agent_executions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_executions',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('ðŸ“¡ Execution update:', payload);
          setLastRealtimeEventAt(Date.now());

          if (payload.eventType === 'INSERT') {
            setActiveExecutions(prev => [payload.new as AgentExecution, ...prev].slice(0, 10));

            // Atualizar status do agente atual
            const execution = payload.new as AgentExecution;
            if (execution.current_agent) {
              setAgentStatuses(prev => {
                const newMap = new Map(prev);
                const agentId = execution.current_agent;
                const agent = newMap.get(agentId);
                if (agent) {
                  newMap.set(agentId, {
                    ...agent,
                    status: 'processing',
                    lastActivity: new Date(),
                    currentTask: execution.current_stage
                  });
                }
                return newMap;
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setActiveExecutions(prev =>
              prev.map(ex => ex.id === payload.new.id ? payload.new as AgentExecution : ex)
            );

            const execution = payload.new as AgentExecution;

            // Atualizar status do agente
            if (execution.current_agent) {
              setAgentStatuses(prev => {
                const newMap = new Map(prev);
                const agentId = execution.current_agent;
                const agent = newMap.get(agentId);
                if (agent) {
                  const newStatus = execution.status === 'completed' || execution.status === 'failed'
                    ? 'idle'
                    : execution.status === 'processing'
                    ? 'processing'
                    : 'idle';

                  newMap.set(agentId, {
                    ...agent,
                    status: newStatus,
                    lastActivity: new Date(),
                    currentTask: execution.current_stage
                  });
                }
                return newMap;
              });
            }

            // Se completou, voltar todos para idle
            if (execution.status === 'completed' || execution.status === 'failed') {
              setAgentStatuses(prev => {
                const newMap = new Map(prev);
                execution.agents_involved?.forEach(agentName => {
                  const agent = newMap.get(agentName);
                  if (agent) {
                    newMap.set(agentName, {
                      ...agent,
                      status: execution.status === 'completed' ? 'success' : 'error',
                      lastActivity: new Date()
                    });

                    // Voltar para idle apÃ³s 2 segundos
                    setTimeout(() => {
                      setAgentStatuses(current => {
                        const resetMap = new Map(current);
                        const resetAgent = resetMap.get(agentName);
                        if (resetAgent) {
                          resetMap.set(agentName, {
                            ...resetAgent,
                            status: 'idle'
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
            setActiveExecutions(prev => prev.filter(ex => ex.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (String(status) === 'SUBSCRIBED') {
          console.log('âœ… Subscribed to executions');
          setIsConnected(true);
        } else if (String(status) === 'CLOSED') {
          console.log('âŒ Executions subscription closed');
          setIsConnected(false);
        }
      });

    channels.push(executionsChannel);

    // Subscribe to agent_ai_logs
    const logsChannel = supabase
      .channel('agent_ai_logs_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_ai_logs',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('ðŸ“¡ New log:', payload);
          setLastRealtimeEventAt(Date.now());

          const log = payload.new as AgentLog;

          // Adicionar ao histÃ³rico de logs
          setRecentLogs(prev => [log, ...prev].slice(0, 50));

          // Atualizar status do agente
          setAgentStatuses(prev => {
            const newMap = new Map(prev);
            const agent = newMap.get(log.agent_name);
            if (agent) {
              newMap.set(log.agent_name, {
                ...agent,
                status: log.status === 'processing' ? 'processing' :
                        log.status === 'completed' ? 'success' :
                        log.status === 'failed' ? 'error' : 'idle',
                lastActivity: new Date(log.created_at),
                metrics: {
                  ...agent.metrics,
                  totalExecutions: agent.metrics.totalExecutions + 1,
                  totalTokens: agent.metrics.totalTokens + log.total_tokens
                }
              });

              // Voltar para idle apÃ³s 1.5 segundos se completou
              if (log.status === 'completed' || log.status === 'failed') {
                setTimeout(() => {
                  setAgentStatuses(current => {
                    const resetMap = new Map(current);
                    const resetAgent = resetMap.get(log.agent_name);
                    if (resetAgent && resetAgent.status !== 'processing') {
                      resetMap.set(log.agent_name, {
                        ...resetAgent,
                        status: 'idle'
                      });
                    }
                    return resetMap;
                  });
                }, 1500);
              }
            }
            return newMap;
          });
        }
      )
      .subscribe((status) => {
        if (String(status) === 'SUBSCRIBED') {
          console.log('âœ… Subscribed to logs');
        }
      });

    channels.push(logsChannel);

    // Cleanup
    return () => {
      console.log('ðŸ”Œ Unsubscribing from realtime channels');
      channels.forEach(channel => {
        void supabase.removeChannel(channel);
      });
      setIsConnected(false);
    };
  }, [tenantId]);
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
    refresh: fetchInitialMetrics
  };
}





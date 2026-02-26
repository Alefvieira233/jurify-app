/**
 * useAgentPipeline — Realtime subscription to agent execution pipeline
 *
 * Subscribes to a specific agent_executions row via Supabase Realtime.
 * Provides live status, currentAgent, stages, and final result.
 * Strict cleanup to prevent WebSocket connection leaks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types (mirroring agent_executions schema) ──────────────────────────────

export type PipelineStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export interface PipelineState {
  id: string;
  executionId: string;
  status: PipelineStatus;
  currentAgent: string | null;
  currentStage: string | null;
  agentsInvolved: string[];
  totalAgentsUsed: number;
  totalTokens: number;
  estimatedCostUsd: number;
  finalResult: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  totalDurationMs: number | null;
}

interface AgentExecutionRow {
  id: string;
  execution_id: string;
  status: string;
  current_agent: string | null;
  current_stage: string | null;
  agents_involved: string[];
  total_agents_used: number;
  total_tokens: number;
  estimated_cost_usd: number;
  final_result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  total_duration_ms: number | null;
}

const DEFAULT_STATE: PipelineState = {
  id: '',
  executionId: '',
  status: 'pending',
  currentAgent: null,
  currentStage: null,
  agentsInvolved: [],
  totalAgentsUsed: 0,
  totalTokens: 0,
  estimatedCostUsd: 0,
  finalResult: null,
  errorMessage: null,
  startedAt: '',
  completedAt: null,
  totalDurationMs: null,
};

function mapRowToState(row: AgentExecutionRow): PipelineState {
  return {
    id: row.id,
    executionId: row.execution_id,
    status: row.status as PipelineStatus,
    currentAgent: row.current_agent,
    currentStage: row.current_stage,
    agentsInvolved: row.agents_involved || [],
    totalAgentsUsed: row.total_agents_used || 0,
    totalTokens: row.total_tokens || 0,
    estimatedCostUsd: row.estimated_cost_usd || 0,
    finalResult: row.final_result,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    totalDurationMs: row.total_duration_ms,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAgentPipeline(executionId: string | null) {
  const [state, setState] = useState<PipelineState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);

  // Fetch initial state
  const fetchExecution = useCallback(async (execId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('agent_executions')
        .select('*')
        .eq('execution_id', execId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Execution not found');

      if (mountedRef.current) {
        setState(mapRowToState(data as AgentExecutionRow));
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch execution');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    mountedRef.current = true;

    if (!executionId) {
      setState(DEFAULT_STATE);
      return;
    }

    // Fetch initial state
    void fetchExecution(executionId);

    // Subscribe to changes on this specific row
    const channelName = `pipeline-${executionId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_executions',
          filter: `execution_id=eq.${executionId}`,
        },
        (payload) => {
          if (mountedRef.current && payload.new) {
            setState(mapRowToState(payload.new as AgentExecutionRow));
          }
        }
      )
      .subscribe((status) => {
        if ((status as string) === 'CHANNEL_ERROR' && mountedRef.current) {
          setError('Realtime connection error');
        }
      });

    channelRef.current = channel;

    // Strict cleanup — prevents WebSocket connection leaks
    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [executionId, fetchExecution]);

  // Derived state
  const isComplete = state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled' || state.status === 'timeout';
  const isRunning = state.status === 'pending' || state.status === 'processing';
  const expectedAgents = Math.max(state.totalAgentsUsed, state.agentsInvolved.length, 1);
  const progress = state.agentsInvolved.length > 0
    ? Math.min((state.agentsInvolved.length / expectedAgents) * 100, 100)
    : (state.status === 'processing' ? 5 : 0); // show minimal progress when processing starts

  return {
    state,
    loading,
    error,
    isComplete,
    isRunning,
    progress,
    refetch: () => executionId ? void fetchExecution(executionId) : undefined,
  };
}

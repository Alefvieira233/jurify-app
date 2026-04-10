/**
 * Shared types and constants for the Mission Control realtime agents hooks.
 *
 * Extracted from useRealtimeAgents.ts to keep the main hook under 400 lines
 * and to allow sub-hooks (e.g. useAgentExecutionsChannel) to consume the same
 * type definitions without pulling in the hook runtime.
 */

import type { Dispatch, SetStateAction } from 'react';

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
  lead_id?: string | null;
  status: string;
  current_agent?: string | null;
  current_stage?: string | null;
  started_at: string;
  updated_at: string;
  total_duration_ms?: number | null;
  agents_involved: string[] | null;
  total_agents_used?: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
}

export interface AgentLog {
  id: string;
  agent_name: string;
  user_prompt: string | null;
  result_preview: string | null;
  status: string | null;
  latency_ms: number | null;
  error_message: string | null;
  model: string | null;
  total_tokens: number | null;
  created_at: string;
}

export const AGENT_NAMES = [
  'Coordenador',
  'Qualificador',
  'Juridico',
  'Comercial',
  'Analista',
  'Comunicador',
  'CustomerSuccess',
] as const;

export type AgentStatusMap = Map<string, AgentStatus>;
export type SetAgentStatusMap = Dispatch<SetStateAction<AgentStatusMap>>;
export type SetActiveExecutions = Dispatch<SetStateAction<AgentExecution[]>>;

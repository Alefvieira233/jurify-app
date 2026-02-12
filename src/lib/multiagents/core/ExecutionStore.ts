/**
 * 🗄️ EXECUTION STORE - Persistência de Execuções no Supabase
 *
 * Gerencia a persistência de execuções de agentes no banco de dados.
 * Usa a tabela agent_executions já existente.
 *
 * @version 1.0.0
 */

import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import type { ExecutionStatus, StageResult } from '../types';

const COST_PER_1K_PROMPT_TOKENS = 0.01;

export interface ExecutionRecord {
  id: string;
  execution_id: string;
  lead_id: string | null;
  tenant_id: string;
  user_id: string | null;
  status: ExecutionStatus;
  current_agent: string | null;
  current_stage: string | null;
  started_at: string;
  completed_at: string | null;
  total_duration_ms: number | null;
  agents_involved: string[];
  total_agents_used: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  final_result: Record<string, unknown> | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export class ExecutionStore {
  /**
   * Cria uma nova execução no banco de dados
   */
  static async createExecution(
    executionId: string,
    leadId: string | null,
    tenantId: string,
    userId?: string | null
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('agent_executions')
        .insert({
          execution_id: executionId,
          lead_id: leadId,
          tenant_id: tenantId,
          user_id: userId || null,
          status: 'pending',
          current_agent: null,
          current_stage: 'new',
          agents_involved: [],
          total_agents_used: 0,
          total_prompt_tokens: 0,
          total_completion_tokens: 0,
          total_tokens: 0,
          estimated_cost_usd: 0,
          started_at: new Date().toISOString(),
          metadata: {},
        })
        .select('id')
        .single();

      if (error) {
        return null;
      }

      return data?.id ?? null;
    } catch (_error) {
      // Error handled silently
      return null;
    }
  }

  /**
   * Atualiza o status e agente atual da execução
   */
  static async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    currentAgent?: string,
    currentStage?: string
  ): Promise<void> {
    try {
      const updates: Record<string, unknown> = { status };

      if (currentAgent) {
        updates.current_agent = currentAgent;
      }
      if (currentStage) {
        updates.current_stage = currentStage;
      }

      const { error } = await supabase
        .from('agent_executions')
        .update(updates)
        .eq('execution_id', executionId);

      if (error) {
        // Error handled silently
      }
    } catch (_error) {
      // Error handled silently
    }
  }

  /**
   * Registra resultado de um estágio e acumula tokens
   */
  static async recordStageResult(
    executionId: string,
    stageResult: StageResult
  ): Promise<void> {
    try {
      // Busca execução atual para acumular valores
      const { data: current, error: fetchError } = await supabase
        .from('agent_executions')
        .select('agents_involved, total_tokens, total_prompt_tokens, total_completion_tokens, estimated_cost_usd')
        .eq('execution_id', executionId)
        .single();

      if (fetchError) {
        return;
      }

      const agentsInvolved = current?.agents_involved || [];
      if (!agentsInvolved.includes(stageResult.agentName)) {
        agentsInvolved.push(stageResult.agentName);
      }

      const newTotalTokens = (current?.total_tokens || 0) + stageResult.tokens;
      const estimatedCost = (newTotalTokens / 1000) * COST_PER_1K_PROMPT_TOKENS;

      const { error } = await supabase
        .from('agent_executions')
        .update({
          current_agent: stageResult.agentName,
          current_stage: stageResult.stageName,
          agents_involved: agentsInvolved,
          total_agents_used: agentsInvolved.length,
          total_tokens: newTotalTokens,
          estimated_cost_usd: estimatedCost,
        })
        .eq('execution_id', executionId);

      if (error) {
        // Error handled silently
      }
    } catch (_error) {
      // Error handled silently
    }
  }

  /**
   * Marca execução como completa com resultado final
   */
  static async completeExecution(
    executionId: string,
    finalResult: Record<string, unknown>,
    totalTokens: number
  ): Promise<void> {
    try {
      const completedAt = new Date();

      // Busca started_at para calcular duração
      const { data: execution } = await supabase
        .from('agent_executions')
        .select('started_at')
        .eq('execution_id', executionId)
        .single();

      const startedAt = execution?.started_at ? new Date(execution.started_at) : new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const estimatedCost = (totalTokens / 1000) * COST_PER_1K_PROMPT_TOKENS;

      const { error } = await supabase
        .from('agent_executions')
        .update({
          status: 'completed',
          completed_at: completedAt.toISOString(),
          total_duration_ms: durationMs,
          total_tokens: totalTokens,
          estimated_cost_usd: estimatedCost,
          final_result: finalResult,
        })
        .eq('execution_id', executionId);

      if (error) {
        // Error handled silently
      }
    } catch (_error) {
      // Error handled silently
    }
  }

  /**
   * Marca execução como falha
   */
  static async failExecution(
    executionId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('agent_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq('execution_id', executionId);

      if (error) {
        // Error handled silently
      }
    } catch (_error) {
      // Error handled silently
    }
  }

  /**
   * Busca execução por ID
   */
  static async getExecution(executionId: string): Promise<ExecutionRecord | null> {
    try {
      const { data, error } = await supabase
        .from('agent_executions')
        .select('*')
        .eq('execution_id', executionId)
        .single();

      if (error) {
        return null;
      }

      return data as ExecutionRecord;
    } catch (_error) {
      // Error handled silently
      return null;
    }
  }
}

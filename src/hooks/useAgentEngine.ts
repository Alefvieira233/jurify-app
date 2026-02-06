/**
 * 🤖 useAgentEngine - Hook Composto para Gerenciamento de Agentes
 * 
 * REFATORADO: Este hook agora usa composição de hooks menores:
 * - useAgentStats: Estatísticas e métricas
 * - useAgentCrud: Operações CRUD
 * - useAgentTest: Testes de agentes
 * 
 * A API pública permanece compatível para não quebrar código existente.
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AgentType, LegacyAgentConfig as AgentConfig } from '@/lib/multiagents/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentStats, useAgentCrud, useAgentTest } from './agents';
import type { AgentStats, AgentPerformance, CreateAgentRequest } from './agents';

export type { AgentStats, AgentPerformance, CreateAgentRequest };

export const useAgentEngine = () => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const tenantId = profile?.tenant_id ?? null;

  // Composição de hooks especializados
  const { agentStats, performance, loadAgentStats, loadPerformance, getAgentStats } = useAgentStats(tenantId);
  
  const loadAgents = useCallback(async () => {
    if (!user || !tenantId) return;

    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('agentes_ia')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const agentConfigs = data.map((agent) => ({
        id: agent.id,
        name: agent.nome,
        type: agent.tipo_agente as AgentType,
        area_juridica: agent.area_juridica,
        prompt_base: agent.prompt_base || '',
        personality: agent.parametros_avancados?.personality || 'Profissional e acessivel',
        specialization: agent.parametros_avancados?.specialization || ['geral'],
        max_interactions: agent.parametros_avancados?.max_interactions || 50,
        escalation_rules: agent.parametros_avancados?.escalation_rules || [],
        active: agent.ativo,
      }));

      setAgents(agentConfigs);
      await loadAgentStats(agentConfigs.map((a) => a.id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar agentes';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [tenantId, toast, user, loadAgentStats]);

  const { loading, createAgent, updateAgent, toggleAgentStatus: toggleStatus, deleteAgent } = useAgentCrud(tenantId, loadAgents);
  const { testAgent } = useAgentTest(tenantId);

  // Wrapper para manter compatibilidade com API antiga
  const toggleAgentStatus = useCallback(async (agentId: string): Promise<boolean> => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      toast({
        title: 'Erro',
        description: 'Agente nao encontrado',
        variant: 'destructive',
      });
      return false;
    }
    return toggleStatus(agentId, agent.active);
  }, [agents, toggleStatus, toast]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (agents.length > 0) {
      void loadPerformance();
    }
  }, [agents, loadPerformance]);

  return {
    agents,
    agentStats,
    performance,
    loading,
    error,
    createAgent,
    updateAgent,
    toggleAgentStatus,
    deleteAgent,
    testAgent,
    loadAgents,
    loadPerformance,
    getAgentStats,
    getActiveAgents: () => agents.filter((a) => a.active),
    getAgentsByType: (type: AgentType) => agents.filter((a) => a.type === type),
    getAgentsByArea: (area: string) => agents.filter((a) => a.area_juridica === area),
  };
};

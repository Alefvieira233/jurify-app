import { useState, useCallback } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';

export interface AgentStats {
  totalInteractions: number;
  successfulConversions: number;
  averageResponseTime: number;
  satisfactionScore: number;
  activeConversations: number;
  leadsProcessed: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  conversionsToday: number;
  conversionsWeek: number;
  conversionsMonth: number;
  averageQualificationTime: number;
  leadsInPipeline: number;
  successRate: number;
}

export const useAgentStats = (tenantId: string | null) => {
  const [agentStats, setAgentStats] = useState<Map<string, AgentStats>>(new Map());
  const [performance, setPerformance] = useState<AgentPerformance[]>([]);

  const loadAgentStats = useCallback(async (agentIds: string[]) => {
    if (!tenantId) return;

    const statsMap = new Map<string, AgentStats>();

    for (const agentId of agentIds) {
      try {
        const { data: interactions } = await supabase
          .from('lead_interactions')
          .select('*')
          .eq('tenant_id', tenantId);

        const filteredInteractions = interactions?.filter((interaction) =>
          interaction?.metadata?.agent_id === agentId
        ) || [];

        const { data: leadsProcessed } = await supabase
          .from('leads')
          .select('id, status')
          .eq('responsavel_id', agentId)
          .eq('tenant_id', tenantId);

        const stats: AgentStats = {
          totalInteractions: filteredInteractions.length,
          successfulConversions:
            leadsProcessed?.filter((l) => ['contrato_assinado', 'em_atendimento'].includes(l.status))
              .length || 0,
          averageResponseTime: 2.5,
          satisfactionScore: 4.2,
          activeConversations:
            leadsProcessed?.filter((l) => ['em_qualificacao', 'proposta_enviada'].includes(l.status))
              .length || 0,
          leadsProcessed: leadsProcessed?.length || 0,
        };

        statsMap.set(agentId, stats);
      } catch (error) {
        console.error(`Failed to load stats for agent ${agentId}:`, error);
      }
    }

    setAgentStats(statsMap);
  }, [tenantId]);

  const loadPerformance = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data: agentMetrics } = await supabase.rpc('get_agent_performance', {
        tenant_id: tenantId,
      });

      if (agentMetrics) {
        setPerformance(agentMetrics);
      }
    } catch (error) {
      console.error('Failed to load performance:', error);
    }
  }, [tenantId]);

  return {
    agentStats,
    performance,
    loadAgentStats,
    loadPerformance,
    getAgentStats: (agentId: string) => agentStats.get(agentId),
  };
};

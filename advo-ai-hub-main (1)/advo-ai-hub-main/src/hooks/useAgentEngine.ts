import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { agentEngine, AgentType, AgentConfig } from '@/lib/agents/AgentEngine';
import { workflowProcessor, WorkflowType } from '@/lib/agents/WorkflowProcessor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AgentStats {
  totalInteractions: number;
  successfulConversions: number;
  averageResponseTime: number;
  satisfactionScore: number;
  activeConversations: number;
  leadsProcessed: number;
}

export interface CreateAgentRequest {
  name: string;
  type: AgentType;
  area_juridica: string;
  prompt_base: string;
  personality: string;
  specialization: string[];
  escalation_keywords: string[];
  max_interactions: number;
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

export const useAgentEngine = () => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentStats, setAgentStats] = useState<Map<string, AgentStats>>(new Map());
  const [performance, setPerformance] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const tenantId = profile?.tenant_id ?? null;

  const loadAgents = useCallback(async () => {
    if (!user || !tenantId) return;

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast, user]);

  const loadAgentStats = async (agentIds: string[]) => {
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
  };

  const createAgent = async (agentData: CreateAgentRequest): Promise<boolean> => {
    if (!user || !tenantId) {
      toast({
        title: 'Erro',
        description: 'Usuario nao autenticado.',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);

    try {
      if (!agentData.name || !agentData.type || !agentData.area_juridica) {
        throw new Error('Dados obrigatorios nao preenchidos');
      }

      const escalationRules = generateEscalationRules(agentData.type, agentData.escalation_keywords);

      const { error: insertError } = await supabase
        .from('agentes_ia')
        .insert({
          nome: agentData.name,
          tipo_agente: agentData.type,
          area_juridica: agentData.area_juridica,
          prompt_base: agentData.prompt_base,
          descricao_funcao: getAgentDescription(agentData.type),
          parametros_avancados: {
            personality: agentData.personality,
            specialization: agentData.specialization,
            max_interactions: agentData.max_interactions,
            escalation_rules: escalationRules,
          },
          ativo: true,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await loadAgents();

      toast({
        title: 'Sucesso',
        description: `Agente ${agentData.name} criado com sucesso.`,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar agente';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateAgent = async (agentId: string, updates: Partial<CreateAgentRequest>): Promise<boolean> => {
    if (!tenantId) return false;

    setLoading(true);

    try {
      const updateData: any = {};

      if (updates.name) updateData.nome = updates.name;
      if (updates.area_juridica) updateData.area_juridica = updates.area_juridica;
      if (updates.prompt_base) updateData.prompt_base = updates.prompt_base;

      if (updates.personality || updates.specialization || updates.max_interactions) {
        const { data: currentAgent } = await supabase
          .from('agentes_ia')
          .select('parametros_avancados')
          .eq('id', agentId)
          .eq('tenant_id', tenantId)
          .single();

        const currentParams = currentAgent?.parametros_avancados || {};

        updateData.parametros_avancados = {
          ...currentParams,
          ...(updates.personality && { personality: updates.personality }),
          ...(updates.specialization && { specialization: updates.specialization }),
          ...(updates.max_interactions && { max_interactions: updates.max_interactions }),
        };
      }

      const { error: updateError } = await supabase
        .from('agentes_ia')
        .update(updateData)
        .eq('id', agentId)
        .eq('tenant_id', tenantId);

      if (updateError) throw updateError;

      await loadAgents();

      toast({
        title: 'Sucesso',
        description: 'Agente atualizado com sucesso.',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar agente';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentStatus = async (agentId: string): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) throw new Error('Agente nao encontrado');

      const newStatus = !agent.active;

      const { error } = await supabase
        .from('agentes_ia')
        .update({ ativo: newStatus })
        .eq('id', agentId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await loadAgents();

      toast({
        title: 'Sucesso',
        description: `Agente ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar status';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteAgent = async (agentId: string): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      const { data: activeConversations } = await supabase
        .from('lead_interactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const recentAgentInteractions = (activeConversations || []).filter((interaction) =>
        interaction?.metadata?.agent_id === agentId
      );

      if (recentAgentInteractions.length > 0) {
        throw new Error('Nao e possivel remover agente com conversas ativas nas ultimas 24h');
      }

      const { error } = await supabase
        .from('agentes_ia')
        .delete()
        .eq('id', agentId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await loadAgents();

      toast({
        title: 'Sucesso',
        description: 'Agente removido com sucesso.',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover agente';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  const testAgent = async (agentId: string, testMessage: string): Promise<string> => {
    try {
      const testLeadId = `test_${Date.now()}`;
      const response = await agentEngine.processLeadMessage(testLeadId, testMessage);

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao testar agente';
      toast({
        title: 'Erro no teste',
        description: errorMessage,
        variant: 'destructive',
      });
      return 'Erro ao processar teste';
    }
  };

  const loadPerformance = async () => {
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
  };

  const generateEscalationRules = (agentType: AgentType, keywords: string[]) => {
    const baseRules = [];

    switch (agentType) {
      case AgentType.SDR:
        baseRules.push({
          condition: 'lead_qualified',
          next_agent_type: AgentType.CLOSER,
          trigger_keywords: ['interessado', 'orcamento', 'proposta', 'contratar', ...keywords],
          confidence_threshold: 0.7,
        });
        break;

      case AgentType.CLOSER:
        baseRules.push({
          condition: 'contract_signed',
          next_agent_type: AgentType.CS,
          trigger_keywords: ['assinado', 'contrato', 'aceito', 'fechado', ...keywords],
          confidence_threshold: 0.8,
        });
        break;

      case AgentType.CS:
        break;
    }

    return baseRules;
  };

  const getAgentDescription = (type: AgentType): string => {
    switch (type) {
      case AgentType.SDR:
        return 'Especialista em qualificacao de leads e identificacao de oportunidades';
      case AgentType.CLOSER:
        return 'Especialista em fechamento de negocios e apresentacao de propostas';
      case AgentType.CS:
        return 'Especialista em sucesso do cliente e acompanhamento de casos';
      default:
        return 'Assistente juridico inteligente';
    }
  };

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (agents.length > 0) {
      loadPerformance();
    }
  }, [agents]);

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
    getAgentStats: (agentId: string) => agentStats.get(agentId),
    getActiveAgents: () => agents.filter((a) => a.active),
    getAgentsByType: (type: AgentType) => agents.filter((a) => a.type === type),
    getAgentsByArea: (area: string) => agents.filter((a) => a.area_juridica === area),
  };
};

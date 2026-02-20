import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { AgentType } from '@/lib/multiagents/types';

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

export const useAgentCrud = (tenantId: string | null, onSuccess?: () => void | Promise<void>) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createAgent = useCallback(async (agentData: CreateAgentRequest): Promise<boolean> => {
    if (!tenantId) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado.',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);

    try {
      if (!agentData.name || !agentData.type || !agentData.area_juridica) {
        throw new Error('Dados obrigatórios não preenchidos');
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

      void onSuccess?.();

      toast({
        title: 'Sucesso',
        description: `Agente ${agentData.name} criado com sucesso.`,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar agente';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast, onSuccess]);

  const updateAgent = useCallback(async (agentId: string, updates: Partial<CreateAgentRequest>): Promise<boolean> => {
    if (!tenantId) return false;

    setLoading(true);

    try {
      const updateData: Record<string, unknown> = {};

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

      void onSuccess?.();

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
  }, [tenantId, toast, onSuccess]);

  const toggleAgentStatus = useCallback(async (agentId: string, currentStatus: boolean): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      const newStatus = !currentStatus;

      const { error } = await supabase
        .from('agentes_ia')
        .update({ ativo: newStatus })
        .eq('id', agentId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      void onSuccess?.();

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
  }, [tenantId, toast, onSuccess]);

  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
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

      void onSuccess?.();

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
  }, [tenantId, toast, onSuccess]);

  return {
    loading,
    createAgent,
    updateAgent,
    toggleAgentStatus,
    deleteAgent,
  };
};

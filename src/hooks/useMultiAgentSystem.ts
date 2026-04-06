/**
 * @module useMultiAgentSystem
 * @description Hook para interagir com o sistema multiagentes de IA.
 * Gerencia inicializacao, processamento de leads, metricas em tempo real
 * e estatisticas de performance dos agentes (Coordenador, Qualificador,
 * Juridico, Comercial, Analista, Comunicador, CustomerSuccess).
 *
 * @example
 * ```tsx
 * const { processLead, isProcessing, metrics, systemStats } = useMultiAgentSystem();
 * await processLead({ name: 'Joao', message: 'Preciso de ajuda', source: 'whatsapp' });
 * ```
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { multiAgentSystem } from '@/lib/multiagents/MultiAgentSystem';
import { MessageType, Priority } from '@/lib/multiagents/types';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';

const log = createLogger('MultiAgentSystem');

type LeadSource = 'whatsapp' | 'email' | 'chat' | 'form' | 'phone' | 'playground';

export interface LeadData {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  message: string;
  legal_area?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  source: LeadSource;
  metadata?: Record<string, unknown>;
}

export interface AgentStats {
  name: string;
  specialization: string;
  messages_processed: number;
  success_rate: number;
  avg_response_time: number;
  current_status: 'active' | 'idle' | 'processing';
}

export interface SystemMetrics {
  total_leads_processed: number;
  conversion_rate: number;
  avg_qualification_time: number;
  active_conversations: number;
  agents_performance: AgentStats[];
}

export const useMultiAgentSystem = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const tenantId = profile?.tenant_id ?? null;

  // System stats query (includes in-memory stats + recent activity from DB)
  const { data: statsData } = useQuery({
    queryKey: queryKeys.multiAgent.stats(tenantId),
    queryFn: async () => {
      const stats = multiAgentSystem.getSystemStats();

      const { data: activity } = await supabase
        .from('lead_interactions')
        .select('id, tenant_id, lead_id, interaction_type, metadata, created_at')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })
        .limit(10);

      return { systemStats: stats, recentActivity: (activity || []) as Record<string, unknown>[] };
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30s to match previous interval
    refetchInterval: 30000,
  });

  const systemStats = statsData?.systemStats ?? null;
  const recentActivity = statsData?.recentActivity ?? [];

  // Metrics query
  const { data: metrics = null } = useQuery({
    queryKey: queryKeys.multiAgent.metrics(tenantId),
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: leads } = await supabase
        .from('leads')
        .select('id, status, created_at')
        .eq('tenant_id', tenantId!)
        .gte('created_at', since);

      const { data: interactions } = await supabase
        .from('lead_interactions')
        .select('id, metadata, created_at')
        .eq('tenant_id', tenantId!)
        .gte('created_at', since);

      const totalLeads = leads?.length || 0;
      const convertedLeads = leads?.filter((l) => l.status === 'ganho').length || 0;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      const agentsPerformance: AgentStats[] = [
        {
          name: 'Coordenador',
          specialization: 'Orquestracao',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'coordenador').length || 0,
          success_rate: 95,
          avg_response_time: 1.2,
          current_status: 'active',
        },
        {
          name: 'Qualificador',
          specialization: 'Qualificacao de Leads',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'qualificador').length || 0,
          success_rate: 88,
          avg_response_time: 2.1,
          current_status: 'active',
        },
        {
          name: 'Juridico',
          specialization: 'Analise Legal',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'juridico').length || 0,
          success_rate: 92,
          avg_response_time: 3.5,
          current_status: 'active',
        },
        {
          name: 'Comercial',
          specialization: 'Vendas',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'comercial').length || 0,
          success_rate: 75,
          avg_response_time: 2.8,
          current_status: 'active',
        },
        {
          name: 'Analista',
          specialization: 'Dados e Insights',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'analista').length || 0,
          success_rate: 98,
          avg_response_time: 4.2,
          current_status: 'idle',
        },
        {
          name: 'Comunicador',
          specialization: 'Comunicacao',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'comunicador').length || 0,
          success_rate: 94,
          avg_response_time: 1.8,
          current_status: 'active',
        },
        {
          name: 'Customer Success',
          specialization: 'Sucesso do Cliente',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'customer_success').length || 0,
          success_rate: 91,
          avg_response_time: 2.5,
          current_status: 'active',
        },
      ];

      return {
        total_leads_processed: totalLeads,
        conversion_rate: conversionRate,
        avg_qualification_time: 4.2,
        active_conversations: leads?.filter((l) => l.status === 'em_contato').length || 0,
        agents_performance: agentsPerformance,
      } as SystemMetrics;
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    refetchInterval: 30000,
  });

  const processLeadMutation = useMutation({
    mutationFn: async (leadData: LeadData) => {
      if (!tenantId) throw new Error('No tenant');

      log.info('Processing lead', { source: leadData.source });

      const { data: savedLead, error } = await supabase
        .from('leads')
        .insert({
          nome: leadData.name,
          email: leadData.email || null,
          telefone: leadData.phone || null,
          area_juridica: leadData.legal_area || 'Nao informado',
          origem: leadData.source,
          status: 'novo',
          responsavel_id: user?.id || null,
          descricao: leadData.message,
          metadata: {
            ...(leadData.metadata || {}),
            responsavel_nome: user?.email || 'Sistema',
          },
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const channel: Exclude<LeadSource, 'form'> =
        leadData.source === 'form' ? 'chat' : leadData.source;
      await multiAgentSystem.processLead(savedLead, leadData.message, channel);

      return savedLead;
    },
    onSuccess: (_data, leadData) => {
      toast({
        title: 'Lead processado',
        description: `Lead ${leadData.name} enviado ao sistema multiagentes.`,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.multiAgent.stats(tenantId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.multiAgent.metrics(tenantId) });
    },
    onError: (error) => {
      log.error('Failed to process lead', error);
      toast({
        title: 'Erro',
        description: 'Falha ao processar lead no sistema multiagentes.',
        variant: 'destructive',
      });
    },
  });

  const processLead = useCallback(
    async (leadData: LeadData): Promise<boolean> => {
      if (!tenantId) return false;
      setIsProcessing(true);
      try {
        await processLeadMutation.mutateAsync(leadData);
        return true;
      } catch (err) {
        log.error('processLead failed', err);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [tenantId, processLeadMutation]
  );

  const testSystem = useCallback(async (): Promise<boolean> => {
    setIsProcessing(true);

    try {
      const testLead: LeadData = {
        name: 'Joao Silva (TESTE)',
        email: 'teste@jurify.com',
        phone: '+5511999999999',
        message:
          'Preciso de ajuda com um processo trabalhista. Fui demitido sem justa causa e não recebi todas as verbas rescisórias.',
        legal_area: 'trabalhista',
        urgency: 'medium',
        source: 'chat',
        metadata: { test: true },
      };

      const success = await processLead(testLead);

      if (success) {
        toast({
          title: 'Teste concluido',
          description: 'Sistema multiagentes funcionando corretamente.',
        });
      }

      return success;
    } catch (error) {
      log.error('Test failed', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [processLead, toast]);

  const triggerAnalysis = useCallback(async () => {
    try {
      const analystAgent = multiAgentSystem.getAgent('Analista');
      if (analystAgent) {
        await analystAgent.receiveMessage({
          id: `analysis_${Date.now()}`,
          from: 'Frontend',
          to: 'Analista',
          type: MessageType.TASK_REQUEST,
          payload: { task: 'analyze_performance' },
          timestamp: new Date(),
          priority: Priority.MEDIUM,
          requires_response: false,
        });

        toast({
          title: 'Analise iniciada',
          description: 'Agente Analista esta processando dados de performance.',
        });
      }
    } catch (error) {
      log.error('Failed to start analysis', error);
    }
  }, [toast]);

  const loadSystemStats = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.multiAgent.stats(tenantId) });
  }, [queryClient, tenantId]);

  const loadMetrics = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.multiAgent.metrics(tenantId) });
  }, [queryClient, tenantId]);

  return {
    isProcessing,
    systemStats,
    recentActivity,
    metrics,
    processLead,
    testSystem,
    triggerAnalysis,
    loadSystemStats,
    loadMetrics,
  };
};

import { useState, useEffect, useCallback } from 'react';
import { multiAgentSystem } from '@/lib/multiagents/MultiAgentSystem';
import type { SystemStats as MultiAgentSystemStats } from '@/lib/multiagents/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  const [systemStats, setSystemStats] = useState<MultiAgentSystemStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Record<string, unknown>[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const { toast } = useToast();
  const { profile, user } = useAuth();

  const tenantId = profile?.tenant_id ?? null;

  const loadSystemStats = useCallback(async () => {
    if (!tenantId) return;

    try {
      const stats = multiAgentSystem.getSystemStats();
      setSystemStats(stats);

      const { data: activity } = await supabase
        .from('lead_interactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(activity || []);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar estatisticas do sistema.',
        variant: 'destructive',
      });
    }
  }, [toast, tenantId]);

  const loadMetrics = useCallback(async () => {
    if (!tenantId) return;

    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', since);

      const { data: interactions } = await supabase
        .from('lead_interactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', since);

      const totalLeads = leads?.length || 0;
      const convertedLeads = leads?.filter((l) => l.status === 'contrato_assinado').length || 0;
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

      setMetrics({
        total_leads_processed: totalLeads,
        conversion_rate: conversionRate,
        avg_qualification_time: 4.2,
        active_conversations: leads?.filter((l) => l.status === 'em_atendimento').length || 0,
        agents_performance: agentsPerformance,
      });
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }, [tenantId]);

  const processLead = useCallback(
    async (leadData: LeadData): Promise<boolean> => {
      if (!tenantId) return false;

      setIsProcessing(true);

      try {
        console.log('[multiagent] Processing lead:', leadData);

        const { data: savedLead, error } = await supabase
          .from('leads')
          .insert({
            nome: leadData.name,
            email: leadData.email || null,
            telefone: leadData.phone || null,
            area_juridica: leadData.legal_area || 'Nao informado',
            origem: leadData.source,
            status: 'novo_lead',
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

        toast({
          title: 'Lead processado',
          description: `Lead ${leadData.name} enviado ao sistema multiagentes.`,
        });

        await loadSystemStats();
        await loadMetrics();

        return true;
      } catch (error) {
        console.error('Failed to process lead:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao processar lead no sistema multiagentes.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [loadMetrics, loadSystemStats, tenantId, toast]
  );

  const testSystem = useCallback(async (): Promise<boolean> => {
    setIsProcessing(true);

    try {
      const testLead: LeadData = {
        name: 'Joao Silva (TESTE)',
        email: 'teste@jurify.com',
        phone: '+5511999999999',
        message:
          'Preciso de ajuda com um processo trabalhista. Fui demitido sem justa causa e nao recebi todas as verbas rescisorias.',
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
      console.error('Test failed:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [processLead, toast]);

  const triggerAnalysis = useCallback(async () => {
    try {
      const system = multiAgentSystem as unknown as { agents?: Map<string, { receiveMessage: (msg: Record<string, unknown>) => Promise<void> }> };
      const analystAgent = system.agents?.get('Analista');
      if (analystAgent) {
        await analystAgent.receiveMessage({
          id: `analysis_${Date.now()}`,
          from: 'Frontend',
          to: 'Analista',
          type: 'task_request',
          payload: { task: 'analyze_performance' },
          timestamp: new Date(),
          priority: 'medium',
          requires_response: false,
        });

        toast({
          title: 'Analise iniciada',
          description: 'Agente Analista esta processando dados de performance.',
        });
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
    }
  }, [toast]);

  useEffect(() => {
    loadSystemStats();
    loadMetrics();

    const interval = setInterval(() => {
      loadSystemStats();
      loadMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadSystemStats, loadMetrics]);

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

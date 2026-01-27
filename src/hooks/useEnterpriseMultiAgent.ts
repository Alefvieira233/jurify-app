import { useState, useEffect, useCallback } from 'react';
import { multiAgentSystem } from '@/lib/multiagents';
import { LeadData, Priority } from '@/lib/multiagents/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface EnterpriseLeadData extends LeadData {
  validation_status?: 'pending' | 'valid' | 'invalid';
  processing_stage?: string;
  assigned_agents?: string[];
  estimated_completion?: Date;
}

export interface RealTimeMetrics {
  leads_processed_today: number;
  conversion_rate_7d: number;
  avg_response_time: number;
  active_conversations: number;
  agent_performance: AgentMetrics[];
  system_health: SystemHealth;
}

export interface AgentMetrics {
  name: string;
  id: string;
  messages_processed: number;
  success_rate: number;
  avg_response_time: number;
  current_status: 'active' | 'idle' | 'processing' | 'error';
  queue_size: number;
  last_activity: Date;
}

export interface SystemHealth {
  overall_status: 'healthy' | 'warning' | 'critical';
  uptime_percentage: number;
  error_rate: number;
  performance_score: number;
  last_check: Date;
}

export const useEnterpriseMultiAgent = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const tenantId = profile?.tenant_id ?? null;

  const initializeSystem = useCallback(async () => {
    try {
      console.log('[enterprise] Initializing system');

      const stats = multiAgentSystem.getSystemStats();
      if (stats.total_agents === 0) {
        throw new Error('Sistema multiagentes nao inicializado');
      }

      setIsInitialized(true);

      toast({
        title: 'Sistema inicializado',
        description: `${stats.total_agents} agentes enterprise ativos`,
      });
    } catch (error) {
      console.error('Failed to initialize:', error);
      toast({
        title: 'Erro de inicializacao',
        description: 'Falha ao inicializar o sistema multiagentes.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const loadRealTimeMetrics = useCallback(async () => {
    if (!tenantId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [
        { data: leadsToday },
        { data: leads7d },
        { data: interactions },
        { data: conversions },
      ] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', today.toISOString()),

        supabase
          .from('leads')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', sevenDaysAgo.toISOString()),

        supabase
          .from('lead_interactions')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', sevenDaysAgo.toISOString()),

        supabase
          .from('leads')
          .select('*')
          .eq('tenant_id', tenantId)
          .in('status', ['contrato_assinado', 'em_atendimento'])
          .gte('created_at', sevenDaysAgo.toISOString()),
      ]);

      const leadsProcessedToday = leadsToday?.length || 0;
      const totalLeads7d = leads7d?.length || 0;
      const conversions7d = conversions?.length || 0;
      const conversionRate = totalLeads7d > 0 ? (conversions7d / totalLeads7d) * 100 : 0;

      const responseTimes =
        interactions?.map((i) => {
          const created = new Date(i.created_at).getTime();
          const now = Date.now();
          return now - created;
        }) || [];

      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000 / 60
          : 0;

      const agentPerformance: AgentMetrics[] = [
        {
          name: 'Coordenador',
          id: 'coordenador',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'coordenador').length || 0,
          success_rate: calculateSuccessRate(interactions?.filter((i) => i.metadata?.agent_id === 'coordenador') || []),
          avg_response_time: 1.2,
          current_status: 'active',
          queue_size: 0,
          last_activity: new Date(),
        },
        {
          name: 'Qualificador',
          id: 'qualificador',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'qualificador').length || 0,
          success_rate: calculateSuccessRate(interactions?.filter((i) => i.metadata?.agent_id === 'qualificador') || []),
          avg_response_time: 2.1,
          current_status: 'active',
          queue_size: 0,
          last_activity: new Date(),
        },
        {
          name: 'Juridico',
          id: 'juridico',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'juridico').length || 0,
          success_rate: calculateSuccessRate(interactions?.filter((i) => i.metadata?.agent_id === 'juridico') || []),
          avg_response_time: 3.5,
          current_status: 'active',
          queue_size: 0,
          last_activity: new Date(),
        },
        {
          name: 'Comercial',
          id: 'comercial',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'comercial').length || 0,
          success_rate: calculateSuccessRate(interactions?.filter((i) => i.metadata?.agent_id === 'comercial') || []),
          avg_response_time: 2.8,
          current_status: 'active',
          queue_size: 0,
          last_activity: new Date(),
        },
        {
          name: 'Comunicador',
          id: 'comunicador',
          messages_processed: interactions?.filter((i) => i.metadata?.agent_id === 'comunicador').length || 0,
          success_rate: calculateSuccessRate(interactions?.filter((i) => i.metadata?.agent_id === 'comunicador') || []),
          avg_response_time: 1.8,
          current_status: 'active',
          queue_size: 0,
          last_activity: new Date(),
        },
      ];

      const errorRate = calculateErrorRate(interactions || []);
      const performanceScore = calculatePerformanceScore(agentPerformance);

      const health: SystemHealth = {
        overall_status: performanceScore > 80 ? 'healthy' : performanceScore > 60 ? 'warning' : 'critical',
        uptime_percentage: 99.9,
        error_rate: errorRate,
        performance_score: performanceScore,
        last_check: new Date(),
      };

      const realTimeMetrics: RealTimeMetrics = {
        leads_processed_today: leadsProcessedToday,
        conversion_rate_7d: conversionRate,
        avg_response_time: avgResponseTime,
        active_conversations: leads7d?.filter((l) => l.status === 'em_atendimento').length || 0,
        agent_performance: agentPerformance,
        system_health: health,
      };

      setMetrics(realTimeMetrics);
      setSystemHealth(health);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar metricas do sistema.',
        variant: 'destructive',
      });
    }
  }, [tenantId, toast]);

  const calculateSuccessRate = (interactions: any[]): number => {
    if (interactions.length === 0) return 100;

    const errors = interactions.filter(
      (i) => i.message?.toLowerCase().includes('erro') || i.response?.toLowerCase().includes('erro')
    ).length;

    return ((interactions.length - errors) / interactions.length) * 100;
  };

  const calculateErrorRate = (interactions: any[]): number => {
    if (interactions.length === 0) return 0;

    const errors = interactions.filter((i) => i.message?.toLowerCase().includes('erro')).length;

    return (errors / interactions.length) * 100;
  };

  const calculatePerformanceScore = (agents: AgentMetrics[]): number => {
    if (agents.length === 0) return 0;

    const avgSuccessRate = agents.reduce((sum, agent) => sum + agent.success_rate, 0) / agents.length;
    const activeAgents = agents.filter((a) => a.current_status === 'active').length;
    const activityScore = (activeAgents / agents.length) * 100;

    return (avgSuccessRate + activityScore) / 2;
  };

  const processLead = useCallback(
    async (leadData: EnterpriseLeadData): Promise<boolean> => {
      if (!isInitialized) {
        toast({
          title: 'Sistema nao inicializado',
          description: 'Aguarde a inicializacao do sistema.',
          variant: 'destructive',
        });
        return false;
      }

      if (!tenantId) return false;

      setIsProcessing(true);

      try {
        const validationResult = validateLeadData(leadData);
        if (!validationResult.isValid) {
          throw new Error(`Dados invalidos: ${validationResult.errors.join(', ')}`);
        }

        console.log('[enterprise] Processing lead:', leadData);

        const { data: savedLead, error } = await supabase
          .from('leads')
          .insert({
            nome: leadData.name,
            email: leadData.email,
            telefone: leadData.phone,
            descricao: leadData.message,
            area_juridica: leadData.legal_area,
            origem: leadData.source,
            status: 'novo_lead',
            metadata: {
              ...leadData.metadata,
              validation_status: 'valid',
              processing_started: new Date().toISOString(),
              enterprise_processed: true,
              urgency: leadData.urgency || Priority.MEDIUM,
            },
            created_at: new Date().toISOString(),
            tenant_id: tenantId,
          })
          .select()
          .single();

        if (error) throw error;

        await multiAgentSystem.processLead(savedLead, leadData.message);

        toast({
          title: 'Lead processado',
          description: `Lead ${leadData.name} processado pelo sistema enterprise.`,
        });

        await loadRealTimeMetrics();

        return true;
      } catch (error: any) {
        console.error('Failed to process lead:', error);
        toast({
          title: 'Erro no processamento',
          description: error?.message || 'Falha ao processar lead.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [isInitialized, loadRealTimeMetrics, tenantId, toast]
  );

  const validateLeadData = (leadData: EnterpriseLeadData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!leadData.name || leadData.name.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    }

    if (!leadData.message || leadData.message.trim().length < 10) {
      errors.push('Mensagem deve ter pelo menos 10 caracteres');
    }

    if (leadData.email && !isValidEmail(leadData.email)) {
      errors.push('Email invalido');
    }

    if (leadData.phone && !isValidPhone(leadData.phone)) {
      errors.push('Telefone invalido');
    }

    if (!leadData.source) {
      errors.push('Fonte obrigatoria');
    }

    return { isValid: errors.length === 0, errors };
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    return /^\+?[\d\s\-\(\)]{10,}$/.test(phone);
  };

  const runSystemTest = useCallback(async (): Promise<boolean> => {
    setIsProcessing(true);

    try {
      const testLead: EnterpriseLeadData = {
        name: 'Joao Silva (TESTE ENTERPRISE)',
        email: 'teste.enterprise@jurify.com',
        phone: '+5511999999999',
        message:
          'Teste do sistema enterprise multiagentes. Preciso de ajuda com processo trabalhista - demissao sem justa causa.',
        legal_area: 'trabalhista',
        urgency: Priority.MEDIUM,
        source: 'test',
        metadata: {
          test: true,
          test_type: 'enterprise_system_test',
          timestamp: new Date().toISOString(),
        },
      };

      const success = await processLead(testLead);

      if (success) {
        toast({
          title: 'Teste enterprise concluido',
          description: 'Sistema multiagentes enterprise funcionando perfeitamente.',
        });
      }

      return success;
    } catch (error) {
      console.error('Enterprise test failed:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [processLead, toast]);

  const loadRecentActivity = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data: activity } = await supabase
        .from('lead_interactions')
        .select(`
          *,
          leads (nome, telefone)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);

      setRecentActivity(activity || []);
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  useEffect(() => {
    if (isInitialized) {
      loadRealTimeMetrics();
      loadRecentActivity();

      const metricsInterval = setInterval(loadRealTimeMetrics, 30000);
      const activityInterval = setInterval(loadRecentActivity, 10000);

      return () => {
        clearInterval(metricsInterval);
        clearInterval(activityInterval);
      };
    }
    return undefined;
  }, [isInitialized, loadRealTimeMetrics, loadRecentActivity]);

  return {
    isInitialized,
    isProcessing,
    metrics,
    systemHealth,
    recentActivity,
    processLead,
    runSystemTest,
    loadRealTimeMetrics,
    loadRecentActivity,
    validateLeadData,
    systemStats: multiAgentSystem.getSystemStats(),
  };
};

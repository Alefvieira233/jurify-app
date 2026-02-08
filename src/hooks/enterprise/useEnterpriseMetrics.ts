import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export interface RealTimeMetrics {
  leads_processed_today: number;
  conversion_rate_7d: number;
  avg_response_time: number;
  active_conversations: number;
  agent_performance: AgentMetrics[];
  system_health: SystemHealth;
}

const AGENT_IDS = ['coordenador', 'qualificador', 'juridico', 'comercial', 'comunicador'];
const AGENT_NAMES: Record<string, string> = {
  coordenador: 'Coordenador',
  qualificador: 'Qualificador',
  juridico: 'Juridico',
  comercial: 'Comercial',
  comunicador: 'Comunicador',
};
const AGENT_AVG_TIMES: Record<string, number> = {
  coordenador: 1.2,
  qualificador: 2.1,
  juridico: 3.5,
  comercial: 2.8,
  comunicador: 1.8,
};

interface LeadInteraction {
  created_at: string;
  message?: string;
  response?: string;
  metadata?: { agent_id?: string };
}

const calculateSuccessRate = (interactions: LeadInteraction[]): number => {
  if (interactions.length === 0) return 100;
  const errors = interactions.filter(
    (i) => i.message?.toLowerCase().includes('erro') || i.response?.toLowerCase().includes('erro')
  ).length;
  return ((interactions.length - errors) / interactions.length) * 100;
};

const calculateErrorRate = (interactions: LeadInteraction[]): number => {
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

export const useEnterpriseMetrics = (tenantId: string | null) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const { toast } = useToast();

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

      const responseTimes = interactions?.map((i) => {
        const created = new Date(i.created_at).getTime();
        return Date.now() - created;
      }) || [];

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000 / 60
        : 0;

      const agentPerformance: AgentMetrics[] = AGENT_IDS.map((id) => ({
        name: AGENT_NAMES[id],
        id,
        messages_processed: interactions?.filter((i) => i.metadata?.agent_id === id).length || 0,
        success_rate: calculateSuccessRate(interactions?.filter((i) => i.metadata?.agent_id === id) || []),
        avg_response_time: AGENT_AVG_TIMES[id],
        current_status: 'active' as const,
        queue_size: 0,
        last_activity: new Date(),
      }));

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

  return {
    metrics,
    systemHealth,
    loadRealTimeMetrics,
  };
};

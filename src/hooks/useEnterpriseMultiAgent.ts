/**
 * 🏢 useEnterpriseMultiAgent - Hook Composto para Sistema Enterprise
 * 
 * REFATORADO: Este hook agora usa composição de hooks menores:
 * - useEnterpriseMetrics: Métricas em tempo real
 * - useEnterpriseLeadProcessor: Processamento de leads
 * - useEnterpriseActivity: Atividade recente
 * 
 * A API pública permanece compatível para não quebrar código existente.
 */

import { useState, useEffect, useCallback } from 'react';
import { multiAgentSystem } from '@/lib/multiagents';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useEnterpriseMetrics, 
  useEnterpriseLeadProcessor, 
  useEnterpriseActivity,
  type RealTimeMetrics,
  type AgentMetrics,
  type SystemHealth,
  type EnterpriseLeadData,
  validateLeadData
} from './enterprise';

export type { RealTimeMetrics, AgentMetrics, SystemHealth, EnterpriseLeadData };

export const useEnterpriseMultiAgent = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const tenantId = profile?.tenant_id ?? null;

  // Composição de hooks especializados
  const { metrics, systemHealth, loadRealTimeMetrics } = useEnterpriseMetrics(tenantId);
  const { recentActivity, loadRecentActivity } = useEnterpriseActivity(tenantId);
  const { isProcessing, processLead, runSystemTest } = useEnterpriseLeadProcessor(
    tenantId,
    isInitialized,
    loadRealTimeMetrics
  );

  const initializeSystem = useCallback(() => {
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

  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  useEffect(() => {
    if (isInitialized) {
      void loadRealTimeMetrics();
      void loadRecentActivity();

      const metricsInterval = setInterval(() => {
        void loadRealTimeMetrics();
      }, 30000);
      const activityInterval = setInterval(() => {
        void loadRecentActivity();
      }, 10000);

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

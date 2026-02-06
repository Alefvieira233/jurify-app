/**
 * 🚀 ENTERPRISE MULTIAGENT DASHBOARD - PRODUCTION READY
 * 
 * Dashboard enterprise completo com métricas reais, monitoramento em tempo real
 * e interface profissional para sistema multiagentes de produção.
 * 
 * REFATORADO: Componentes quebrados em subcomponentes menores para melhor manutenção.
 * @see src/components/enterprise/
 */

import React, { useState } from 'react';
import { useEnterpriseMultiAgent } from '@/hooks/useEnterpriseMultiAgent';
import { Priority } from '@/lib/multiagents/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';

// Subcomponentes refatorados
import {
  DashboardHeader,
  MetricsCards,
  AgentNetworkTab,
  LeadProcessingTab,
  ActivityStreamTab,
  SystemHealthTab
} from '@/components/enterprise';

export const EnterpriseDashboard: React.FC = () => {
  const {
    isInitialized,
    isProcessing,
    metrics,
    systemHealth,
    recentActivity,
    processLead,
    runSystemTest,
    loadRealTimeMetrics,
    validateLeadData,
    systemStats
  } = useEnterpriseMultiAgent();

  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    legal_area: '',
    urgency: Priority.MEDIUM,
    source: 'chat' as 'whatsapp' | 'email' | 'chat' | 'form'
  });

  // 🎯 Submete novo lead
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateLeadData(newLead);
    if (!validation.isValid) {
      return;
    }

    const success = await processLead(newLead);
    if (success) {
      setNewLead({
        name: '',
        email: '',
        phone: '',
        message: '',
        legal_area: '',
        urgency: Priority.MEDIUM,
        source: 'chat'
      });
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Inicializando Sistema Enterprise...</p>
          <p className="text-sm text-gray-600">Carregando agentes multiagentes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-8 bg-background min-h-screen reveal-up">
      {/* 🎯 HEADER */}
      <DashboardHeader
        systemHealth={systemHealth}
        systemStats={systemStats}
        isProcessing={isProcessing}
        onRunSystemTest={() => void runSystemTest()}
        onRefreshMetrics={() => void loadRealTimeMetrics()}
      />

      {/* 📊 MÉTRICAS */}
      <MetricsCards metrics={metrics} systemHealth={systemHealth} />

      {/* 🤖 TABS */}
      <Tabs defaultValue="agents" className="space-y-10">
        <TabsList className="flex w-full bg-card border border-border p-2">
          <TabsTrigger value="agents" className="flex-1 btn-sharp data-[state=active]:bg-foreground data-[state=active]:text-background">
            Network Agents
          </TabsTrigger>
          <TabsTrigger value="process" className="flex-1 btn-sharp data-[state=active]:bg-foreground data-[state=active]:text-background">
            Lead Processing
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 btn-sharp data-[state=active]:bg-foreground data-[state=active]:text-background">
            Live Stream
          </TabsTrigger>
          <TabsTrigger value="health" className="flex-1 btn-sharp data-[state=active]:bg-foreground data-[state=active]:text-background">
            Core Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          <AgentNetworkTab agents={metrics?.agent_performance || []} />
        </TabsContent>

        <TabsContent value="process" className="space-y-6">
          <LeadProcessingTab
            newLead={newLead}
            setNewLead={setNewLead}
            isProcessing={isProcessing}
            onSubmit={(e) => void handleSubmitLead(e)}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityStreamTab activities={recentActivity || []} />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <SystemHealthTab
            systemHealth={systemHealth}
            systemStats={systemStats}
            metrics={metrics}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

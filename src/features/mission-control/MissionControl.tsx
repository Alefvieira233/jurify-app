/**
 * 🚀 JURIFY MISSION CONTROL DASHBOARD
 *
 * Painel de controle em tempo real estilo SpaceX/NASA.
 * Monitoramento ao vivo dos agentes multiagentes processando leads.
 *
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Activity,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Database,
  Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtimeAgents } from './hooks/useRealtimeAgents';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AgentStatusCard } from './components/AgentStatusCard';
import { ActiveExecutionsList } from './components/ActiveExecutionsList';
import { RealTimeTerminal } from './components/RealTimeTerminal';

// =========================================================================
// MAIN MISSION CONTROL COMPONENT
// =========================================================================

export function MissionControl() {
  usePageTitle('Mission Control');
  const [tenantId, setTenantId] = useState<string>('');
  const { profile } = useAuth();

  // Get tenant ID from auth context
  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
    }
  }, [profile]);

  const {
    agentStatuses,
    activeExecutions,
    recentLogs,
    isConnected,
    error,
    refresh
  } = useRealtimeAgents(tenantId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Mission Control
          </h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real do sistema multiagentes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              'h-2 w-2 rounded-full',
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            )} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <Button onClick={() => void refresh()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Status Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Status dos Agentes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {agentStatuses.map((agent) => (
            <AgentStatusCard key={agent.name} agent={agent} />
          ))}
        </div>
      </div>

      {/* Tabs for Executions and Logs */}
      <Tabs defaultValue="executions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="executions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Execuções Ativas ({activeExecutions.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Logs em Tempo Real ({recentLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="space-y-4">
          <ActiveExecutionsList executions={activeExecutions} />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <RealTimeTerminal logs={recentLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MissionControl;

/**
 * 🚀 JURIFY MISSION CONTROL DASHBOARD
 *
 * Painel de controle em tempo real estilo SpaceX/NASA.
 * Monitoramento ao vivo dos agentes multiagentes processando leads.
 *
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Zap,
  TrendingUp,
  Database,
  Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtimeAgents } from './hooks/useRealtimeAgents';
import type { AgentStatus, AgentExecution, AgentLog } from './hooks/useRealtimeAgents';
import { useAuth } from '@/contexts/AuthContext';

// =========================================================================
// AGENT STATUS CARD
// =========================================================================

interface AgentStatusCardProps {
  agent: AgentStatus;
}

function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const statusConfig = {
    idle: {
      color: 'bg-gray-500',
      icon: Clock,
      text: 'Ocioso',
      pulse: false
    },
    processing: {
      color: 'bg-blue-500',
      icon: Zap,
      text: 'Processando',
      pulse: true
    },
    success: {
      color: 'bg-green-500',
      icon: CheckCircle2,
      text: 'Concluído',
      pulse: false
    },
    error: {
      color: 'bg-red-500',
      icon: AlertCircle,
      text: 'Erro',
      pulse: false
    }
  };

  const config = statusConfig[agent.status];
  const Icon = config.icon;

  return (
    <Card className={cn(
      'transition-all duration-300',
      agent.status === 'processing' && 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/50'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{agent.name}</CardTitle>
          <div className={cn(
            'relative flex h-3 w-3 rounded-full',
            config.color
          )}>
            {config.pulse && (
              <span className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                config.color
              )} />
            )}
            <span className={cn(
              'relative inline-flex rounded-full h-3 w-3',
              config.color
            )} />
          </div>
        </div>
        <CardDescription className="flex items-center gap-1 text-xs">
          <Icon className="h-3 w-3" />
          {config.text}
          {agent.currentTask && ` - ${agent.currentTask}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Execuções</div>
            <div className="font-semibold">{agent.metrics.totalExecutions}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Taxa Sucesso</div>
            <div className="font-semibold">{agent.metrics.successRate.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Latência Média</div>
            <div className="font-semibold">{agent.metrics.avgLatencyMs}ms</div>
          </div>
          <div>
            <div className="text-muted-foreground">Tokens</div>
            <div className="font-semibold">{agent.metrics.totalTokens.toLocaleString()}</div>
          </div>
        </div>
        {agent.lastActivity && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Última atividade: {new Date(agent.lastActivity).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// ACTIVE EXECUTIONS LIST
// =========================================================================

interface ActiveExecutionsListProps {
  executions: AgentExecution[];
}

function ActiveExecutionsList({ executions }: ActiveExecutionsListProps) {
  const statusBadge = (status: AgentExecution['status']) => {
    const config = {
      pending: { variant: 'secondary' as const, label: 'Pendente' },
      processing: { variant: 'default' as const, label: 'Processando' },
      completed: { variant: 'default' as const, label: 'Completo' },
      failed: { variant: 'destructive' as const, label: 'Falhou' },
      cancelled: { variant: 'outline' as const, label: 'Cancelado' }
    };

    return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
  };

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Nenhuma execução ativa no momento</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 pr-4">
        {executions.map((execution) => (
          <Card key={execution.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-mono">
                    {execution.execution_id}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-xs">
                    {statusBadge(execution.status)}
                    {execution.current_agent && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {execution.current_agent}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {execution.total_duration_ms
                    ? `${(execution.total_duration_ms / 1000).toFixed(1)}s`
                    : 'Executando...'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {execution.current_stage && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Estágio:</span>
                  <span className="font-medium">{execution.current_stage}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Agentes</div>
                  <div className="font-semibold">{execution.total_agents_used}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tokens</div>
                  <div className="font-semibold">{execution.total_tokens.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Custo</div>
                  <div className="font-semibold">${execution.estimated_cost_usd.toFixed(4)}</div>
                </div>
              </div>
              {execution.agents_involved && execution.agents_involved.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {execution.agents_involved.map((agent, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {agent}
                    </Badge>
                  ))}
                </div>
              )}
              {execution.error_message && (
                <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                  {execution.error_message}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

// =========================================================================
// REALTIME TERMINAL
// =========================================================================

interface RealTimeTerminalProps {
  logs: AgentLog[];
}

function RealTimeTerminal({ logs }: RealTimeTerminalProps) {
  const [autoScroll, setAutoScroll] = useState(true);

  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-mono text-green-500">System Logs</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="h-7 text-xs text-slate-400 hover:text-white"
            >
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </Button>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <div className="text-slate-500">Aguardando logs...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={cn(
                  'py-1 px-2 rounded',
                  log.status === 'failed' && 'bg-red-950/30 text-red-400',
                  log.status === 'completed' && 'text-green-400',
                  log.status === 'processing' && 'text-blue-400 bg-blue-950/20',
                  log.status === 'pending' && 'text-slate-400'
                )}>
                  <span className="text-slate-500">
                    [{new Date(log.created_at).toLocaleTimeString()}]
                  </span>
                  {' '}
                  <span className="text-purple-400">{log.agent_name}</span>
                  {' '}
                  <span className={cn(
                    log.status === 'completed' && 'text-green-500',
                    log.status === 'failed' && 'text-red-500',
                    log.status === 'processing' && 'text-blue-500',
                    log.status === 'pending' && 'text-yellow-500'
                  )}>
                    [{log.status.toUpperCase()}]
                  </span>
                  {' '}
                  {log.result_preview && (
                    <span className="text-slate-300">
                      {log.result_preview.substring(0, 100)}
                      {log.result_preview.length > 100 && '...'}
                    </span>
                  )}
                  {log.error_message && (
                    <span className="text-red-400"> ERROR: {log.error_message}</span>
                  )}
                  {' '}
                  <span className="text-slate-600">
                    ({log.total_tokens} tokens, {log.latency_ms}ms)
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// MAIN MISSION CONTROL COMPONENT
// =========================================================================

export function MissionControl() {
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

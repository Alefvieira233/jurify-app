/**
 * AgentStatusCard — individual agent status display for Mission Control.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '../hooks/useRealtimeAgents';

interface AgentStatusCardProps {
  agent: AgentStatus;
}

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const statusConfig = {
    idle: {
      color: 'bg-muted-foreground',
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

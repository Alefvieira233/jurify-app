/**
 * ActiveExecutionsList — displays active multi-agent executions for Mission Control.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Zap } from 'lucide-react';
import type { AgentExecution } from '../hooks/useRealtimeAgents';

interface ActiveExecutionsListProps {
  executions: AgentExecution[];
}

export function ActiveExecutionsList({ executions }: ActiveExecutionsListProps) {
  const statusBadge = (status: string) => {
    const config: Record<string, { variant: 'secondary' | 'default' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pendente' },
      processing: { variant: 'default', label: 'Processando' },
      completed: { variant: 'default', label: 'Completo' },
      failed: { variant: 'destructive', label: 'Falhou' },
      cancelled: { variant: 'outline', label: 'Cancelado' }
    };

    const entry = config[status] ?? { variant: 'secondary', label: status };
    return <Badge variant={entry.variant}>{entry.label}</Badge>;
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
                  <div className="font-semibold">{(execution.total_tokens ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Custo</div>
                  <div className="font-semibold">${(execution.estimated_cost_usd ?? 0).toFixed(4)}</div>
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
              {execution.status === 'failed' && (
                <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                  Execução falhou
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

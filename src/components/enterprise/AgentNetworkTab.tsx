/**
 * 🤖 AGENT NETWORK TAB - Enterprise Dashboard Subcomponent
 * 
 * Exibe grid de agentes com status e métricas.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Brain,
  CheckCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
  XCircle
} from 'lucide-react';

interface AgentPerformance {
  id: string;
  name: string;
  current_status: string;
  messages_processed: number;
  queue_size: number;
  avg_response_time: number;
  last_activity: Date;
  success_rate: number;
}

interface AgentNetworkTabProps {
  agents: AgentPerformance[];
}

const getAgentStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'processing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'idle': return <Clock className="h-4 w-4 text-gray-400" />;
    case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Activity className="h-4 w-4 text-gray-400" />;
  }
};

const getAgentIcon = (id: string) => {
  switch (id) {
    case 'coordenador': return <Brain className="h-5 w-5" />;
    case 'qualificador': return <Target className="h-5 w-5" />;
    case 'juridico': return <Shield className="h-5 w-5" />;
    case 'comercial': return <TrendingUp className="h-5 w-5" />;
    case 'comunicador': return <MessageSquare className="h-5 w-5" />;
    default: return <Activity className="h-5 w-5" />;
  }
};

export const AgentNetworkTab: React.FC<AgentNetworkTabProps> = ({ agents }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent, index) => (
        <Card key={index} className="card-monolith hover:shadow-2xl transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 border border-primary/20">
                  {getAgentIcon(agent.id)}
                </div>
                <div>
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <CardDescription className="text-sm">
                    ID: {agent.id}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getAgentStatusIcon(agent.current_status)}
                <Badge variant="outline" className="text-xs">
                  {agent.current_status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Mensagens</p>
                <p className="font-semibold text-lg">{agent.messages_processed}</p>
              </div>
              <div>
                <p className="text-gray-600">Fila</p>
                <p className="font-semibold text-lg">{agent.queue_size}</p>
              </div>
              <div>
                <p className="text-gray-600">Tempo Resp.</p>
                <p className="font-semibold">{agent.avg_response_time}s</p>
              </div>
              <div>
                <p className="text-gray-600">Atividade</p>
                <p className="font-semibold text-xs">
                  {agent.last_activity.toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Taxa de Sucesso</span>
                <span className="font-semibold">{agent.success_rate.toFixed(1)}%</span>
              </div>
              <Progress value={agent.success_rate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

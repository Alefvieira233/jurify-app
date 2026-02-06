/**
 * 🏥 SYSTEM HEALTH TAB - Enterprise Dashboard Subcomponent
 * 
 * Exibe status de saúde e estatísticas do sistema.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Shield } from 'lucide-react';

interface SystemHealthTabProps {
  systemHealth: {
    overall_status: string;
    uptime_percentage: number;
    performance_score: number;
    last_check: Date;
    error_rate: number;
  } | null;
  systemStats: {
    total_agents: number;
    messages_processed: number;
    active_agents: string[];
  } | null;
  metrics: {
    active_conversations: number;
    conversion_rate_7d: number;
  } | null;
}

const getHealthColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'text-green-600 bg-green-100';
    case 'warning': return 'text-yellow-600 bg-yellow-100';
    case 'critical': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export const SystemHealthTab: React.FC<SystemHealthTabProps> = ({
  systemHealth,
  systemStats,
  metrics
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="card-monolith">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Status Geral</span>
            <Badge className={getHealthColor(systemHealth?.overall_status || 'unknown')}>
              {systemHealth?.overall_status?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uptime</span>
              <span className="font-semibold">{systemHealth?.uptime_percentage || 0}%</span>
            </div>
            <Progress value={systemHealth?.uptime_percentage || 0} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Performance Score</span>
              <span className="font-semibold">{systemHealth?.performance_score.toFixed(0) || 0}/100</span>
            </div>
            <Progress value={systemHealth?.performance_score || 0} className="h-2" />
          </div>

          <div className="pt-4 border-t text-sm text-gray-600">
            <p>Última verificação: {systemHealth?.last_check.toLocaleString()}</p>
            <p>Taxa de erro: {systemHealth?.error_rate.toFixed(2) || 0}%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-monolith">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Estatísticas do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Agentes Ativos</p>
              <p className="text-2xl font-bold text-green-600">{systemStats?.total_agents || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Mensagens</p>
              <p className="text-2xl font-bold text-blue-600">{systemStats?.messages_processed || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Conversas Ativas</p>
              <p className="text-2xl font-bold text-purple-600">{metrics?.active_conversations || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Taxa Conversão</p>
              <p className="text-2xl font-bold text-orange-600">{metrics?.conversion_rate_7d.toFixed(1) || 0}%</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">Agentes Enterprise:</p>
            <div className="flex flex-wrap gap-2">
              {systemStats?.active_agents?.map((agent: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {agent}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

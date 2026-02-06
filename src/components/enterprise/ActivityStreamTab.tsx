/**
 * 📊 ACTIVITY STREAM TAB - Enterprise Dashboard Subcomponent
 * 
 * Exibe atividades em tempo real dos agentes.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Brain, MessageSquare, Shield, Target, TrendingUp } from 'lucide-react';

interface ActivityItem {
  agent_id: string;
  message: string;
  response: string;
  created_at: string;
  leads?: { name: string };
}

interface ActivityStreamTabProps {
  activities: ActivityItem[];
}

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

export const ActivityStreamTab: React.FC<ActivityStreamTabProps> = ({ activities }) => {
  return (
    <Card className="card-monolith">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-600" />
          Atividade em Tempo Real
        </CardTitle>
        <CardDescription>
          Últimas interações dos agentes com leads
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities?.length > 0 ? (
            activities.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-foreground/5 border border-border hover:bg-foreground/10 transition-colors">
                <div className="p-2 bg-primary/10 border border-primary/20 flex-shrink-0">
                  {getAgentIcon(activity.agent_id)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{activity.message}</p>
                    <Badge variant="outline" className="text-xs">
                      {activity.agent_id}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {activity.response}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{new Date(activity.created_at).toLocaleString()}</span>
                    {activity.leads?.name && (
                      <span>Cliente: {activity.leads.name}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma atividade recente</p>
              <p className="text-sm">As interações dos agentes aparecerão aqui</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

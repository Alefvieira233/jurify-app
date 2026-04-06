import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Bot, MessageSquare, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AgentStats {
  totalAtendimentos24h: number;
  leadsQualificados24h: number;
  tempoMedioResposta: number;
  agenteMaisAtivo: string;
  prazosEstaSemana: number;
}

export default function AgentActivityWidget() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.dashboardAgentActivity.list(tenantId),
    queryFn: async (): Promise<AgentStats> => {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [messagesRes, logsRes, prazosRes] = await Promise.all([
        supabase
          .from('whatsapp_messages')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId!)
          .eq('sender', 'agent')
          .gte('timestamp', h24),
        supabase
          .from('agent_ai_logs')
          .select('agent_name, latency_ms')
          .eq('tenant_id', tenantId!)
          .gte('created_at', h24),
        supabase
          .from('prazos_processuais')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId!)
          .gte('data_prazo', now.toISOString())
          .lte('data_prazo', weekEnd.toISOString())
          .neq('status', 'concluido'),
      ]);

      const logs = logsRes.data || [];
      const latencies = logs.map(l => l.latency_ms).filter(Boolean) as number[];
      const avgLatency = latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

      // Find most active agent
      const agentCounts: Record<string, number> = {};
      logs.forEach(l => {
        if (l.agent_name) agentCounts[l.agent_name] = (agentCounts[l.agent_name] || 0) + 1;
      });
      const topAgent = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0];

      return {
        totalAtendimentos24h: messagesRes.count ?? 0,
        leadsQualificados24h: logs.filter(l => l.agent_name?.includes('Recepcionista')).length,
        tempoMedioResposta: avgLatency,
        agenteMaisAtivo: topAgent?.[0] || 'Nenhum',
        prazosEstaSemana: prazosRes.count ?? 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  const items = [
    { icon: MessageSquare, label: 'Atendimentos (24h)', value: stats?.totalAtendimentos24h ?? 0, color: 'text-blue-500' },
    { icon: TrendingUp, label: 'Leads qualificados', value: stats?.leadsQualificados24h ?? 0, color: 'text-green-500' },
    { icon: Bot, label: 'Agente mais ativo', value: stats?.agenteMaisAtivo ?? '-', color: 'text-purple-500' },
    { icon: Clock, label: 'Prazos esta semana', value: stats?.prazosEstaSemana ?? 0, color: stats?.prazosEstaSemana && stats.prazosEstaSemana > 0 ? 'text-red-500' : 'text-muted-foreground' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Atividade dos Agentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {items.map(item => (
            <div key={item.label} className="flex items-start gap-2">
              <item.icon className={`h-4 w-4 mt-0.5 ${item.color}`} />
              <div>
                <p className="text-lg font-semibold leading-none">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
        {stats?.tempoMedioResposta ? (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
            Tempo médio de resposta: <strong>{(stats.tempoMedioResposta / 1000).toFixed(1)}s</strong>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

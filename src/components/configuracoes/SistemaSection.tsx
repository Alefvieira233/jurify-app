import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Lock, Brain, Database, Server, Shield, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabaseUntyped } from '@/integrations/supabase/client';
import { useRBAC } from '@/hooks/useRBAC';
import BackupRestore from '../BackupRestore';
import SystemStatus from '../SystemStatus';
import PerformanceDashboard from '../PerformanceDashboard';
import LogsMonitoramento from '../LogsMonitoramento';
import AdminUserSection from './AdminUserSection';
import SystemHealthCheck from '../SystemHealthCheck';
import SecurityDashboard from '../SecurityDashboard';
import TesteRealAgenteIA from '../TesteRealAgenteIA';

const SistemaSection = () => {
  const { isAdmin } = useRBAC();

  return (
    <div className="space-y-6">
      {/* System Health Check */}
      <SystemHealthCheck />

      {/* Main tabs */}
      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto h-9 justify-start gap-0.5">
          <TabsTrigger value="status" className="flex items-center gap-1.5 text-xs shrink-0">
            <Activity className="h-3.5 w-3.5" />
            Status
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs shrink-0">
            <Lock className="h-3.5 w-3.5" />
            Segurança
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="teste-agente" className="flex items-center gap-1.5 text-xs shrink-0">
              <Brain className="h-3.5 w-3.5" />
              Teste Agente
            </TabsTrigger>
          )}
          <TabsTrigger value="backup" className="flex items-center gap-1.5 text-xs shrink-0">
            <Database className="h-3.5 w-3.5" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1.5 text-xs shrink-0">
            <Server className="h-3.5 w-3.5" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs shrink-0">
            <Activity className="h-3.5 w-3.5" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-1.5 text-xs shrink-0">
            <Shield className="h-3.5 w-3.5" />
            Admin
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="uso-ia" className="flex items-center gap-1.5 text-xs shrink-0">
              <BarChart3 className="h-3.5 w-3.5" />
              Uso de IA
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="status">
          <SystemStatus />
        </TabsContent>

        <TabsContent value="security">
          <SecurityDashboard />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="teste-agente">
            <TesteRealAgenteIA />
          </TabsContent>
        )}

        <TabsContent value="backup">
          <BackupRestore />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceDashboard />
        </TabsContent>

        <TabsContent value="logs">
          <LogsMonitoramento />
        </TabsContent>

        <TabsContent value="admin">
          <AdminUserSection />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="uso-ia">
            <AIUsageStats />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

function AIUsageStats() {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['ai-usage-stats'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabaseUntyped
        .from('ai_usage')
        .select('usage_date, tokens_used, budget_limit')
        .gte('usage_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('usage_date', { ascending: false });
      if (error) throw error;
      return data as Array<{ usage_date: string; tokens_used: number; budget_limit: number }>;
    },
  });

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Carregando...</div>;

  const today = usage?.[0];
  const percentage = today ? Math.round((today.tokens_used / today.budget_limit) * 100) : 0;

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-medium">Uso de IA - Últimos 7 dias</h3>
      {today && (
        <div className="rounded-lg border p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Hoje</span>
            <span>{today.tokens_used.toLocaleString()} / {today.budget_limit.toLocaleString()} tokens</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${percentage >= 80 ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{percentage}% utilizado</p>
        </div>
      )}
      <div className="space-y-2">
        {usage?.slice(1).map((day) => (
          <div key={day.usage_date} className="flex justify-between text-sm py-1 border-b">
            <span>{new Date(day.usage_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
            <span className="text-muted-foreground">{day.tokens_used.toLocaleString()} tokens</span>
          </div>
        ))}
      </div>
      {(!usage || usage.length === 0) && (
        <p className="text-sm text-muted-foreground">Nenhum uso de IA registrado nos últimos 7 dias.</p>
      )}
    </div>
  );
}

export default SistemaSection;

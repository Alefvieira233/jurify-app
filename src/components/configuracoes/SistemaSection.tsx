import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Lock, Brain, Database, Server, Shield } from 'lucide-react';
import BackupRestore from '../BackupRestore';
import SystemStatus from '../SystemStatus';
import PerformanceDashboard from '../PerformanceDashboard';
import LogsMonitoramento from '../LogsMonitoramento';
import AdminUserSection from './AdminUserSection';
import SystemHealthCheck from '../SystemHealthCheck';
import SecurityDashboard from '../SecurityDashboard';
import TesteRealAgenteIA from '../TesteRealAgenteIA';

const SistemaSection = () => {
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
          <TabsTrigger value="teste-agente" className="flex items-center gap-1.5 text-xs shrink-0">
            <Brain className="h-3.5 w-3.5" />
            Teste Agente
          </TabsTrigger>
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
        </TabsList>

        <TabsContent value="status">
          <SystemStatus />
        </TabsContent>

        <TabsContent value="security">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="teste-agente">
          <TesteRealAgenteIA />
        </TabsContent>

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
      </Tabs>
    </div>
  );
};

export default SistemaSection;

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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="teste-agente" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Teste Agente
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admin User
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

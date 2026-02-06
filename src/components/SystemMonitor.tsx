import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSystemValidator, SystemHealth } from '@/utils/systemValidator';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield,
  Database,
  Key,
  Link,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

// Type helpers para acessar details com segurança
const getDbDetails = (d: unknown): { readable?: boolean; writable?: boolean } | null => 
  d && typeof d === 'object' ? d as { readable?: boolean; writable?: boolean } : null;

const getAuthDetails = (d: unknown): { email?: string } | null => 
  d && typeof d === 'object' ? d as { email?: string } : null;

const getIntegrationDetails = (d: unknown): { n8n?: boolean; openai?: boolean; healthCheck?: boolean } | null => 
  d && typeof d === 'object' ? d as { n8n?: boolean; openai?: boolean; healthCheck?: boolean } : null;

const getPerfDetails = (d: unknown): { responseTime?: number; threshold?: number } | null => 
  d && typeof d === 'object' ? d as { responseTime?: number; threshold?: number } : null;

const SystemMonitor = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { runValidation } = useSystemValidator();

  const checkSystemHealth = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[SystemMonitor] Running health check');
      const health = await runValidation();
      setSystemHealth(health);
      setLastUpdate(new Date().toLocaleString());

      try {
        const { data } = await supabase.functions.invoke('health-check');
        console.log('[SystemMonitor] Health check endpoint:', data);
      } catch (error) {
        console.error('[SystemMonitor] Health check error:', error);
      }
    } catch (error) {
      console.error('[SystemMonitor] Validation error:', error);
    } finally {
      setLoading(false);
    }
  }, [runValidation]);

  useEffect(() => {
    void checkSystemHealth();

    const interval = setInterval(() => { void checkSystemHealth(); }, 300000);
    return () => clearInterval(interval);
  }, [checkSystemHealth]);

  const getStatusIcon = (success: boolean) => {
    if (success) return <CheckCircle className="h-4 w-4 text-emerald-200" />;
    return <XCircle className="h-4 w-4 text-red-300" />;
  };

  const getStatusBadge = (success: boolean) => {
    if (success) {
      return <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-400/30">Operacional</Badge>;
    }
    return <Badge className="bg-red-500/15 text-red-200 border border-red-400/30">Erro</Badge>;
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-amber-200';
      case 'critical':
        return 'text-red-300';
      default:
        return 'text-[hsl(var(--muted-foreground))]';
    }
  };

  if (!systemHealth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Monitor do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Verificando status do sistema...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Monitor do Sistema
            </CardTitle>
            <Button onClick={() => { void checkSystemHealth(); }} disabled={loading} variant="outline" size="sm">
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Status Geral:</span>
              <span className={`text-lg font-bold capitalize ${getOverallStatusColor(systemHealth.overall)}`}>
                {systemHealth.overall === 'healthy'
                  ? 'Saudavel'
                  : systemHealth.overall === 'degraded'
                  ? 'Degradado'
                  : 'Critico'}
              </span>
            </div>

            {lastUpdate && (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Ultima verificacao: {lastUpdate}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              Banco de Dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {getStatusIcon(systemHealth.tests.database.success)}
                {getStatusBadge(systemHealth.tests.database.success)}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{systemHealth.tests.database.message}</p>
              {(() => {
                const dbDetails = getDbDetails(systemHealth.tests.database.details);
                return dbDetails && (
                  <div className="text-xs bg-[hsl(var(--surface-1))] p-2 rounded">
                    <p>Leitura: {dbDetails.readable ? 'OK' : 'Falha'}</p>
                    <p>Escrita: {dbDetails.writable ? 'OK' : 'Falha'}</p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Key className="h-4 w-4" />
              Autenticacao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {getStatusIcon(systemHealth.tests.authentication.success)}
                {getStatusBadge(systemHealth.tests.authentication.success)}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{systemHealth.tests.authentication.message}</p>
              {(() => {
                const authDetails = getAuthDetails(systemHealth.tests.authentication.details);
                return authDetails?.email && (
                  <div className="text-xs bg-[hsl(var(--surface-1))] p-2 rounded">
                    <p>Usuario: {authDetails.email}</p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              Seguranca RLS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {getStatusIcon(systemHealth.tests.rls.success)}
                {getStatusBadge(systemHealth.tests.rls.success)}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{systemHealth.tests.rls.message}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Link className="h-4 w-4" />
              Integracoes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {getStatusIcon(systemHealth.tests.integrations.success)}
                {getStatusBadge(systemHealth.tests.integrations.success)}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{systemHealth.tests.integrations.message}</p>
              {(() => {
                const intDetails = getIntegrationDetails(systemHealth.tests.integrations.details);
                return intDetails && (
                  <div className="text-xs bg-[hsl(var(--surface-1))] p-2 rounded space-y-1">
                    <p>N8N: {intDetails.n8n ? 'OK' : 'Falha'}</p>
                    <p>OpenAI: {intDetails.openai ? 'OK' : 'Falha'}</p>
                    <p>Health: {intDetails.healthCheck ? 'OK' : 'Falha'}</p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {getStatusIcon(systemHealth.tests.performance.success)}
                {getStatusBadge(systemHealth.tests.performance.success)}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{systemHealth.tests.performance.message}</p>
              {(() => {
                const perfDetails = getPerfDetails(systemHealth.tests.performance.details);
                return perfDetails && perfDetails.responseTime !== undefined && perfDetails.threshold !== undefined && (
                  <div className="text-xs bg-[hsl(var(--surface-1))] p-2 rounded">
                    <Progress
                      value={Math.min(
                        (perfDetails.responseTime / perfDetails.threshold) * 100,
                        100
                      )}
                      className="h-2 mb-1"
                    />
                    <p>Limite: {perfDetails.threshold}ms</p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Informacoes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-xs bg-blue-500/10 border border-blue-500/25 p-2 rounded">
                <p>
                  <strong>Jurify SaaS</strong>
                </p>
                <p>Versao: 1.0.0</p>
                <p>Ambiente: {process.env.NODE_ENV || 'development'}</p>
                <p>Build: Enterprise</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemMonitor;



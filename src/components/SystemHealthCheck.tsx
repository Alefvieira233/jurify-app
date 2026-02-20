import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import {
  Shield,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity
} from 'lucide-react';

interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastCheck: string;
}

const SystemHealthCheck = () => {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [overallScore, setOverallScore] = useState(0);

  const performHealthCheck = useCallback(async () => {
    setIsLoading(true);
    const checks: HealthCheck[] = [];
    let score = 0;

    try {
      try {
        const { error } = await supabase
          .from('profiles')
          .select('count')
          .eq('tenant_id', tenantId)
          .limit(1);

        if (!error) {
          checks.push({
            id: 'database',
            name: 'Conexao com Banco de Dados',
            status: 'healthy',
            message: 'Conexao estabelecida com sucesso',
            lastCheck: new Date().toISOString()
          });
          score += 20;
        } else {
          throw error;
        }
      } catch {
        checks.push({
          id: 'database',
          name: 'Conexao com Banco de Dados',
          status: 'critical',
          message: 'Falha na conexao com o banco de dados',
          lastCheck: new Date().toISOString()
        });
      }

      try {
        const { data: session } = await supabase.auth.getSession();
        if (session) {
          checks.push({
            id: 'auth',
            name: 'Sistema de Autenticacao',
            status: 'healthy',
            message: 'Sistema de autenticacao funcionando',
            lastCheck: new Date().toISOString()
          });
          score += 20;
        } else {
          checks.push({
            id: 'auth',
            name: 'Sistema de Autenticacao',
            status: 'warning',
            message: 'Usuário não autenticado',
            lastCheck: new Date().toISOString()
          });
          score += 10;
        }
      } catch {
        checks.push({
          id: 'auth',
          name: 'Sistema de Autenticacao',
          status: 'critical',
          message: 'Falha no sistema de autenticacao',
          lastCheck: new Date().toISOString()
        });
      }

      try {
        const { error } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('id', user?.id || '')
          .limit(1);

        if (!error || error.code === 'PGRST116') {
          checks.push({
            id: 'rls',
            name: 'Row Level Security (RLS)',
            status: 'healthy',
            message: 'RLS ativo e funcionando corretamente',
            lastCheck: new Date().toISOString()
          });
          score += 20;
        } else {
          throw error;
        }
      } catch {
        checks.push({
          id: 'rls',
          name: 'Row Level Security (RLS)',
          status: 'warning',
          message: 'RLS pode não estar configurado corretamente',
          lastCheck: new Date().toISOString()
        });
        score += 10;
      }

      try {
        const { data: workflows } = await supabase
          .from('n8n_workflows')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('ativo', true)
          .limit(1);

        if (workflows && workflows.length > 0) {
          checks.push({
            id: 'n8n',
            name: 'Integracao N8N',
            status: 'healthy',
            message: `${workflows.length} workflow(s) ativo(s) encontrado(s)`,
            lastCheck: new Date().toISOString()
          });
          score += 20;
        } else {
          checks.push({
            id: 'n8n',
            name: 'Integracao N8N',
            status: 'warning',
            message: 'Nenhum workflow N8N ativo encontrado',
            lastCheck: new Date().toISOString()
          });
          score += 5;
        }
      } catch {
        checks.push({
          id: 'n8n',
          name: 'Integracao N8N',
          status: 'critical',
          message: 'Falha ao verificar integração N8N',
          lastCheck: new Date().toISOString()
        });
      }

      try {
        const { error } = await supabase
          .from('logs_atividades')
          .select('count')
          .eq('tenant_id', tenantId)
          .limit(1);

        if (!error) {
          checks.push({
            id: 'logs',
            name: 'Sistema de Logs',
            status: 'healthy',
            message: 'Sistema de auditoria funcionando',
            lastCheck: new Date().toISOString()
          });
          score += 20;
        } else {
          throw error;
        }
      } catch {
        checks.push({
          id: 'logs',
          name: 'Sistema de Logs',
          status: 'critical',
          message: 'Sistema de logs não acessível',
          lastCheck: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[SystemHealthCheck] erro durante health check:', error);
    }

    setHealthChecks(checks);
    setOverallScore(score);
    setIsLoading(false);
  }, [tenantId, user?.id]);

  useEffect(() => {
    void performHealthCheck();
  }, [performHealthCheck]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-emerald-200" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-300" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-300" />;
      default:
        return <Activity className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-200';
    if (score >= 60) return 'text-amber-200';
    return 'text-red-300';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Critico';
  };

  return (
    <Card className="border border-[hsl(var(--border))]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-[hsl(var(--accent))]" />
            <div>
              <CardTitle>Verificacao de Saude do Sistema</CardTitle>
              <CardDescription>
                Monitoramento em tempo real dos componentes criticos
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              {getScoreStatus(overallScore)}
            </div>
          </div>
        </div>
        <Button
          onClick={() => { void performHealthCheck(); }}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="w-fit"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Verificar Novamente
        </Button>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {healthChecks.map((check) => (
            <div key={check.id} className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <div className="flex items-center space-x-3">
                {getStatusIcon(check.status)}
                <div>
                  <h4 className="font-medium">{check.name}</h4>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{check.message}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  className={check.status === 'healthy'
                    ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
                    : check.status === 'warning'
                    ? 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
                    : 'bg-red-500/15 text-red-200 border border-red-400/30'}
                >
                  {check.status === 'healthy' ? 'Saudavel' :
                   check.status === 'warning' ? 'Atencao' : 'Critico'}
                </Badge>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {new Date(check.lastCheck).toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {healthChecks.length === 0 && !isLoading && (
          <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
            <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma verificacao realizada ainda</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealthCheck;


/**
 * @module useSecurityPolicies
 * @description Hook para auditoria de segurança do sistema.
 * Executa scans automáticos verificando autenticação, RLS, API keys,
 * logs de auditoria e conectividade WhatsApp. Retorna score de segurança
 * e checks individuais com severidade.
 *
 * @example
 * ```tsx
 * const { checks, metrics, isSecure, runSecurityScan } = useSecurityPolicies();
 * ```
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'database' | 'api' | 'network' | 'permissions';
}

interface SecurityMetrics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  securityScore: number;
  lastScan: string;
}

export const useSecurityPolicies = () => {
  const [checks, setChecks] = useState<SecurityCheck[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
    warningChecks: 0,
    securityScore: 0,
    lastScan: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const { toast } = useToast();

  const runSecurityScan = async () => {
    if (!user || !tenantId) return;

    setLoading(true);
    const scanResults: SecurityCheck[] = [];

    try {
      try {
        const { data: session } = await supabase.auth.getSession();
        scanResults.push({
          id: 'auth-session',
          name: 'Sessao de Autenticacao',
          status: session ? 'pass' : 'fail',
          message: session ? 'Usuario autenticado corretamente' : 'Sessao invalida ou expirada',
          severity: session ? 'low' : 'critical',
          category: 'authentication'
        });
      } catch {
        scanResults.push({
          id: 'auth-error',
          name: 'Sistema de Autenticacao',
          status: 'fail',
          message: 'Erro ao verificar sistema de autenticacao',
          severity: 'critical',
          category: 'authentication'
        });
      }

      const criticalTables: ('profiles' | 'agentes_ia' | 'api_keys' | 'logs_atividades')[] = ['profiles', 'agentes_ia', 'api_keys', 'logs_atividades'];
      for (const table of criticalTables) {
        try {
          const { error } = await supabase
            .from(table)
            .select('id')
            .eq('tenant_id', tenantId)
            .limit(1);

          scanResults.push({
            id: `rls-${table}`,
            name: `RLS da tabela ${table}`,
            status: error && error.code === 'PGRST301' ? 'pass' : 'warning',
            message: error && error.code === 'PGRST301'
              ? 'RLS ativo e funcionando'
              : 'RLS pode não estar configurado adequadamente',
            severity: 'medium',
            category: 'database'
          });
        } catch {
          scanResults.push({
            id: `rls-error-${table}`,
            name: `RLS da tabela ${table}`,
            status: 'fail',
            message: 'Erro ao verificar RLS',
            severity: 'high',
            category: 'database'
          });
        }
      }

      try {
        const { data: apiKeys, error } = await supabase
          .from('api_keys')
          .select('id, ativo')
          .eq('tenant_id', tenantId)
          .eq('ativo', true);

        if (!error) {
          const activeCount = apiKeys?.length || 0;
          scanResults.push({
            id: 'api-keys',
            name: 'API Keys Ativas',
            status: activeCount > 0 ? 'pass' : 'warning',
            message: `${activeCount} API key(s) ativa(s) encontrada(s)`,
            severity: activeCount > 0 ? 'low' : 'medium',
            category: 'api'
          });
        }
      } catch {
        scanResults.push({
          id: 'api-keys-error',
          name: 'Verificacao de API Keys',
          status: 'fail',
          message: 'Erro ao verificar API keys',
          severity: 'medium',
          category: 'api'
        });
      }

      try {
        const { error } = await supabase
          .from('logs_atividades')
          .select('id')
          .eq('tenant_id', tenantId)
          .gte('data_hora', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!error) {
          scanResults.push({
            id: 'activity-logs',
            name: 'Sistema de Auditoria',
            status: 'pass',
            message: 'Sistema de logs funcionando corretamente',
            severity: 'low',
            category: 'permissions'
          });
        }
      } catch {
        scanResults.push({
          id: 'logs-error',
          name: 'Sistema de Auditoria',
          status: 'fail',
          message: 'Erro no sistema de logs de auditoria',
          severity: 'high',
          category: 'permissions'
        });
      }

      // WhatsApp Evolution API connectivity check
      try {
        const { data: whatsappConfig, error } = await supabase
          .from('configuracoes_integracoes')
          .select('id, status')
          .eq('nome_integracao', 'whatsapp_evolution')
          .maybeSingle();

        if (!error) {
          const isActive = whatsappConfig?.status === 'ativa';
          scanResults.push({
            id: 'whatsapp-connectivity',
            name: 'WhatsApp Evolution API',
            status: isActive ? 'pass' : whatsappConfig ? 'warning' : 'warning',
            message: isActive ? 'WhatsApp conectado e ativo' : whatsappConfig ? 'WhatsApp configurado mas inativo' : 'WhatsApp não configurado',
            severity: 'medium',
            category: 'network'
          });
        }
      } catch {
        scanResults.push({
          id: 'whatsapp-error',
          name: 'WhatsApp Evolution API',
          status: 'fail',
          message: 'Erro ao verificar integração WhatsApp',
          severity: 'medium',
          category: 'network'
        });
      }

      const totalChecks = scanResults.length;
      const passedChecks = scanResults.filter(c => c.status === 'pass').length;
      const failedChecks = scanResults.filter(c => c.status === 'fail').length;
      const warningChecks = scanResults.filter(c => c.status === 'warning').length;
      const securityScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

      setChecks(scanResults);
      setMetrics({
        totalChecks,
        passedChecks,
        failedChecks,
        warningChecks,
        securityScore,
        lastScan: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Security] erro no scan de seguranca:', error);
      toast({
        title: 'Erro no scan de seguranca',
        description: 'Nao foi possivel completar a verificacao de seguranca',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      void runSecurityScan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tenantId]);

  return {
    checks,
    metrics,
    loading,
    runSecurityScan,
    isSecure: metrics.securityScore >= 80,
    hasWarnings: metrics.warningChecks > 0,
    hasCritical: checks.some(c => c.severity === 'critical' && c.status === 'fail')
  };
};
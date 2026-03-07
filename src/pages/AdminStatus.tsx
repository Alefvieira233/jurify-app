import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

type CheckStatus = 'checking' | 'ok' | 'warn' | 'fail';

interface HealthCheck {
  name: string;
  status: CheckStatus;
  latencyMs: number | null;
  detail: string;
}

const statusIcon = (s: CheckStatus) => {
  switch (s) {
    case 'ok': return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'warn': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'fail': return <XCircle className="h-5 w-5 text-red-500" />;
    default: return <Clock className="h-5 w-5 text-muted-foreground animate-spin" />;
  }
};

const statusBadge = (s: CheckStatus) => {
  const map: Record<CheckStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ok: { label: 'OK', variant: 'default' },
    warn: { label: 'Warning', variant: 'secondary' },
    fail: { label: 'Falha', variant: 'destructive' },
    checking: { label: 'Verificando...', variant: 'outline' },
  };
  const { label, variant } = map[s];
  return <Badge variant={variant}>{label}</Badge>;
};

async function checkSupabaseApi(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const ms = Date.now() - start;
    if (error) return { name: 'Supabase API', status: 'fail', latencyMs: ms, detail: error.message };
    return { name: 'Supabase API', status: ms > 3000 ? 'warn' : 'ok', latencyMs: ms, detail: ms > 3000 ? 'Latência alta' : 'Conectado' };
  } catch (e) {
    return { name: 'Supabase API', status: 'fail', latencyMs: Date.now() - start, detail: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}

async function checkSupabaseAuth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const { data, error } = await supabase.auth.getSession();
    const ms = Date.now() - start;
    if (error) return { name: 'Supabase Auth', status: 'fail', latencyMs: ms, detail: error.message };
    return { name: 'Supabase Auth', status: 'ok', latencyMs: ms, detail: data.session ? 'Sessão ativa' : 'Sem sessão' };
  } catch (e) {
    return { name: 'Supabase Auth', status: 'fail', latencyMs: Date.now() - start, detail: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}

async function checkEdgeFunctions(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(10_000),
    });
    const ms = Date.now() - start;
    if (resp.ok) return { name: 'Edge Functions', status: ms > 5000 ? 'warn' : 'ok', latencyMs: ms, detail: `HTTP ${resp.status}` };
    return { name: 'Edge Functions', status: 'warn', latencyMs: ms, detail: `HTTP ${resp.status} — pode precisar de deploy` };
  } catch (e) {
    return { name: 'Edge Functions', status: 'warn', latencyMs: Date.now() - start, detail: e instanceof Error ? e.message : 'Não disponível' };
  }
}

function checkSentryConfig(): HealthCheck {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return { name: 'Sentry', status: 'warn', latencyMs: null, detail: 'DSN não configurado' };
  return { name: 'Sentry', status: 'ok', latencyMs: null, detail: 'Configurado' };
}

function checkAppVersion(): HealthCheck {
  const version = import.meta.env.VITE_APP_VERSION || 'dev';
  return { name: 'App Version', status: 'ok', latencyMs: null, detail: version.length > 12 ? version.slice(0, 12) + '…' : version };
}

function checkBrowserInfo(): HealthCheck {
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency || 'N/A';
  return { name: 'Browser', status: 'ok', latencyMs: null, detail: `${cores} cores${mem ? `, ${mem}GB RAM` : ''}` };
}

export default function AdminStatus() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runChecks = useCallback(async () => {
    setLoading(true);
    const initial: HealthCheck[] = [
      { name: 'Supabase API', status: 'checking', latencyMs: null, detail: '' },
      { name: 'Supabase Auth', status: 'checking', latencyMs: null, detail: '' },
      { name: 'Edge Functions', status: 'checking', latencyMs: null, detail: '' },
      checkSentryConfig(),
      checkAppVersion(),
      checkBrowserInfo(),
    ];
    setChecks(initial);

    const [api, auth, edge] = await Promise.all([
      checkSupabaseApi(),
      checkSupabaseAuth(),
      checkEdgeFunctions(),
    ]);

    setChecks([api, auth, edge, checkSentryConfig(), checkAppVersion(), checkBrowserInfo()]);
    setLastRun(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { void runChecks(); }, [runChecks]);

  const overallStatus: CheckStatus = checks.some(c => c.status === 'fail')
    ? 'fail'
    : checks.some(c => c.status === 'warn')
      ? 'warn'
      : checks.some(c => c.status === 'checking')
        ? 'checking'
        : 'ok';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Status do Sistema</h1>
          <p className="text-muted-foreground text-sm">
            {lastRun ? `Última verificação: ${lastRun.toLocaleTimeString('pt-BR')}` : 'Verificando...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {statusBadge(overallStatus)}
          <Button variant="outline" size="sm" onClick={() => void runChecks()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Verificar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {checks.map(check => (
          <Card key={check.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{check.name}</CardTitle>
              {statusIcon(check.status)}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{check.detail}</p>
              {check.latencyMs !== null && (
                <p className="text-xs text-muted-foreground mt-1">{check.latencyMs}ms</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Variáveis de Ambiente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            {[
              ['VITE_SUPABASE_URL', !!import.meta.env.VITE_SUPABASE_URL],
              ['VITE_SUPABASE_ANON_KEY', !!import.meta.env.VITE_SUPABASE_ANON_KEY],
              ['VITE_SENTRY_DSN', !!import.meta.env.VITE_SENTRY_DSN],
              ['VITE_STRIPE_PUBLISHABLE_KEY', !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY],
              ['VITE_APP_VERSION', !!import.meta.env.VITE_APP_VERSION],
            ].map(([name, configured]) => (
              <div key={name as string} className="flex items-center justify-between py-1 border-b last:border-0">
                <code className="text-xs">{name as string}</code>
                <Badge variant={configured ? 'default' : 'secondary'}>
                  {configured ? 'Configurado' : 'Ausente'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

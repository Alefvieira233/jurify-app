/**
 * Public status page — lightweight uptime dashboard.
 *
 * Unauthenticated route at /status. Shows high-level health of user-facing
 * integrations. Only surfaces names/status — no internal metrics, no tenant
 * data. Polls /functions/v1/health (NOT health-check) — the unauthenticated
 * liveness probe that only reports database reachability + edge status.
 *
 * If the detailed /health-check is opened while VITE_PUBLIC_STATUS_TOKEN is set
 * (used by Vercel for ops), the richer per-service status is shown. Otherwise
 * the page falls back to a lightweight "reachable / not reachable" banner.
 */

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

type ServiceState = 'operational' | 'degraded' | 'down' | 'unknown';

interface ServiceRow {
  key: string;
  label: string;
  state: ServiceState;
  detail?: string;
}

const LABELS: Record<string, string> = {
  supabase: 'Supabase (API + Banco)',
  database: 'Banco de Dados',
  openai: 'OpenAI (IA)',
  whatsapp_kapso: 'WhatsApp (Kapso)',
  stripe: 'Pagamentos (Stripe)',
  zapsign: 'Assinatura Digital (ZapSign)',
};

// Services we want to expose publicly. Internal probes (slash_commands_seed,
// ai_agent_processor, etc.) are filtered out.
const PUBLIC_KEYS = ['supabase', 'openai', 'whatsapp_kapso', 'stripe', 'zapsign'];

function mapStatus(raw: string | undefined): ServiceState {
  if (!raw) return 'unknown';
  if (raw === 'connected' || raw === 'ok' || raw === 'deployed') return 'operational';
  if (raw === 'not_configured') return 'unknown';
  if (raw === 'error') return 'down';
  if (raw.startsWith('ok')) return 'operational';
  if (raw.startsWith('seed_missing')) return 'degraded';
  return 'degraded';
}

function stateIcon(state: ServiceState) {
  switch (state) {
    case 'operational':
      return <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />;
    case 'degraded':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" aria-hidden="true" />;
    case 'down':
      return <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
  }
}

function stateBadge(state: ServiceState) {
  const map: Record<ServiceState, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    operational: { label: 'Operacional', variant: 'default' },
    degraded: { label: 'Degradado', variant: 'secondary' },
    down: { label: 'Indisponível', variant: 'destructive' },
    unknown: { label: 'Desconhecido', variant: 'outline' },
  };
  const { label, variant } = map[state];
  return <Badge variant={variant}>{label}</Badge>;
}

export default function StatusPublic() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [overall, setOverall] = useState<ServiceState>('unknown');
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const publicToken = import.meta.env.VITE_PUBLIC_STATUS_TOKEN as string | undefined;

    if (!supabaseUrl) {
      setServices([]);
      setOverall('unknown');
      setLoading(false);
      return;
    }

    // Prefer detailed health-check if we have the public token, otherwise
    // fall back to the lightweight /health endpoint.
    const url = publicToken
      ? `${supabaseUrl}/functions/v1/health-check`
      : `${supabaseUrl}/functions/v1/health`;

    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: publicToken ? { 'x-health-check-token': publicToken } : {},
        signal: AbortSignal.timeout(10_000),
      });
      const json = (await resp.json().catch(() => ({}))) as {
        status?: string;
        services?: Record<string, string>;
      };

      const rows: ServiceRow[] = PUBLIC_KEYS.map((key) => ({
        key,
        label: LABELS[key] ?? key,
        state: mapStatus(json.services?.[key]),
        detail: json.services?.[key],
      }));

      setServices(rows);
      const anyDown = rows.some((r) => r.state === 'down');
      const anyDegraded = rows.some((r) => r.state === 'degraded');
      setOverall(anyDown ? 'down' : anyDegraded ? 'degraded' : resp.ok ? 'operational' : 'degraded');
    } catch {
      setServices(
        PUBLIC_KEYS.map((key) => ({
          key,
          label: LABELS[key] ?? key,
          state: 'unknown',
        }))
      );
      setOverall('unknown');
    } finally {
      setLastRun(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => {
      void fetchStatus();
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Jurify — Status</h1>
          <p className="text-muted-foreground text-sm">
            Status em tempo real dos serviços que sustentam o Jurify.
          </p>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              {stateIcon(overall)}
              {overall === 'operational' && 'Todos os sistemas operacionais'}
              {overall === 'degraded' && 'Alguns sistemas degradados'}
              {overall === 'down' && 'Um ou mais sistemas indisponíveis'}
              {overall === 'unknown' && 'Status indisponível'}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void fetchStatus();
              }}
              disabled={loading}
              aria-label="Atualizar status"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {lastRun
                ? `Última verificação: ${lastRun.toLocaleString('pt-BR')}`
                : 'Verificando...'}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {services.map((svc) => (
            <Card key={svc.key}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  {stateIcon(svc.state)}
                  <span className="font-medium">{svc.label}</span>
                </div>
                {stateBadge(svc.state)}
              </CardContent>
            </Card>
          ))}
          {services.length === 0 && !loading && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Dados de status indisponíveis no momento.
              </CardContent>
            </Card>
          )}
        </div>

        <footer className="text-center text-xs text-muted-foreground pt-4">
          Atualiza automaticamente a cada 60s. Para incidentes em andamento,
          consulte nosso canal oficial.
        </footer>
      </div>
    </div>
  );
}

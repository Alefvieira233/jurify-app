/**
 * AdminMetricsPanel — high-level platform metrics for admin Mission Control.
 *
 * Displays:
 *  - AI tokens consumed in the last 7 days
 *  - Custom slash commands per tenant (total)
 *  - Processos sync events in the last 24h
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, RefreshCcw, Terminal } from 'lucide-react';
import { useAdminMetrics } from '../hooks/useAdminMetrics';

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR').format(n);
}

export function AdminMetricsPanel() {
  const { data, isLoading, isError } = useAdminMetrics();

  const items = [
    {
      label: 'Tokens (últimos 7 dias)',
      value: data?.tokensLast7Days,
      icon: Cpu,
      hint: 'Soma de ai_usage.tokens_total',
    },
    {
      label: 'Slash commands custom',
      value: data?.customSlashCommands,
      icon: Terminal,
      hint: 'Commands com tenant_id definido',
    },
    {
      label: 'Processos sync (24h)',
      value: data?.processosSyncedLast24h,
      icon: RefreshCcw,
      hint: 'last_sync_at nas últimas 24h',
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Cpu className="h-5 w-5" />
        Métricas de Plataforma
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {isLoading ? '…' : isError ? '—' : formatNumber(value)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AdminMetricsPanel;

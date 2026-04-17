/**
 * Honorarios — Dashboard tab.
 *
 * Aggregated view of recebíveis, vencidos, a vencer, and recebimento mensal.
 * Reads data from the `get_honorarios_dashboard` RPC via useHonorariosDashboard.
 */
import { memo, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, Calendar, CheckCircle2, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useHonorariosDashboard } from './hooks/useHonorariosDashboard';
import { useHonorarios, type HonorarioWithOverdue } from '@/hooks/useHonorarios';
import { HONORARIO_STATUS_LABELS } from '@/schemas/honorarioSchema';
import { getStatusClasses } from '@/constants/statusConfig';

const fmt = (v: number | null | undefined) =>
  v != null
    ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

interface StatCardProps {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'success' | 'danger';
}

const toneClasses: Record<Required<StatCardProps>['tone'], string> = {
  default: 'text-foreground',
  warning: 'text-amber-600 dark:text-amber-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  danger: 'text-red-600 dark:text-red-400',
};

const StatCard = memo(({ icon: Icon, label, value, hint, tone = 'default' }: StatCardProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={`text-xl font-bold mt-1 ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
));
StatCard.displayName = 'StatCard';

const HonorariosDashboard = () => {
  const { data, isLoading } = useHonorariosDashboard();
  const { honorarios, loading: listLoading } = useHonorarios({ page: 1 });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo<HonorarioWithOverdue[]>(() => {
    if (statusFilter === 'all') return honorarios;
    if (statusFilter === 'vencido') return honorarios.filter((h) => h.overdue);
    return honorarios.filter((h) => h.status === statusFilter);
  }, [honorarios, statusFilter]);

  const serie = data?.serie_mensal ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Wallet}
          label="Total a Receber"
          value={fmt(data?.total_recebiveis)}
        />
        <StatCard
          icon={AlertTriangle}
          label="Vencidos"
          value={fmt(data?.total_vencidos)}
          hint={`${data?.count_vencidos ?? 0} honorário(s)`}
          tone="danger"
        />
        <StatCard
          icon={Calendar}
          label="A Vencer (30d)"
          value={fmt(data?.total_a_vencer)}
          hint={`${data?.count_a_vencer ?? 0} honorário(s)`}
          tone="warning"
        />
        <StatCard
          icon={CheckCircle2}
          label="Recebidos no Mês"
          value={fmt(data?.total_recebidos_mes)}
          tone="success"
        />
      </div>

      {/* Chart: Recebimento nos últimos 6 meses */}
      <Card>
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-sm font-semibold">Recebimento (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {serie.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Sem dados de recebimento no período.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={serie}>
                <defs>
                  <linearGradient id="gradRecebido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'calc(var(--radius) - 2px)',
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#gradRecebido)"
                  name="Recebido"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Lista filtrada por status */}
      <Card>
        <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Honorários</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="vigente">A receber</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="pago">Recebido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-4">
          {listLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhum honorário neste filtro.
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.slice(0, 15).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3 bg-muted/30 border rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge className={getStatusClasses('honorarios', h.status)}>
                      {HONORARIO_STATUS_LABELS[h.status] ?? h.status}
                    </Badge>
                    {h.overdue && (
                      <Badge variant="destructive" className="text-[10px]">
                        Vencido
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {h.data_vencimento
                        ? new Date(h.data_vencimento).toLocaleDateString('pt-BR')
                        : 'Sem vencimento'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">Acordado:</span>
                    <span className="font-medium">{fmt(h.valor_total_acordado)}</span>
                    <span className="text-muted-foreground">Recebido:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {fmt(h.valor_recebido)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HonorariosDashboard;

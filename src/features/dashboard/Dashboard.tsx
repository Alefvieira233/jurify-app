import React, { useState, useMemo, Suspense } from 'react';
import { ScreenReaderAnnounce } from '@/components/ui/ScreenReaderAnnounce';
const SankeyChart = React.lazy(() => import('./components/SankeyChart'));
import AgentActivityWidget from './components/AgentActivityWidget';
import {
  MessageSquare, Search, CheckCircle, FileText, Trophy, XCircle,
  TrendingUp, Calendar, HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLeads } from '@/hooks/useLeads';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ── Status config matching LíderHub ── */
const STATUS_PIPELINE = [
  { key: 'novo',        label: 'Nova Conversa',  icon: MessageSquare, color: '#6b7280', sparkColor: '#9ca3af' },
  { key: 'em_contato',  label: 'Análise',        icon: Search,        color: '#f59e0b', sparkColor: '#fbbf24' },
  { key: 'qualificado', label: 'Qualificado',    icon: CheckCircle,   color: '#10b981', sparkColor: '#34d399' },
  { key: 'proposta',    label: 'Proposta',        icon: FileText,      color: '#6366f1', sparkColor: '#818cf8' },
  { key: 'ganho',       label: 'Sucesso',         icon: Trophy,        color: '#22c55e', sparkColor: '#4ade80' },
  { key: 'perdido',     label: 'Perdas',          icon: XCircle,       color: '#ef4444', sparkColor: '#f87171' },
] as const;

/* ── Period helpers ── */
function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (period === 'hoje') { start.setHours(0, 0, 0, 0); }
  else if (period === 'semana') { start.setDate(end.getDate() - 7); }
  else if (period === 'mes') { start.setMonth(end.getMonth() - 1); }
  else { start.setMonth(end.getMonth() - 3); }
  return { start, end };
}

function fmtShortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ── Build time-series data for the area chart ── */
function buildTimeSeries(
  leads: Array<{ status: string | null; created_at: string }>,
  range: { start: Date; end: Date },
) {
  const buckets = new Map<string, Record<string, number>>();
  const dayMs = 86400000;
  // Initialize buckets
  for (let t = range.start.getTime(); t <= range.end.getTime(); t += dayMs) {
    const key = fmtShortDate(new Date(t));
    const entry: Record<string, number> = { _ts: t };
    for (const s of STATUS_PIPELINE) entry[s.key] = 0;
    buckets.set(key, entry);
  }
  // Fill
  for (const lead of leads) {
    const d = new Date(lead.created_at);
    const key = fmtShortDate(d);
    const bucket = buckets.get(key);
    if (bucket && lead.status) {
      bucket[lead.status] = (bucket[lead.status] ?? 0) + 1;
    }
  }
  return Array.from(buckets.values()).sort((a, b) => (a._ts as number) - (b._ts as number));
}

/* ── Sparkline mini chart ── */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="mt-2">
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} />
      <polygon fill={color} fillOpacity={0.1} points={areaPoints} />
    </svg>
  );
}

/* ── Dashboard ── */
const Dashboard = () => {
  usePageTitle('Dashboard');
  const { leads, error: leadsError } = useLeads();
  const [periodo, setPeriodo] = useState('semana');

  const range = useMemo(() => getDateRange(periodo), [periodo]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      const d = new Date(l.created_at);
      return d >= range.start && d <= range.end;
    });
  }, [leads, range]);

  const totalFiltered = filteredLeads.length;
  const totalAll = leads?.length ?? 0;

  // Stat cards data
  const statCards = useMemo(() => {
    return STATUS_PIPELINE.map(s => {
      const count = filteredLeads.filter(l => l.status === s.key).length;
      const pct = totalFiltered > 0 ? ((count / totalFiltered) * 100).toFixed(1) : '0.0';

      // Build mini sparkline data (last 7 data points)
      const dayMs = 86400000;
      const sparkDays = 7;
      const sparkData: number[] = [];
      for (let i = sparkDays - 1; i >= 0; i--) {
        const dayStart = new Date(range.end.getTime() - i * dayMs);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + dayMs);
        const dayCount = filteredLeads.filter(l => {
          const d = new Date(l.created_at);
          return l.status === s.key && d >= dayStart && d < dayEnd;
        }).length;
        sparkData.push(dayCount);
      }

      return { ...s, count, pct, sparkData };
    });
  }, [filteredLeads, totalFiltered, range]);

  // Time series for area chart
  const timeSeries = useMemo(() => buildTimeSeries(filteredLeads, range), [filteredLeads, range]);

  if (leadsError) {
    return (
      <div className="h-[calc(100vh-var(--topbar-h,4rem))] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-destructive font-medium">Erro ao carregar dados</p>
          <p className="text-sm text-muted-foreground mt-1">Tente recarregar a pagina</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </div>
      </div>
    );
  }

  const announceMessage = leads && !leadsError
    ? `Dashboard carregado. ${totalFiltered} leads no período selecionado.`
    : '';

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {announceMessage && <ScreenReaderAnnounce message={announceMessage} />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das métricas de conversas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period tabs */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mês' },
              { id: 'trimestre', label: 'Trimestre' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  periodo === p.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Date range badge */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {fmtShortDate(range.start)} - {fmtShortDate(range.end)}
          </div>
        </div>
      </div>

      {/* ── Atividade dos Agentes IA ── */}
      <AgentActivityWidget />

      {/* ── Eventos por Status — 6 stat cards ── */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Eventos por Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="border border-border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                    {s.label}
                  </span>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/40 ml-auto shrink-0" />
                </div>
                <div className="text-2xl font-bold text-foreground">{s.count}</div>
                <div className="text-[11px] text-muted-foreground">{s.pct}%</div>
                <MiniSparkline data={s.sparkData} color={s.sparkColor} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Análise de Performance — Area Chart ── */}
      <div className="border border-border rounded-lg p-5 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Evolução Temporal</h2>
          </div>
          <span className="text-xs text-muted-foreground">Por período</span>
        </div>

        {timeSeries.length > 1 ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {STATUS_PIPELINE.map(s => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="_ts"
                tickFormatter={(v: number) => fmtShortDate(new Date(v))}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={(v: number) => fmtShortDate(new Date(v))}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                formatter={(value: string) => {
                  const found = STATUS_PIPELINE.find(s => s.key === value);
                  return found?.label ?? value;
                }}
              />
              {STATUS_PIPELINE.map(s => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#grad-${s.key})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
            Sem dados suficientes para o gráfico no período selecionado.
          </div>
        )}
      </div>

      {/* ── Fluxo do Pipeline — Sankey diagram ── */}
      <Suspense fallback={<div className="h-[300px] rounded-lg bg-muted animate-pulse" />}>
        <SankeyChart leads={filteredLeads} />
      </Suspense>

      {/* ── Pipeline Overview — horizontal bar summary ── */}
      <div className="border border-border rounded-lg p-5 bg-card">
        <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição do Pipeline</h2>
        <div className="space-y-3">
          {STATUS_PIPELINE.map(s => {
            const count = filteredLeads.filter(l => l.status === s.key).length;
            const pct = totalFiltered > 0 ? (count / totalFiltered) * 100 : 0;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-28 shrink-0">{s.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: s.color }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground w-8 text-right">{count}</span>
                <span className="text-[10px] text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
        {/* Total summary */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-xs font-medium text-muted-foreground">Total no período</span>
          <span className="text-sm font-bold text-foreground">{totalFiltered} leads</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">Total geral</span>
          <span className="text-sm text-muted-foreground">{totalAll} leads</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

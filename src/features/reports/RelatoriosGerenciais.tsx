
import { useMemo, lazy, Suspense, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download, TrendingUp, Users, FileText, Calendar, BarChart3, Filter } from 'lucide-react';
import { useDashboardMetricsFast } from '@/hooks/useDashboardMetricsFast';
import { useMRR } from '@/hooks/useMRR';
import { useResponseTime } from '@/hooks/useResponseTime';
import { useLeads } from '@/hooks/useLeads';
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel';
import { RevenueCard } from '@/components/analytics/RevenueCard';
import { ResponseTimeChart } from '@/components/analytics/ResponseTimeChart';
import { ChurnCard } from '@/components/analytics/ChurnCard';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatarEtapaPipeline } from '@/utils/formatting';
import { useQuery } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/* Analytics avançado — lazy para não bloquear o bundle principal */
const AnalyticsDashboard = lazy(() =>
  import('@/components/analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard }))
);

/* ─────────────────────────────────────────────────────────────────────────── */

type PeriodKey = 'hoje' | 'esta_semana' | 'este_mes' | '30_dias' | '90_dias' | 'personalizado';

interface PeriodRange {
  start: Date;
  end: Date;
}

function computePeriodRange(period: PeriodKey, customStart?: string, customEnd?: string): PeriodRange {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  switch (period) {
    case 'hoje':
      return { start: todayStart, end: todayEnd };
    case 'esta_semana': {
      const day = todayStart.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - diff);
      return { start: weekStart, end: todayEnd };
    }
    case 'este_mes': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: todayEnd };
    }
    case '30_dias': {
      const d30 = new Date(todayStart);
      d30.setDate(d30.getDate() - 30);
      return { start: d30, end: todayEnd };
    }
    case '90_dias': {
      const d90 = new Date(todayStart);
      d90.setDate(d90.getDate() - 90);
      return { start: d90, end: todayEnd };
    }
    case 'personalizado': {
      const s = customStart ? new Date(customStart) : todayStart;
      const e = customEnd ? new Date(customEnd) : todayEnd;
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
  }
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoje: 'Hoje',
  esta_semana: 'Esta semana',
  este_mes: 'Este mês',
  '30_dias': 'Últimos 30 dias',
  '90_dias': 'Últimos 90 dias',
  personalizado: 'Personalizado',
};

/* ─── Empty chart placeholder ─────────────────────────────────────────────── */

const EmptyChart = ({ message = 'Sem dados para o período' }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
    <h3 className="text-lg font-medium text-foreground mb-2">{message}</h3>
    <p className="text-sm text-muted-foreground">Aguarde os primeiros registros serem criados</p>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────── */

const RelatoriosGerenciais = () => {
  usePageTitle('Relatórios');
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const { metrics, loading, error } = useDashboardMetricsFast();
  const { data: mrrData } = useMRR();
  const { data: responseTimeData = [] } = useResponseTime(7);
  const { leads } = useLeads();
  const [tab, setTab] = useState<'resumo' | 'financeiro' | 'analytics'>('resumo');

  /* ── Period filter state ── */
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('30_dias');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periodRange = useMemo(
    () => computePeriodRange(selectedPeriod, customStart, customEnd),
    [selectedPeriod, customStart, customEnd],
  );

  /* ── Agendamentos query for "por área" chart ── */
  const { data: agendamentosList = [] } = useQuery({
    queryKey: ['agendamentos-report', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('agendamentos')
        .select('id, area_juridica, data_hora, status, created_at')
        .eq('tenant_id', tenantId);
      return (data || []) as Array<{
        id: string;
        area_juridica: string | null;
        data_hora: string;
        status: string | null;
        created_at: string;
      }>;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  /* ── Clients per month query (Analytics tab) ── */
  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients-report', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('leads')
        .select('id, status, created_at')
        .eq('tenant_id', tenantId)
        .in('status', ['contrato_assinado', 'em_atendimento', 'convertido']);
      return (data || []) as Array<{ id: string; status: string | null; created_at: string }>;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  /* ── CSV export helpers ── */
  type CsvRow = { section: string; name: string; value: string | number; value_2?: string | number; value_3?: string | number };
  const csvHeaders = ['section', 'name', 'value', 'value_2', 'value_3'];

  const toCsv = (rows: CsvRow[]) => {
    const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [csvHeaders.join(','), ...rows.map(r => csvHeaders.map(h => esc(r[h as keyof CsvRow])).join(','))].join('\n');
  };

  const downloadCsv = (filename: string, rows: CsvRow[]) => {
    if (!rows.length) return;
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleExportRelatorios = () => {
    if (!metrics) return;
    const rows: CsvRow[] = [
      { section: 'kpi', name: 'total_leads',            value: metrics.totalLeads },
      { section: 'kpi', name: 'leads_novo_mes',         value: metrics.leadsNovoMes },
      { section: 'kpi', name: 'contratos',              value: metrics.contratos },
      { section: 'kpi', name: 'contratos_assinados',    value: metrics.contratosAssinados },
      { section: 'kpi', name: 'agendamentos',           value: metrics.agendamentos },
      { section: 'kpi', name: 'agendamentos_hoje',      value: metrics.agendamentosHoje },
      { section: 'kpi', name: 'agentes_ativos',         value: metrics.agentesAtivos },
      { section: 'kpi', name: 'execucoes_agentes_hoje', value: metrics.execucoesAgentesHoje },
      ...Object.entries(metrics.leadsPorStatus).map(([name, value]) => ({ section: 'status', name, value })),
      ...metrics.leadsPorArea.map(a => ({ section: 'area', name: a.area, value: a.total })),
      ...metrics.execucoesRecentesAgentes.map(a => ({ section: 'agente', name: a.agente_nome, value: a.total_execucoes, value_2: a.sucesso, value_3: a.erro })),
    ];
    downloadCsv(`relatorios-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleExportDemo = () => {
    const demoRows: CsvRow[] = [
      { section: 'kpi', name: 'total_leads', value: 120 },
      { section: 'kpi', name: 'contratos',   value: 42  },
      { section: 'area', name: 'Trabalhista', value: 30  },
      { section: 'area', name: 'Cível',       value: 28  },
    ];
    downloadCsv('relatorios-demo.csv', demoRows);
  };

  /* ── Memoized chart data ── */
  const COLORS = ['#2563eb', '#059669', '#d97706', '#e11d48', '#4f46e5', '#0891b2'];

  const statusData = useMemo(() =>
    metrics ? Object.entries(metrics.leadsPorStatus).map(([status, count]) => ({
      name: formatarEtapaPipeline(status), value: count,
    })) : [],
  [metrics]);

  const areaData = useMemo(() =>
    metrics ? metrics.leadsPorArea.slice(0, 6).map(item => ({ name: item.area, leads: item.total })) : [],
  [metrics]);

  const agentesData = useMemo(() =>
    metrics ? metrics.execucoesRecentesAgentes.map(a => ({
      name: a.agente_nome, execucoes: a.total_execucoes, sucesso: a.sucesso, erro: a.erro,
    })) : [],
  [metrics]);

  /* ── Origem dos Leads — horizontal bar chart ── */
  const origemData = useMemo(() => {
    if (!leads || leads.length === 0) return [];
    const filtered = leads.filter(l => {
      const created = new Date(l.created_at);
      return created >= periodRange.start && created <= periodRange.end;
    });
    const origemMap = new Map<string, number>();
    for (const lead of filtered) {
      const origem = lead.origem || 'Não informado';
      origemMap.set(origem, (origemMap.get(origem) ?? 0) + 1);
    }
    return Array.from(origemMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leads, periodRange]);

  /* ── Agendamentos por Área Jurídica — pie chart ── */
  const agendamentosPorAreaData = useMemo(() => {
    if (!agendamentosList || agendamentosList.length === 0) return [];
    const filtered = agendamentosList.filter(a => {
      const created = new Date(a.created_at);
      return created >= periodRange.start && created <= periodRange.end;
    });
    const areaMap = new Map<string, number>();
    for (const ag of filtered) {
      const area = ag.area_juridica || 'Não informado';
      areaMap.set(area, (areaMap.get(area) ?? 0) + 1);
    }
    return Array.from(areaMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [agendamentosList, periodRange]);

  /* ── Clients per month (Analytics) ── */
  const clientsPerMonthData = useMemo(() => {
    if (!clientsList || clientsList.length === 0) return [];
    const monthMap = new Map<string, number>();
    for (const client of clientsList) {
      const d = new Date(client.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    }
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const label = `${monthNames[Number(month) - 1]}/${year?.slice(2)}`;
        return { name: label, clientes: value };
      });
  }, [clientsList]);

  /* ── Agentes IA analytics (bar + line) ── */
  const agentesAnalyticsData = useMemo(() => {
    if (!metrics) return [];
    return metrics.execucoesRecentesAgentes.map(a => ({
      name: a.agente_nome,
      total: a.total_execucoes,
      sucesso: a.sucesso,
      erro: a.erro,
      taxaSucesso: a.total_execucoes > 0
        ? Number(((a.sucesso / a.total_execucoes) * 100).toFixed(1))
        : 0,
    }));
  }, [metrics]);

  const tooltipStyle = {
    contentStyle: {
      background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
      borderRadius: 'calc(var(--radius) - 2px)', fontSize: 11,
      color: 'hsl(var(--foreground))', boxShadow: 'var(--shadow-md)',
    },
    labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600 },
    itemStyle: { color: 'hsl(var(--muted-foreground))' },
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div>
          </div>
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
        <div className="flex-1 p-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  /* ── Error / empty ── */
  if (error || !metrics) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">Relatórios</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Análises e insights do seu escritório</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <Card className="border-blue-500/25 bg-blue-500/5 shadow-card">
            <CardContent className="p-8 text-center">
              <TrendingUp className="h-12 w-12 text-blue-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground mb-1">Relatórios em preparação</h3>
              <p className="text-xs text-muted-foreground mb-4">Os relatórios serão gerados assim que houver dados suficientes.</p>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportDemo}>
                <Download className="h-3.5 w-3.5" /> Gerar Relatório Demo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── Header ── */}
      <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">Relatórios</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {metrics.totalLeads} leads · {metrics.contratos} contratos · {metrics.agentesAtivos} agentes IA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tab === 'resumo' && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportRelatorios}>
                <Download className="h-3.5 w-3.5" /> Exportar CSV
              </Button>
            )}
          </div>
        </div>

        {/* ── Period filter (above tabs) ── */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PeriodKey)}>
            <SelectTrigger className="h-7 w-[180px] text-[11px]">
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPeriod === 'personalizado' && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-7 w-[130px] text-[11px]"
                aria-label="Data inicial"
              />
              <span className="text-[11px] text-muted-foreground">até</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-7 w-[130px] text-[11px]"
                aria-label="Data final"
              />
            </div>
          )}

          <span className="text-[10px] text-muted-foreground ml-1">
            {periodRange.start.toLocaleDateString('pt-BR')} — {periodRange.end.toLocaleDateString('pt-BR')}
          </span>
        </div>

        {/* Tab list abaixo do filtro */}
        <div className="mt-2.5">
          <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
            <TabsList className="h-7 p-0.5 bg-muted/60">
              <TabsTrigger value="resumo"     className="h-6 text-[11px] px-3">Resumo</TabsTrigger>
              <TabsTrigger value="financeiro" className="h-6 text-[11px] px-3">Financeiro</TabsTrigger>
              <TabsTrigger value="analytics"  className="h-6 text-[11px] px-3">Analytics</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>

          {/* ── Aba: Resumo ── */}
          <TabsContent value="resumo" className="mt-0 px-5 py-5 space-y-5 fade-in">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="border-border shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Total de Leads</p>
                      <p className="text-2xl font-bold tabular-nums mt-0.5">{metrics.totalLeads}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">+{metrics.leadsNovoMes} este mês</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,99,235,0.08)' }}>
                      <Users className="h-4 w-4" style={{ color: '#2563eb' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Contratos</p>
                      <p className="text-2xl font-bold tabular-nums mt-0.5">{metrics.contratos}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{metrics.contratosAssinados} assinados</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(5,150,105,0.08)' }}>
                      <FileText className="h-4 w-4" style={{ color: '#059669' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Agendamentos</p>
                      <p className="text-2xl font-bold tabular-nums mt-0.5">{metrics.agendamentos}</p>
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">{metrics.agendamentosHoje} hoje</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(147,51,234,0.08)' }}>
                      <Calendar className="h-4 w-4" style={{ color: '#9333ea' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Agentes IA</p>
                      <p className="text-2xl font-bold tabular-nums mt-0.5">{metrics.agentesAtivos}</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">{metrics.execucoesAgentesHoje} hoje</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(217,119,6,0.08)' }}>
                      <TrendingUp className="h-4 w-4" style={{ color: '#d97706' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Existing Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border shadow-card">
                <CardHeader className="px-4 py-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold">Pipeline de Leads</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {statusData.length === 0 ? (
                    <EmptyChart message="Sem dados para o período" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80} fill="#8884d8" dataKey="value"
                        >
                          {statusData.map((_e, i) => <Cell key={`status-${i}`} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border shadow-card">
                <CardHeader className="px-4 py-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold">Leads por Área Jurídica</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {areaData.length === 0 ? (
                    <EmptyChart message="Sem dados para o período" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={areaData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="leads" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border shadow-card">
                <CardHeader className="px-4 py-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold">Performance dos Agentes IA</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {agentesData.length === 0 ? (
                    <EmptyChart message="Sem dados de agentes" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={agentesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="sucesso" stackId="a" fill="#059669" name="Sucesso" />
                        <Bar dataKey="erro" stackId="a" fill="#e11d48" name="Erro" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border shadow-card">
                <CardHeader className="px-4 py-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold">Resumo do Período</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-center p-2.5 bg-blue-500/8 border border-blue-500/20 rounded-lg">
                    <span className="text-xs font-medium text-foreground">Taxa de Conversão</span>
                    <Badge variant="secondary" className="text-xs">
                      {metrics.totalLeads > 0 ? `${((metrics.contratosAssinados / metrics.totalLeads) * 100).toFixed(1)}%` : '0%'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-emerald-500/8 border border-emerald-500/20 rounded-lg">
                    <span className="text-xs font-medium text-foreground">Leads Ativos</span>
                    <Badge variant="secondary" className="text-xs">
                      {metrics.leadsPorStatus.em_qualificacao + metrics.leadsPorStatus.proposta_enviada}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-purple-500/8 border border-purple-500/20 rounded-lg">
                    <span className="text-xs font-medium text-foreground">Agendamentos Pendentes</span>
                    <Badge variant="secondary" className="text-xs">{metrics.agendamentos}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-amber-500/8 border border-amber-500/20 rounded-lg">
                    <span className="text-xs font-medium text-foreground">Execuções de IA</span>
                    <Badge variant="secondary" className="text-xs">
                      {metrics.execucoesRecentesAgentes.reduce((acc, a) => acc + a.total_execucoes, 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── NEW: Origem dos Leads + Agendamentos por Área ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border shadow-card">
                <CardHeader className="px-4 py-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold">Origem dos Leads</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {origemData.length === 0 ? (
                    <EmptyChart message="Sem dados de origem" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={origemData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Leads" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border shadow-card">
                <CardHeader className="px-4 py-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold">Agendamentos por Área Jurídica</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {agendamentosPorAreaData.length === 0 ? (
                    <EmptyChart message="Sem dados de agendamentos" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={agendamentosPorAreaData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {agendamentosPorAreaData.map((_e, i) => (
                            <Cell key={`ag-area-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Aba: Financeiro ── */}
          <TabsContent value="financeiro" className="mt-0 px-5 py-5 space-y-5 fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <ConversionFunnel data={metrics.leadsPorStatus} />
              </div>
              <div className="space-y-5">
                <RevenueCard
                  currentMRR={mrrData?.currentMRR ?? 0}
                  previousMRR={mrrData?.previousMRR ?? 0}
                  contractsThisMonth={metrics.contratosAssinados}
                  avgTicket={mrrData?.avgTicket ?? 0}
                  targetMRR={50000}
                />
                <ChurnCard
                  churnRate={mrrData?.churnRate ?? 0}
                  ltv={mrrData?.ltv ?? 0}
                  canceledThisMonth={mrrData?.canceledThisMonth ?? 0}
                  netNewMRR={mrrData?.netNewMRR ?? 0}
                />
              </div>
            </div>
            <ResponseTimeChart data={responseTimeData} targetResponseTime={3} />
          </TabsContent>

          {/* ── Aba: Analytics ── */}
          <TabsContent value="analytics" className="mt-0 fade-in">
            <Suspense fallback={
              <div className="px-5 py-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <Skeleton className="h-72 rounded-xl" />
              </div>
            }>
              <AnalyticsDashboard />
            </Suspense>

            {/* ── Additional Analytics: Clientes + Agentes IA ── */}
            <div className="px-5 py-5 space-y-5">

              {/* Novos Clientes por Mês */}
              <Card className="border-border shadow-card">
                <CardHeader className="px-4 py-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold">Novos Clientes por Mês</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {clientsPerMonthData.length === 0 ? (
                    <EmptyChart message="Sem dados de clientes" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={clientsPerMonthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip {...tooltipStyle} />
                        <Line
                          type="monotone"
                          dataKey="clientes"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ fill: '#2563eb', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Clientes"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Agentes IA — Detalhamento */}
              <Card className="border-border shadow-card">
                <CardHeader className="px-4 py-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold">Agentes IA — Detalhamento</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {agentesAnalyticsData.length === 0 ? (
                    <EmptyChart message="Sem dados de agentes IA" />
                  ) : (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={agentesAnalyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                          <Tooltip {...tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar yAxisId="left" dataKey="sucesso" fill="#059669" name="Sucesso" stackId="exec" />
                          <Bar yAxisId="left" dataKey="erro" fill="#e11d48" name="Erro" stackId="exec" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="taxaSucesso" stroke="#d97706" strokeWidth={2} dot={{ fill: '#d97706', r: 3 }} name="Taxa de Sucesso (%)" />
                        </ComposedChart>
                      </ResponsiveContainer>

                      {/* Summary cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {agentesAnalyticsData.map(agent => (
                          <div key={agent.name} className="flex justify-between items-center p-2.5 bg-muted/40 border border-border rounded-lg">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
                              <p className="text-[10px] text-muted-foreground">{agent.total} execuções</p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] flex-shrink-0 ${
                                agent.taxaSucesso >= 80
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : agent.taxaSucesso >= 50
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                              }`}
                            >
                              {agent.taxaSucesso}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default RelatoriosGerenciais;


import { useMemo, lazy, Suspense, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, TrendingUp, Users, FileText, Calendar, BarChart3 } from 'lucide-react';
import { useDashboardMetricsFast } from '@/hooks/useDashboardMetricsFast';
import { useMRR } from '@/hooks/useMRR';
import { useResponseTime } from '@/hooks/useResponseTime';
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel';
import { RevenueCard } from '@/components/analytics/RevenueCard';
import { ResponseTimeChart } from '@/components/analytics/ResponseTimeChart';
import { usePageTitle } from '@/hooks/usePageTitle';

/* Analytics avançado — lazy para não bloquear o bundle principal */
const AnalyticsDashboard = lazy(() =>
  import('@/components/analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard }))
);

/* ─────────────────────────────────────────────────────────────────────────── */

const RelatoriosGerenciais = () => {
  usePageTitle('Relatórios');
  const { metrics, loading, error } = useDashboardMetricsFast();
  const { data: mrrData } = useMRR();
  const { data: responseTimeData = [] } = useResponseTime(7);
  const [tab, setTab] = useState<'resumo' | 'financeiro' | 'analytics'>('resumo');

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
      name: status.replace('_', ' ').toUpperCase(), value: count,
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

        {/* Tab list abaixo do título */}
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border shadow-card">
                <CardHeader className="px-4 py-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold">Pipeline de Leads</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {statusData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Sem dados para o período</h3>
                      <p className="text-sm text-muted-foreground">Aguarde os primeiros leads serem registrados</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80} fill="#8884d8" dataKey="value"
                        >
                          {statusData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Sem dados para o período</h3>
                      <p className="text-sm text-muted-foreground">Aguarde os primeiros leads serem registrados</p>
                    </div>
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
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Sem dados de agentes</h3>
                      <p className="text-sm text-muted-foreground">Nenhuma execução de agente registrada ainda</p>
                    </div>
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
          </TabsContent>

          {/* ── Aba: Financeiro ── */}
          <TabsContent value="financeiro" className="mt-0 px-5 py-5 space-y-5 fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <ConversionFunnel data={metrics.leadsPorStatus} />
              </div>
              <div>
                <RevenueCard
                  currentMRR={mrrData?.currentMRR ?? 0}
                  previousMRR={mrrData?.previousMRR ?? 0}
                  contractsThisMonth={metrics.contratosAssinados}
                  avgTicket={mrrData?.avgTicket ?? 0}
                  targetMRR={50000}
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
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default RelatoriosGerenciais;


import { useMemo, Suspense, useState } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
const MetricasOperacionais = lazyWithRetry(() => import('./MetricasOperacionais'));
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, TrendingUp, BarChart3 } from 'lucide-react';
import { useMRR } from '@/hooks/useMRR';
import { useResponseTime } from '@/hooks/useResponseTime';
import { ConversionFunnel, RevenueCard, ResponseTimeChart, ChurnCard } from '@/features/dashboard';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { PeriodKey } from './useReportMetrics';
import { computePeriodRange, tooltipStyle } from './useReportMetrics';
import { useReportMetrics } from './useReportMetrics';
import ReportFilters from './ReportFilters';
import ReportChartPanel, { EmptyChart } from './ReportChartPanel';
import { useReportExport, type ExportFormat, type ExportData } from './hooks/useReportExport';

/* Analytics avançado — lazy para não bloquear o bundle principal */
const AnalyticsDashboard = lazyWithRetry(() =>
  import('@/features/dashboard/components/analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard }))
);

/* ─────────────────────────────────────────────────────────────────────────── */

const RelatoriosGerenciais = () => {
  usePageTitle('Relatórios');
  const [tab, setTab] = useState<'resumo' | 'financeiro' | 'analytics' | 'operacional'>('resumo');

  /* ── Period filter state ── */
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('30_dias');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periodRange = useMemo(
    () => computePeriodRange(selectedPeriod, customStart, customEnd),
    [selectedPeriod, customStart, customEnd],
  );

  /* ── Metrics & chart data ── */
  const { data: mrrData } = useMRR();
  const { data: responseTimeData = [] } = useResponseTime(7);

  const {
    metrics,
    loading,
    error,
    statusData,
    areaData,
    agentesData,
    origemData,
    agendamentosPorAreaData,
    clientsPerMonthData,
    agentesAnalyticsData,
    handleExportRelatorios,
    handleExportDemo,
  } = useReportMetrics(periodRange);

  /* ── Multi-format export (CSV / PDF) ── */
  const { exportCSV, exportPDF, exporting } = useReportExport();

  const buildResumoExportData = (): ExportData => {
    const rows: Array<Array<string | number>> = [];
    if (metrics) {
      rows.push(['KPI', 'Total de Leads', metrics.totalLeads]);
      rows.push(['KPI', 'Leads Novos no Mês', metrics.leadsNovoMes]);
      rows.push(['KPI', 'Contratos', metrics.contratos]);
      rows.push(['KPI', 'Contratos Assinados', metrics.contratosAssinados]);
      rows.push(['KPI', 'Agendamentos', metrics.agendamentos]);
      rows.push(['KPI', 'Agendamentos Hoje', metrics.agendamentosHoje]);
      rows.push(['KPI', 'Agentes Ativos', metrics.agentesAtivos]);
      rows.push(['KPI', 'Execuções Agentes Hoje', metrics.execucoesAgentesHoje]);
      statusData.forEach((s) => rows.push(['Status Leads', s.name, s.value]));
      areaData.forEach((a) => rows.push(['Área Jurídica', a.name, a.leads]));
      origemData.forEach((o) => rows.push(['Origem Lead', o.name, o.value]));
      agentesData.forEach((a) => rows.push(['Agente IA', a.name, a.execucoes]));
    }
    return {
      headers: ['Seção', 'Nome', 'Valor'],
      rows,
      title: `Relatório Gerencial — ${new Date().toLocaleDateString('pt-BR')}`,
    };
  };

  const handleExport = async (format: ExportFormat) => {
    const data = buildResumoExportData();
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      // Keep existing CSV path as fallback for test parity, but use the new hook
      // for consistent toast + loading UX.
      await exportCSV(data, `relatorio-gerencial-${stamp}.csv`);
      return;
    }
    if (format === 'pdf') {
      await exportPDF(data, `relatorio-gerencial-${stamp}.pdf`);
      return;
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))]">
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
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))] bg-background">
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
    <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))] bg-background">

      {/* ── Header Lex Obsidian ── */}
      <header className="flex-shrink-0 px-8 py-6 pb-4 border-b border-border/5 bg-background">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
              <BarChart3 className="w-3.5 h-3.5" />
              Métricas & BI
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Dashboard Gerencial
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Análise de performance, faturamento e saúde da sua operação em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Legacy CSV quick-export kept for regression tests */}
            {tab === 'resumo' && (
              <Button
                onClick={handleExportRelatorios}
                size="sm"
                variant="outline"
                className="gap-2 rounded-[10px]"
                aria-label="Exportar CSV rápido"
              >
                <Download className="h-3.5 w-3.5" /> CSV Rápido
              </Button>
            )}
          </div>
        </div>

        {/* ── Period filter & Tabs ── */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
            <TabsList className="bg-muted/30 p-1 border border-border/10 rounded-[14px]">
              <TabsTrigger value="resumo"      className="rounded-[10px] text-xs h-9 px-4">Resumo Geral</TabsTrigger>
              <TabsTrigger value="financeiro"  className="rounded-[10px] text-xs h-9 px-4">Faturamento</TabsTrigger>
              <TabsTrigger value="analytics"   className="rounded-[10px] text-xs h-9 px-4">Analise Avancada</TabsTrigger>
              <TabsTrigger value="operacional" className="rounded-[10px] text-xs h-9 px-4">Operacional</TabsTrigger>
            </TabsList>
          </Tabs>

          <ReportFilters
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
            onExport={tab === 'resumo' ? handleExport : undefined}
            exporting={exporting}
          />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>

          {/* ── Aba: Resumo ── */}
          <TabsContent value="resumo" className="mt-0 px-8 py-6 pb-12 fade-in">
            <ReportChartPanel
              metrics={metrics}
              statusData={statusData}
              areaData={areaData}
              agentesData={agentesData}
              origemData={origemData}
              agendamentosPorAreaData={agendamentosPorAreaData}
            />
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
                  targetMRR={mrrData?.targetMRR ?? Math.max((mrrData?.currentMRR ?? 0) * 1.2, 10000)}
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

          {/* ── Aba: Operacional ── */}
          <TabsContent value="operacional" className="mt-0 px-5 py-5 pb-12 fade-in">
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Carregando metricas operacionais...</div>}>
              <MetricasOperacionais />
            </Suspense>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default RelatoriosGerenciais;

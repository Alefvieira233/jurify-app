
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, TrendingUp, Users, FileText, Calendar, BarChart3 } from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

const RelatoriosGerenciais = () => {
  const { metrics, loading, error } = useDashboardMetrics();

  type CsvRow = {
    section: string;
    name: string;
    value: string | number;
    value_2?: string | number;
    value_3?: string | number;
  };

  const csvHeaders = ['section', 'name', 'value', 'value_2', 'value_3'];

  const toCsv = (rows: CsvRow[]) => {
    const escapeCell = (value: string | number | undefined) => {
      const text = value === undefined || value === null ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    return [
      csvHeaders.join(','),
      ...rows.map(row => csvHeaders.map(header => escapeCell(row[header as keyof CsvRow])).join(','))
    ].join('\n');
  };

  const downloadCsv = (filename: string, rows: CsvRow[]) => {
    if (rows.length === 0) {
      return;
    }

    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const buildRowsFromMetrics = (data: NonNullable<typeof metrics>): CsvRow[] => {
    const rows: CsvRow[] = [
      { section: 'kpi', name: 'total_leads', value: data.totalLeads },
      { section: 'kpi', name: 'leads_novo_mes', value: data.leadsNovoMes },
      { section: 'kpi', name: 'contratos', value: data.contratos },
      { section: 'kpi', name: 'contratos_assinados', value: data.contratosAssinados },
      { section: 'kpi', name: 'agendamentos', value: data.agendamentos },
      { section: 'kpi', name: 'agendamentos_hoje', value: data.agendamentosHoje },
      { section: 'kpi', name: 'agentes_ativos', value: data.agentesAtivos },
      { section: 'kpi', name: 'execucoes_agentes_hoje', value: data.execucoesAgentesHoje }
    ];

    Object.entries(data.leadsPorStatus).forEach(([status, count]) => {
      rows.push({ section: 'status', name: status, value: count });
    });

    data.leadsPorArea.forEach(area => {
      rows.push({ section: 'area', name: area.area, value: area.total });
    });

    data.execucoesRecentesAgentes.forEach(agente => {
      rows.push({
        section: 'agente',
        name: agente.agente_nome,
        value: agente.total_execucoes,
        value_2: agente.sucesso,
        value_3: agente.erro
      });
    });

    return rows;
  };

  const handleExportRelatorios = () => {
    if (!metrics) {
      return;
    }

    const rows = buildRowsFromMetrics(metrics);
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`relatorios-${dateStamp}.csv`, rows);
  };

  const handleExportDemo = () => {
    const demoRows: CsvRow[] = [
      { section: 'kpi', name: 'total_leads', value: 120 },
      { section: 'kpi', name: 'leads_novo_mes', value: 18 },
      { section: 'kpi', name: 'contratos', value: 42 },
      { section: 'kpi', name: 'contratos_assinados', value: 28 },
      { section: 'kpi', name: 'agendamentos', value: 16 },
      { section: 'kpi', name: 'agendamentos_hoje', value: 5 },
      { section: 'kpi', name: 'agentes_ativos', value: 4 },
      { section: 'kpi', name: 'execucoes_agentes_hoje', value: 31 },
      { section: 'status', name: 'novo', value: 35 },
      { section: 'status', name: 'em_qualificacao', value: 40 },
      { section: 'status', name: 'proposta_enviada', value: 25 },
      { section: 'status', name: 'contrato_assinado', value: 20 },
      { section: 'area', name: 'Trabalhista', value: 30 },
      { section: 'area', name: 'Cível', value: 28 },
      { section: 'area', name: 'Tributário', value: 22 },
      { section: 'area', name: 'Família', value: 18 },
      { section: 'agente', name: 'Triagem', value: 45, value_2: 40, value_3: 5 },
      { section: 'agente', name: 'Follow-up', value: 30, value_2: 27, value_3: 3 }
    ];

    downloadCsv('relatorios-demo.csv', demoRows);
  };

  const COLORS = ['#2563eb', '#059669', '#d97706', '#e11d48', '#4f46e5', '#0891b2'];

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
        <div className="flex-1 p-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground leading-tight">Relatorios Gerenciais</h1>
                <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                  Analises e insights do seu escritorio juridico
                </p>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <Card className="shadow-sm border-border/60 border-blue-500/25 bg-blue-500/5">
            <CardContent className="p-8">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-foreground mb-1">Relatorios em preparacao</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Os relatorios serao gerados assim que houver dados suficientes no sistema.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleExportDemo}
                >
                  <Download className="h-3.5 w-3.5" />
                  Gerar Relatorio Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Preparar dados para os graficos
  const statusData = Object.entries(metrics.leadsPorStatus).map(([status, count]) => ({
    name: status.replace('_', ' ').toUpperCase(),
    value: count
  }));

  const areaData = metrics.leadsPorArea.slice(0, 6).map(item => ({
    name: item.area,
    leads: item.total
  }));

  const agentesData = metrics.execucoesRecentesAgentes.map(agente => ({
    name: agente.agente_nome,
    execucoes: agente.total_execucoes,
    sucesso: agente.sucesso,
    erro: agente.erro
  }));

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* Header */}
      <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">Relatorios Gerenciais</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {metrics.totalLeads} leads · {metrics.contratos} contratos · {metrics.agentesAtivos} agentes IA
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleExportRelatorios}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Total Leads */}
          <Card className="shadow-sm border-border/60">
            <CardContent className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Total de Leads</p>
                  <p className="text-2xl font-bold tabular-nums mt-0.5">{metrics.totalLeads}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">+{metrics.leadsNovoMes} este mes</p>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,99,235,0.08)' }}>
                  <Users className="h-4 w-4" style={{ color: '#2563eb' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contratos */}
          <Card className="shadow-sm border-border/60">
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

          {/* Agendamentos */}
          <Card className="shadow-sm border-border/60">
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

          {/* Agentes IA */}
          <Card className="shadow-sm border-border/60">
            <CardContent className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Agentes IA</p>
                  <p className="text-2xl font-bold tabular-nums mt-0.5">{metrics.agentesAtivos}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">{metrics.execucoesAgentesHoje} execucoes hoje</p>
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

          {/* Pipeline de Leads */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="px-4 py-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground">Pipeline de Leads</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Leads por Area Juridica */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="px-4 py-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground">Leads por Area Juridica</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance dos Agentes IA */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="px-4 py-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground">Performance dos Agentes IA</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={agentesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="sucesso" stackId="a" fill="#059669" name="Sucesso" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="erro" stackId="a" fill="#e11d48" name="Erro" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Resumo do Periodo */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="px-4 py-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground">Resumo do Periodo</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2.5 bg-blue-500/8 border border-blue-500/20 rounded-lg">
                  <span className="text-xs font-medium text-foreground">Taxa de Conversao</span>
                  <Badge variant="secondary" className="text-xs">
                    {metrics.totalLeads > 0
                      ? `${((metrics.contratosAssinados / metrics.totalLeads) * 100).toFixed(1)}%`
                      : '0%'
                    }
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
                  <span className="text-xs font-medium text-foreground">Execucoes de IA</span>
                  <Badge variant="secondary" className="text-xs">
                    {metrics.execucoesRecentesAgentes.reduce((acc, curr) => acc + curr.total_execucoes, 0)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default RelatoriosGerenciais;

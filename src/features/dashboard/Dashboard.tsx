
import { useState, useEffect, lazy, Suspense } from 'react';
import { Users, FileText, Calendar, Bot, TrendingUp, Clock, CheckCircle, AlertTriangle, Sparkles, ArrowUpRight, BarChart3, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useToast } from '@/hooks/use-toast';
const ConversionFunnel = lazy(() => import('@/components/analytics/ConversionFunnel').then(m => ({ default: m.ConversionFunnel })));
const RevenueCard = lazy(() => import('@/components/analytics/RevenueCard').then(m => ({ default: m.RevenueCard })));
const ResponseTimeChart = lazy(() => import('@/components/analytics/ResponseTimeChart').then(m => ({ default: m.ResponseTimeChart })));
import { useSearchParams } from 'react-router-dom';

const Dashboard = () => {
  const { metrics, loading, error, refetch, isEmpty } = useDashboardMetrics();
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      toast({
        title: 'Pagamento realizado com sucesso!',
        description: 'Seu plano foi ativado. Aproveite todos os recursos premium do Jurify.',
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const handleGenerateTestData = async () => {
    try {
      setIsSeeding(true);
      toast({
        title: 'Gerando dados de teste...',
        description: 'Isso pode levar alguns segundos.',
      });

      const { seedDatabase } = await import('@/scripts/seed-database');
      await seedDatabase();

      toast({
        title: 'Dados gerados com sucesso!',
        description: 'O dashboard será atualizado automaticamente.',
      });

      // Aguardar 1 segundo e recarregar
      setTimeout(() => {
        refetch();
      }, 1000);

    } catch (error: unknown) {
      console.error('Erro ao gerar dados:', error);
      const errorMessage = error instanceof Error ? error.message : 'Tente novamente.';
      toast({
        title: 'Erro ao gerar dados',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="flex-1 px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1, 2].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-sm font-bold text-foreground">Dashboard</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Erro ao carregar dashboard</h3>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <Button size="sm" onClick={() => void refetch()} className="h-8 text-xs gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col h-screen">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-sm font-bold text-foreground">Dashboard</h1>
        </div>
      <div className="flex-1 flex flex-col justify-center items-center animate-fade-in">
        <Card className="border-border bg-card shadow-sm max-w-xl w-full">
          {/* Blue top accent line */}
          <div className="h-1 w-full bg-primary rounded-t-lg" />

          <CardContent className="p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>

            <h3 className="text-2xl font-semibold text-foreground mb-2">
              Bem-vindo ao Jurify
            </h3>

            <p className="text-muted-foreground text-base mb-8 max-w-sm leading-relaxed">
              Seu ambiente está pronto. Gere dados de demonstração para explorar todo o potencial da plataforma.
            </p>

            <Button
              onClick={() => void handleGenerateTestData()}
              disabled={isSeeding}
              size="lg"
              className="gap-2 w-full sm:w-auto"
            >
              {isSeeding ? (
                <>
                  <Activity className="h-4 w-4 animate-spin" />
                  Configurando ambiente...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Dados de Demonstração
                </>
              )}
            </Button>

            {!isSeeding && (
              <p className="mt-4 text-xs text-muted-foreground">
                Setup automático de perfil e dados
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── Header ── */}
      <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background fade-in">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">Dashboard</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                Métricas em tempo real do seu escritório
              </p>
            </div>
          </div>
          <Button
            onClick={() => void refetch()}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            aria-label="Atualizar métricas do dashboard"
          >
            <Activity className="h-3.5 w-3.5" strokeWidth={2} />
            Atualizar
          </Button>
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-6 space-y-6">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Leads */}
        <Card className="fade-in border-border bg-card shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total de Leads
            </CardTitle>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-bold text-foreground tabular-nums mb-2">
              {metrics.totalLeads}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +{metrics.leadsNovoMes}
              </Badge>
              <span className="text-xs text-muted-foreground">este mês</span>
            </div>
          </CardContent>
        </Card>

        {/* Contratos */}
        <Card className="fade-in border-border bg-card shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.15s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contratos
            </CardTitle>
            <div className="p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
              <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-bold text-foreground tabular-nums mb-2">
              {metrics.contratos}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {metrics.contratosAssinados}
              </Badge>
              <span className="text-xs text-muted-foreground">assinados</span>
            </div>
          </CardContent>
        </Card>

        {/* Agendamentos */}
        <Card className="fade-in border-border bg-card shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Agendamentos
            </CardTitle>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-bold text-foreground tabular-nums mb-2">
              {metrics.agendamentos}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="gap-1">
                <Clock className="h-3 w-3" />
                {metrics.agendamentosHoje}
              </Badge>
              <span className="text-xs text-muted-foreground">hoje</span>
            </div>
          </CardContent>
        </Card>

        {/* Agentes IA */}
        <Card className="fade-in border-border bg-card shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.25s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Agentes IA
            </CardTitle>
            <div className="p-2.5 bg-primary/8 dark:bg-primary/20 rounded-lg">
              <Bot className="h-5 w-5 text-primary" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-bold text-foreground tabular-nums mb-2">
              {metrics.agentesAtivos}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {metrics.execucoesAgentesHoje}
              </Badge>
              <span className="text-xs text-muted-foreground">execuções hoje</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Pipeline + Áreas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border bg-card shadow-sm fade-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/8 dark:bg-primary/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold" style={{}}>
                  Pipeline de Leads
                </CardTitle>
                <CardDescription>Distribuição por status no funil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {Object.entries(metrics.leadsPorStatus).map(([status, count]) => {
              const statusLabels: Record<string, string> = {
                novo_lead: 'Novos Leads',
                em_qualificacao: 'Em Qualificação',
                proposta_enviada: 'Proposta Enviada',
                contrato_assinado: 'Contrato Assinado',
                em_atendimento: 'Em Atendimento',
                lead_perdido: 'Leads Perdidos'
              };

              const statusColors: Record<string, string> = {
                novo_lead: 'from-blue-500 to-blue-600',
                em_qualificacao: 'from-yellow-500 to-yellow-600',
                proposta_enviada: 'from-purple-500 to-purple-600',
                contrato_assinado: 'from-green-500 to-green-600',
                em_atendimento: 'from-teal-500 to-teal-600',
                lead_perdido: 'from-red-500 to-red-600'
              };

              const percentage = metrics.totalLeads > 0 ? (count / metrics.totalLeads) * 100 : 0;

              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">{statusLabels[status]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-foreground">{count}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${statusColors[status]} rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm fade-in" style={{ animationDelay: '0.35s' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={2} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold" style={{}}>
                  Áreas Jurídicas
                </CardTitle>
                <CardDescription>Leads por especialização</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.leadsPorArea.slice(0, 5).map((area, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">
                  {area.area}
                </span>
                <Badge variant="info">
                  {area.total}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 📊 PREMIUM ANALYTICS SECTION */}
      <Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Skeleton className="h-64 lg:col-span-2" /><Skeleton className="h-64" /></div>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in" style={{ animationDelay: '0.65s' }}>
          {/* Conversion Funnel */}
          <div className="lg:col-span-2">
            <ConversionFunnel data={metrics.leadsPorStatus} />
          </div>

          {/* Revenue Card */}
          <div>
            <RevenueCard
              currentMRR={metrics.contratosAssinados * 997}
              previousMRR={(metrics.contratosAssinados - 2) * 997}
              contractsThisMonth={metrics.contratosAssinados}
              avgTicket={997}
              targetMRR={50000}
            />
          </div>
        </div>

        {/* Response Time Chart */}
        <div className="fade-in" style={{ animationDelay: '0.7s' }}>
          <ResponseTimeChart
            data={[
              { time: '08:00', avgTime: 1.8, p95Time: 3.2 },
              { time: '09:00', avgTime: 2.1, p95Time: 3.8 },
              { time: '10:00', avgTime: 1.5, p95Time: 2.9 },
              { time: '11:00', avgTime: 2.4, p95Time: 4.1 },
              { time: '12:00', avgTime: 1.9, p95Time: 3.5 },
              { time: '13:00', avgTime: 2.0, p95Time: 3.3 },
              { time: '14:00', avgTime: 1.7, p95Time: 2.8 },
              { time: '15:00', avgTime: 2.2, p95Time: 3.9 },
              { time: '16:00', avgTime: 1.6, p95Time: 3.0 },
              { time: '17:00', avgTime: 2.3, p95Time: 4.0 },
            ]}
            targetResponseTime={3}
          />
        </div>
      </Suspense>

      {/* ── Performance dos Agentes ── */}
      <Card className="border-border bg-card shadow-sm fade-in" style={{ animationDelay: '0.4s' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/8 dark:bg-primary/20 rounded-lg">
              <Bot className="h-4 w-4 text-primary" strokeWidth={2} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold" style={{}}>
                Performance dos Agentes IA
              </CardTitle>
              <CardDescription>Execuções recentes e taxa de sucesso</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.execucoesRecentesAgentes.map((agente, index) => {
              const successRate = agente.total_execucoes > 0
                ? (agente.sucesso / agente.total_execucoes) * 100
                : 0;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-primary/8 dark:bg-primary/20 rounded-md flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {agente.agente_nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {agente.total_execucoes} execuções • {successRate.toFixed(0)}% sucesso
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {agente.sucesso}
                    </Badge>
                    {agente.erro > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {agente.erro}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;



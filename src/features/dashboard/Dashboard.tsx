
import React, { useState, useEffect } from 'react';
import { Users, FileText, Calendar, Bot, TrendingUp, Clock, CheckCircle, AlertTriangle, Sparkles, ArrowUpRight, BarChart3, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { seedDatabase } from '@/scripts/seed-database';
import { useToast } from '@/hooks/use-toast';
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel';
import { RevenueCard } from '@/components/analytics/RevenueCard';
import { ResponseTimeChart } from '@/components/analytics/ResponseTimeChart';
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
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar dashboard</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <Button
                onClick={() => void refetch()}
                className="bg-red-600 hover:bg-red-700"
              >
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-6 h-full flex flex-col justify-center items-center animate-fade-in">
        <Card className="border-[hsl(var(--accent)_/_0.3)] bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--muted)_/_0.3)] shadow-2xl max-w-2xl w-full overflow-hidden relative">
          {/* Gold Glow */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[hsl(var(--accent)_/_0)] via-[hsl(var(--accent))] to-[hsl(var(--accent)_/_0)] opacity-70" />

          <CardContent className="p-10 flex flex-col items-center text-center relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--accent)_/_0.1)] flex items-center justify-center mb-6 ring-1 ring-[hsl(var(--accent))]/20 shadow-lg">
              <Sparkles className="h-10 w-10 text-[hsl(var(--accent))]" />
            </div>

            <h3 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Bem-vindo ao Jurify
            </h3>

            <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8 max-w-md leading-relaxed">
              Seu ambiente está pronto. Gere dados de demonstração para visualizar o potencial da plataforma com o design <span className="font-serif italic text-[hsl(var(--accent))]">Conservative Luxury</span>.
            </p>

            <div className="flex gap-4 w-full sm:w-auto">
              <Button
                onClick={() => void handleGenerateTestData()}
                disabled={isSeeding}
                className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))] font-bold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto text-base"
              >
                {isSeeding ? (
                  <>
                    <Activity className="h-5 w-5 mr-3 animate-spin" />
                    Configurando Ambiente...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-3" />
                    Gerar Dados de Demonstração
                  </>
                )}
              </Button>
            </div>

            {!isSeeding && (
              <p className="mt-6 text-xs text-[hsl(var(--muted-foreground))] font-mono uppercase tracking-widest opacity-60">
                Setup Automático de Perfil & Dados
              </p>
            )}
          </CardContent>

          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Ultra-Premium Header */}
      <div className="flex justify-between items-start fade-in">
        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <h1 className="text-6xl font-bold text-[hsl(var(--foreground))] tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '-0.03em' }}>
              Dashboard
            </h1>
            <div className="px-4 py-2 bg-gradient-to-r from-[hsl(var(--accent)_/_0.15)] to-[hsl(var(--accent)_/_0.08)] rounded-full border border-[hsl(var(--accent)_/_0.3)]">
              <span className="text-xs font-bold text-[hsl(var(--accent))] uppercase tracking-wider">Live</span>
            </div>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] text-base font-medium">
            Metricas em tempo real do seu escritorio juridico
          </p>
        </div>

        {/* Premium Refresh Button */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent)_/_0.5)] rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
          <Button
            onClick={() => void refetch()}
            variant="outline"
            className="relative border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] hover:border-[hsl(var(--accent))] transition-all duration-300 px-6 py-3 rounded-2xl shadow-lg group-hover:shadow-2xl"
            aria-label="Atualizar métricas do dashboard"
          >
            <Activity className="h-4 w-4 mr-2.5 group-hover:rotate-180 transition-transform duration-700" strokeWidth={2.5} />
            <span className="font-semibold">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Ultra-Premium Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Leads Card */}
        <div className="relative group fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <Card className="relative card-hover border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-2xl rounded-3xl overflow-hidden">
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6">
              <CardTitle className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Total de Leads
              </CardTitle>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl blur-md opacity-40" />
                <div className="relative p-3.5 bg-gradient-to-br from-blue-500/20 to-blue-600/15 rounded-2xl">
                  <Users className="h-6 w-6 text-blue-300" strokeWidth={2.5} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-5xl font-bold text-[hsl(var(--foreground))] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {metrics.totalLeads}
              </div>
              <div className="flex items-center space-x-2.5">
                <Badge className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-200 border border-emerald-400/30 font-bold px-3 py-1.5 shadow-lg">
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1" strokeWidth={3} />
                  +{metrics.leadsNovoMes}
                </Badge>
                <span className="text-sm text-[hsl(var(--muted-foreground))] font-medium">este mes</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contratos Card */}
        <div className="relative group fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <Card className="relative card-hover border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-2xl rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6">
              <CardTitle className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Contratos
              </CardTitle>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl blur-md opacity-40" />
                <div className="relative p-3.5 bg-gradient-to-br from-purple-500/20 to-purple-600/15 rounded-2xl">
                  <FileText className="h-6 w-6 text-purple-300" strokeWidth={2.5} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-5xl font-bold text-[hsl(var(--foreground))] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {metrics.contratos}
              </div>
              <div className="flex items-center space-x-2.5">
                <Badge className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-200 border border-purple-400/30 font-bold px-3 py-1.5 shadow-lg">
                  <CheckCircle className="h-3.5 w-3.5 mr-1" strokeWidth={3} />
                  {metrics.contratosAssinados}
                </Badge>
                <span className="text-sm text-[hsl(var(--muted-foreground))] font-medium">assinados</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agendamentos Card */}
        <div className="relative group fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="absolute -inset-1 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <Card className="relative card-hover border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-2xl rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6">
              <CardTitle className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Agendamentos
              </CardTitle>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl blur-md opacity-40" />
                <div className="relative p-3.5 bg-gradient-to-br from-orange-500/20 to-orange-600/15 rounded-2xl">
                  <Calendar className="h-6 w-6 text-orange-300" strokeWidth={2.5} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-5xl font-bold text-[hsl(var(--foreground))] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {metrics.agendamentos}
              </div>
              <div className="flex items-center space-x-2.5">
                <Badge className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-200 border border-orange-400/30 font-bold px-3 py-1.5 shadow-lg">
                  <Clock className="h-3.5 w-3.5 mr-1" strokeWidth={3} />
                  {metrics.agendamentosHoje}
                </Badge>
                <span className="text-sm text-[hsl(var(--muted-foreground))] font-medium">hoje</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agentes IA Card - Premium Gold */}
        <div className="relative group fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="absolute -inset-1 bg-gradient-to-br from-[hsl(var(--accent)_/_0.3)] to-[hsl(var(--accent)_/_0.15)] rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <Card className="relative card-hover border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-2xl rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6">
              <CardTitle className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Agentes IA
              </CardTitle>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(43_74%_49%)] rounded-2xl blur-md opacity-50" />
                <div className="relative p-3.5 bg-gradient-to-br from-[hsl(var(--accent)_/_0.2)] to-[hsl(var(--accent)_/_0.1)] rounded-2xl">
                  <Bot className="h-6 w-6 text-[hsl(var(--accent))]" strokeWidth={2.5} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-5xl font-bold text-[hsl(var(--foreground))] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {metrics.agentesAtivos}
              </div>
              <div className="flex items-center space-x-2.5">
                <Badge className="bg-gradient-to-r from-[hsl(var(--accent)_/_0.2)] to-[hsl(43_74%_49%_/_0.2)] text-[hsl(var(--accent))] border border-[hsl(var(--accent)_/_0.35)] border-0 font-bold px-3 py-1.5 shadow-lg">
                  <Sparkles className="h-3.5 w-3.5 mr-1" strokeWidth={3} />
                  {metrics.execucoesAgentesHoje}
                </Badge>
                <span className="text-sm text-[hsl(var(--muted-foreground))] font-medium">execuções hoje</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leads por Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-premium fade-in" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-[hsl(var(--primary)_/_0.1)] to-[hsl(var(--primary)_/_0.05)] rounded-lg">
                <TrendingUp className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Pipeline de Leads
                </CardTitle>
                <CardDescription className="text-sm text-[hsl(var(--muted-foreground))]">Distribuição por status no funil</CardDescription>
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
                <div key={status} className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{statusLabels[status]}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))]">{count}</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="relative h-3 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
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

        <Card className="border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-premium fade-in" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-[hsl(var(--accent)_/_0.15)] to-[hsl(var(--accent)_/_0.05)] rounded-lg">
                <BarChart3 className="h-5 w-5 text-[hsl(var(--accent))]" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Áreas Jurídicas
                </CardTitle>
                <CardDescription className="text-sm text-[hsl(var(--muted-foreground))]">Leads por especialização</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.leadsPorArea.slice(0, 5).map((area, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 rounded-xl bg-[hsl(var(--muted)_/_0.3)] hover:bg-[hsl(var(--muted)_/_0.5)] transition-all duration-300 group"
              >
                <span className="text-sm font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent))] transition-colors">
                  {area.area}
                </span>
                <Badge className="bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(38_92%_42%)] text-[hsl(var(--primary))] border-0 font-bold px-3 py-1">
                  {area.total}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 📊 PREMIUM ANALYTICS SECTION */}
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

      {/* Performance dos Agentes */}
      <Card className="border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-premium fade-in" style={{ animationDelay: '0.7s' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-[hsl(var(--accent)_/_0.15)] to-[hsl(var(--accent)_/_0.05)] rounded-lg">
                <Bot className="h-6 w-6 text-[hsl(var(--accent))]" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Performance dos Agentes IA
                </CardTitle>
                <CardDescription className="text-sm mt-1 text-[hsl(var(--muted-foreground))]">Execuções recentes e taxa de sucesso</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.execucoesRecentesAgentes.map((agente, index) => {
              const successRate = agente.total_execucoes > 0
                ? (agente.sucesso / agente.total_execucoes) * 100
                : 0;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[hsl(var(--muted)_/_0.3)] to-[hsl(var(--muted)_/_0.1)] hover:from-[hsl(var(--muted)_/_0.5)] hover:to-[hsl(var(--muted)_/_0.2)] transition-all duration-300 border border-[hsl(var(--border))] group"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="p-3 bg-gradient-to-br from-[hsl(var(--accent)_/_0.2)] to-[hsl(var(--accent)_/_0.1)] rounded-xl">
                      <Sparkles className="h-5 w-5 text-[hsl(var(--accent))]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent))] transition-colors">
                        {agente.agente_nome}
                      </p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">
                        {agente.total_execucoes} execuções • {successRate.toFixed(0)}% sucesso
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 font-bold px-3 py-1.5">
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      {agente.sucesso}
                    </Badge>
                    {agente.erro > 0 && (
                      <Badge variant="destructive" className="font-bold px-3 py-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
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
  );
};

export default Dashboard;



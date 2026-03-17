
import { useState, useEffect, useMemo } from 'react';
import { Users, FileText, Calendar, Bot, TrendingUp, Clock, CheckCircle, AlertTriangle, Sparkles, ArrowUpRight, BarChart3, Activity, CalendarCheck, CalendarDays, UserCheck, Hourglass, Plus, MessageSquare, Bell, ExternalLink, UserX, FileSignature } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDashboardMetricsFast } from '@/hooks/useDashboardMetricsFast';
import { useToast } from '@/hooks/use-toast';
import { useAgendaMetrics } from '@/hooks/useAgendaMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabaseUntyped } from '@/integrations/supabase/client';
import { formatDistanceToNow, format, startOfDay, endOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createLogger } from '@/lib/logger';
import { usePageTitle } from '@/hooks/usePageTitle';
import PrazosUrgentesWidget from '@/features/dashboard/components/PrazosUrgentesWidget';
import { formatarAreaJuridica } from '@/utils/formatting';

const log = createLogger('Dashboard');

const Dashboard = () => {
  usePageTitle('Dashboard');
  const { metrics, loading, error, refetch, isEmpty, isViewFallback, isLive } = useDashboardMetricsFast();
  const { data: agendaMetrics, isLoading: agendaLoading } = useAgendaMetrics();
  const { profile } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    const planId = searchParams.get('plan');
    if (checkoutStatus === 'success') {
      const planName = planId === 'pro' ? 'Profissional' : planId === 'enterprise' ? 'Enterprise' : 'premium';
      toast({
        title: 'Pagamento confirmado!',
        description: `Plano ${planName} ativado. Aproveite todos os recursos do Jurify.`,
      });
      setSearchParams({}, { replace: true });
    } else if (checkoutStatus === 'cancel') {
      toast({
        title: 'Pagamento cancelado',
        description: 'O pagamento foi cancelado. Você pode tentar novamente quando quiser.',
        variant: 'destructive',
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  // ── New queries for activity & alerts sections ──
  const tenantId = profile?.tenant_id;

  const { data: recentLeads = [] } = useQuery({
    queryKey: ['dashboard-recent-leads', tenantId],
    queryFn: async () => {
      const { data } = await supabaseUntyped
        .from('leads')
        .select('id, nome, nome_completo, origem, status, created_at')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []) as Array<{
        id: string;
        nome: string | null;
        nome_completo: string | null;
        origem: string | null;
        status: string | null;
        created_at: string;
      }>;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const { data: upcomingAgendamentos = [] } = useQuery({
    queryKey: ['dashboard-upcoming-agendamentos', tenantId],
    queryFn: async () => {
      const now = new Date();
      const weekEnd = addDays(now, 7);
      const { data } = await supabaseUntyped
        .from('agendamentos')
        .select('id, data_hora, area_juridica, responsavel, status')
        .eq('tenant_id', tenantId!)
        .gte('data_hora', now.toISOString())
        .lte('data_hora', weekEnd.toISOString())
        .order('data_hora', { ascending: true })
        .limit(3);
      return (data ?? []) as Array<{
        id: string;
        data_hora: string;
        area_juridica: string | null;
        responsavel: string | null;
        status: string | null;
      }>;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const { data: staleLeads = [] } = useQuery({
    queryKey: ['dashboard-stale-leads', tenantId],
    queryFn: async () => {
      const threshold = addDays(new Date(), -7).toISOString();
      const { data } = await supabaseUntyped
        .from('leads')
        .select('id, nome, nome_completo, last_activity_at, created_at')
        .eq('tenant_id', tenantId!)
        .in('status', ['novo_lead', 'em_qualificacao'])
        .or(`last_activity_at.lt.${threshold},last_activity_at.is.null`)
        .order('last_activity_at', { ascending: true, nullsFirst: true })
        .limit(5);
      return (data ?? []) as Array<{
        id: string;
        nome: string | null;
        nome_completo: string | null;
        last_activity_at: string | null;
        created_at: string;
      }>;
    },
    enabled: !!tenantId,
    staleTime: 120_000,
  });

  const { data: pendingContratos = [] } = useQuery({
    queryKey: ['dashboard-pending-contratos', tenantId],
    queryFn: async () => {
      const { data } = await supabaseUntyped
        .from('contratos')
        .select('id, titulo, status, created_at')
        .eq('tenant_id', tenantId!)
        .in('status', ['pendente', 'enviado'])
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []) as Array<{
        id: string;
        titulo: string | null;
        status: string | null;
        created_at: string;
      }>;
    },
    enabled: !!tenantId,
    staleTime: 120_000,
  });

  const { data: todayPrazos = [] } = useQuery({
    queryKey: ['dashboard-today-prazos', tenantId],
    queryFn: async () => {
      const now = new Date();
      const { data } = await supabaseUntyped
        .from('prazos_processuais')
        .select('id, descricao, tipo, data_prazo')
        .eq('tenant_id', tenantId!)
        .eq('status', 'pendente')
        .gte('data_prazo', startOfDay(now).toISOString())
        .lte('data_prazo', endOfDay(addDays(now, 1)).toISOString())
        .order('data_prazo', { ascending: true })
        .limit(5);
      return (data ?? []) as Array<{
        id: string;
        descricao: string;
        tipo: string;
        data_prazo: string;
      }>;
    },
    enabled: !!tenantId,
    staleTime: 120_000,
  });

  const totalAlerts = todayPrazos.length + staleLeads.length + pendingContratos.length;

  // Memoized derived data — avoid recomputing on every render
  const leadsPorStatusEntries = useMemo(() => Object.entries(metrics.leadsPorStatus), [metrics.leadsPorStatus]);
  const topAreas = useMemo(() => metrics.leadsPorArea.slice(0, 5), [metrics.leadsPorArea]);
  const topAgentes = useMemo(() => metrics.execucoesRecentesAgentes, [metrics.execucoesRecentesAgentes]);

  /* Seed data — dados de demonstração */
  const handleGenerateTestData = async () => {
    try {
      setIsSeeding(true);
      toast({ title: 'Carregando demonstração...', description: 'Criando dados de exemplo para o seu escritório.' });
      const { seedDatabase } = await import('@/scripts/seed-database');
      await seedDatabase();
      toast({ title: 'Pronto!', description: 'Dados de demonstração carregados. Explore o sistema à vontade.' });
      setTimeout(() => { void refetch(); }, 800);
    } catch (err: unknown) {
      log.error('Erro ao gerar dados', err);
      const msg = err instanceof Error ? err.message : 'Tente novamente.';
      toast({ title: 'Erro ao carregar demonstração', description: msg, variant: 'destructive' });
    } finally {
      setIsSeeding(false);
    }
  };

  /* ── Loading ── */
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

  /* ── Error ── */
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

  /* ── Empty state ── */
  if (isEmpty) {
    return (
      <div className="flex flex-col h-screen">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-sm font-bold text-foreground">Dashboard</h1>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-6 py-10 animate-fade-in">
          <div className="max-w-lg w-full space-y-4">

            {/* Card principal — começar do zero */}
            <Card className="border-border bg-card shadow-sm">
              <div className="h-1 w-full bg-primary rounded-t-lg" />
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <Sparkles className="h-7 w-7 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Bem-vindo ao Jurify</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
                  Seu escritório digital está pronto. Comece adicionando seus clientes ou configure o WhatsApp para receber consultas automaticamente.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                  <Button size="sm" className="gap-2" onClick={() => navigate('/pipeline')}>
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar primeiro cliente
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate('/whatsapp')}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    Configurar WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card secundário — explorar com demo */}
            <Card className="border-dashed border-border bg-muted/30">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Explorar com dados de demonstração</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cria clientes, processos, prazos e contratos de exemplo para você conhecer o sistema.
                  </p>
                </div>
                <Button
                  onClick={() => void handleGenerateTestData()}
                  disabled={isSeeding}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 gap-1.5 h-8 text-xs"
                >
                  {isSeeding ? (
                    <><Activity className="h-3 w-3 animate-spin" /> Carregando...</>
                  ) : (
                    <><Sparkles className="h-3 w-3" /> Carregar demo</>
                  )}
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    );
  }

  /* ── Dashboard principal ── */
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
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="outline" className="h-6 text-[10px] gap-1 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live
              </Badge>
            )}
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
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-6 space-y-6">

      {/* ── Fallback notice ── */}
      {isViewFallback && !loading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Os dados do dashboard estão sendo carregados. Se os números aparecerem zerados, aguarde alguns instantes e clique em <strong>Atualizar</strong>.</span>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        <Card className="fade-in border-border bg-card shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de Leads</CardTitle>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-bold text-foreground tabular-nums mb-2">{metrics.totalLeads}</div>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="gap-1"><ArrowUpRight className="h-3 w-3" />+{metrics.leadsNovoMes}</Badge>
              <span className="text-xs text-muted-foreground">este mês</span>
            </div>
          </CardContent>
        </Card>

        <Card className="fade-in border-border bg-card shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.15s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contratos</CardTitle>
            <div className="p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
              <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-bold text-foreground tabular-nums mb-2">{metrics.contratos}</div>
            <div className="flex items-center gap-2">
              <Badge variant="info" className="gap-1"><CheckCircle className="h-3 w-3" />{metrics.contratosAssinados}</Badge>
              <span className="text-xs text-muted-foreground">assinados</span>
            </div>
          </CardContent>
        </Card>

        <Card className="fade-in border-border bg-card shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agendamentos</CardTitle>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-bold text-foreground tabular-nums mb-2">{metrics.agendamentos}</div>
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />{metrics.agendamentosHoje}</Badge>
              <span className="text-xs text-muted-foreground">hoje</span>
            </div>
          </CardContent>
        </Card>

        <Card className="fade-in border-border bg-card shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.25s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agentes IA</CardTitle>
            <div className="p-2.5 bg-primary/8 dark:bg-primary/20 rounded-lg">
              <Bot className="h-5 w-5 text-primary" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-bold text-foreground tabular-nums mb-2">{metrics.agentesAtivos}</div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1"><Sparkles className="h-3 w-3" />{metrics.execucoesAgentesHoje}</Badge>
              <span className="text-xs text-muted-foreground">execuções hoje</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Plano + Agenda Intelligence ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 fade-in" style={{ animationDelay: '0.28s' }}>

        {/* Plano + Ações Rápidas */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano Atual</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            {profile?.subscription_tier === 'enterprise' ? (
              <Badge className="text-sm px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white">Enterprise</Badge>
            ) : profile?.subscription_tier === 'pro' ? (
              <Badge className="text-sm px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white">Pro</Badge>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Badge variant="outline" className="text-sm px-3 py-1 w-fit border-amber-400/60 text-amber-600 bg-amber-50 dark:bg-amber-900/20">Free</Badge>
                <p className="text-xs text-muted-foreground">Faça upgrade para desbloquear todos os recursos</p>
              </div>
            )}

            {/* Ações Rápidas */}
            <div className="pt-1 space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Ações rápidas</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs gap-1.5 justify-start"
                onClick={() => navigate('/pipeline')}
              >
                <TrendingUp className="h-3 w-3 text-primary flex-shrink-0" />
                Novo lead
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs gap-1.5 justify-start"
                onClick={() => navigate('/agendamentos')}
              >
                <Calendar className="h-3 w-3 text-amber-500 flex-shrink-0" />
                Agendar consulta
              </Button>
              {(!profile?.subscription_tier || profile.subscription_tier === 'free') ? (
                <Button
                  size="sm"
                  className="w-full h-7 text-xs gap-1.5 justify-start bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => navigate('/billing')}
                >
                  <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
                  Fazer upgrade
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs gap-1.5 justify-start"
                  onClick={() => navigate('/relatorios')}
                >
                  <BarChart3 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  Ver relatórios
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agenda Intelligence 2×2 */}
        <Card className="border-border bg-card shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inteligência de Agenda</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md flex-shrink-0">
                  <CalendarCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none mb-1">Hoje</p>
                  {agendaLoading ? <Skeleton className="h-5 w-6" /> : <p className="text-xl font-bold tabular-nums leading-none">{agendaMetrics.hoje}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-md flex-shrink-0">
                  <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-400" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none mb-1">Esta semana</p>
                  {agendaLoading ? <Skeleton className="h-5 w-6" /> : <p className="text-xl font-bold tabular-nums leading-none">{agendaMetrics.semana}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-md flex-shrink-0">
                  <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none mb-1">Comparecimento</p>
                  {agendaLoading ? <Skeleton className="h-5 w-10" /> : <p className="text-xl font-bold tabular-nums leading-none">{agendaMetrics.taxaComparecimento}%</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md flex-shrink-0">
                  <Hourglass className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none mb-1">Horários pico</p>
                  {agendaLoading
                    ? <Skeleton className="h-5 w-20" />
                    : <p className="text-sm font-semibold leading-none truncate">
                        {agendaMetrics.horariosPico.length > 0 ? agendaMetrics.horariosPico.join(' · ') : '—'}
                      </p>
                  }
                </div>
              </div>
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
                <CardTitle className="text-base font-semibold">Pipeline de Leads</CardTitle>
                <CardDescription>Distribuição por status no funil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {leadsPorStatusEntries.map(([status, count]) => {
              const statusLabels: Record<string, string> = {
                novo_lead: 'Novos Leads', em_qualificacao: 'Em Qualificação',
                proposta_enviada: 'Proposta Enviada', contrato_assinado: 'Contrato Assinado',
                em_atendimento: 'Em Atendimento', lead_perdido: 'Leads Perdidos',
              };
              const statusColors: Record<string, string> = {
                novo_lead: 'from-blue-500 to-blue-600', em_qualificacao: 'from-yellow-500 to-yellow-600',
                proposta_enviada: 'from-purple-500 to-purple-600', contrato_assinado: 'from-green-500 to-green-600',
                em_atendimento: 'from-teal-500 to-teal-600', lead_perdido: 'from-red-500 to-red-600',
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
                <CardTitle className="text-base font-semibold">Áreas Jurídicas</CardTitle>
                <CardDescription>Leads por especialização</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {topAreas.map((area) => (
              <div key={area.area} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                <span className="text-sm font-medium text-foreground">{formatarAreaJuridica(area.area)}</span>
                <Badge variant="info">{area.total}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Atividade Recente (2 columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 fade-in" style={{ animationDelay: '0.33s' }}>

        {/* Últimos Leads */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold">Últimos Leads</CardTitle>
                <CardDescription>Leads mais recentes do escritório</CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/pipeline')}
              >
                Ver todos <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentLeads.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead cadastrado ainda</p>
            ) : (
              recentLeads.map((lead) => {
                const statusLabels: Record<string, string> = {
                  novo_lead: 'Novo', em_qualificacao: 'Qualificação',
                  proposta_enviada: 'Proposta', contrato_assinado: 'Assinado',
                  em_atendimento: 'Atendimento', lead_perdido: 'Perdido',
                };
                const statusColors: Record<string, string> = {
                  novo_lead: 'bg-blue-500/15 text-blue-600',
                  em_qualificacao: 'bg-yellow-500/15 text-yellow-600',
                  proposta_enviada: 'bg-purple-500/15 text-purple-600',
                  contrato_assinado: 'bg-green-500/15 text-green-600',
                  em_atendimento: 'bg-teal-500/15 text-teal-600',
                  lead_perdido: 'bg-red-500/15 text-red-600',
                };
                const displayName = lead.nome_completo || lead.nome || 'Sem nome';
                return (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer"
                    onClick={() => navigate(`/crm/lead/${lead.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/crm/lead/${lead.id}`); }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.origem ?? 'Sem origem'} · {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <Badge className={statusColors[lead.status ?? ''] ?? 'bg-muted text-muted-foreground'}>
                      {statusLabels[lead.status ?? ''] ?? lead.status ?? '—'}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Próximos Agendamentos */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <CalendarCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold">Próximos Agendamentos</CardTitle>
                <CardDescription>Eventos desta semana</CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/agendamentos')}
              >
                Ver todos <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {upcomingAgendamentos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum agendamento previsto para os próximos dias</p>
            ) : (
              upcomingAgendamentos.map((ag) => {
                const agDate = new Date(ag.data_hora);
                const isToday = startOfDay(agDate).getTime() === startOfDay(new Date()).getTime();
                return (
                  <div
                    key={ag.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer"
                    onClick={() => navigate('/agendamentos')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate('/agendamentos'); }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {formatarAreaJuridica(ag.area_juridica ?? 'consulta_geral')}
                        {ag.responsavel ? ` — ${ag.responsavel}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(agDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
                        {' · '}
                        {formatDistanceToNow(agDate, { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {isToday && (
                      <Badge className="bg-amber-500/15 text-amber-600">Hoje</Badge>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Mini Pipeline Visual ── */}
      <Card className="border-border bg-card shadow-sm fade-in" style={{ animationDelay: '0.36s' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/8 dark:bg-primary/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold">Funil de Conversão</CardTitle>
              <CardDescription>Distribuição visual dos leads no pipeline</CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/pipeline')}
            >
              Abrir pipeline <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {metrics.totalLeads === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead no pipeline ainda</p>
          ) : (
            <>
              {/* Compact funnel bar */}
              <div
                className="flex h-8 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => navigate('/pipeline')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/pipeline'); }}
              >
                {(() => {
                  const stages = [
                    { key: 'novo_lead', label: 'Novos', color: 'bg-blue-500' },
                    { key: 'em_qualificacao', label: 'Qualificação', color: 'bg-yellow-500' },
                    { key: 'proposta_enviada', label: 'Proposta', color: 'bg-purple-500' },
                    { key: 'contrato_assinado', label: 'Assinado', color: 'bg-green-500' },
                    { key: 'em_atendimento', label: 'Atendimento', color: 'bg-teal-500' },
                    { key: 'lead_perdido', label: 'Perdido', color: 'bg-red-500' },
                  ];
                  return stages
                    .filter((s) => (metrics.leadsPorStatus[s.key as keyof typeof metrics.leadsPorStatus] ?? 0) > 0)
                    .map((s) => {
                      const count = metrics.leadsPorStatus[s.key as keyof typeof metrics.leadsPorStatus] ?? 0;
                      const pct = (count / metrics.totalLeads) * 100;
                      return (
                        <div
                          key={s.key}
                          className={`${s.color} flex items-center justify-center min-w-[2rem] transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                          title={`${s.label}: ${count} (${pct.toFixed(0)}%)`}
                        >
                          {pct >= 10 && (
                            <span className="text-[10px] font-semibold text-white truncate px-1">
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    });
                })()}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {[
                  { key: 'novo_lead', label: 'Novos', color: 'bg-blue-500' },
                  { key: 'em_qualificacao', label: 'Qualificação', color: 'bg-yellow-500' },
                  { key: 'proposta_enviada', label: 'Proposta', color: 'bg-purple-500' },
                  { key: 'contrato_assinado', label: 'Assinado', color: 'bg-green-500' },
                  { key: 'em_atendimento', label: 'Atendimento', color: 'bg-teal-500' },
                  { key: 'lead_perdido', label: 'Perdido', color: 'bg-red-500' },
                ].filter((s) => (metrics.leadsPorStatus[s.key as keyof typeof metrics.leadsPorStatus] ?? 0) > 0)
                  .map((s) => (
                    <div key={s.key} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
                      <span className="text-[11px] text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Alertas Inteligentes ── */}
      {totalAlerts > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-card shadow-sm fade-in" style={{ animationDelay: '0.38s' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold">Alertas Inteligentes</CardTitle>
                <CardDescription>Itens que precisam de atenção</CardDescription>
              </div>
              <Badge variant="destructive">{totalAlerts}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {/* Prazos vencendo hoje/amanhã */}
            {todayPrazos.map((prazo) => {
              const dias = Math.ceil((new Date(prazo.data_prazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div
                  key={`prazo-${prazo.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors cursor-pointer"
                  onClick={() => navigate('/prazos')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate('/prazos'); }}
                >
                  <div className="p-1.5 bg-red-500/10 rounded-md flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 text-red-500" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{prazo.descricao}</p>
                    <p className="text-xs text-muted-foreground">{prazo.tipo} · {dias <= 0 ? 'Vence hoje' : 'Vence amanhã'}</p>
                  </div>
                  <Badge className="bg-red-500/15 text-red-600 flex-shrink-0">{dias <= 0 ? 'Hoje' : 'Amanhã'}</Badge>
                </div>
              );
            })}

            {/* Leads sem contato */}
            {staleLeads.map((lead) => {
              const displayName = lead.nome_completo || lead.nome || 'Sem nome';
              const lastDate = lead.last_activity_at || lead.created_at;
              return (
                <div
                  key={`stale-${lead.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-orange-500/5 hover:bg-orange-500/10 transition-colors cursor-pointer"
                  onClick={() => navigate(`/crm/lead/${lead.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/crm/lead/${lead.id}`); }}
                >
                  <div className="p-1.5 bg-orange-500/10 rounded-md flex-shrink-0">
                    <UserX className="h-3.5 w-3.5 text-orange-500" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      Sem contato {formatDistanceToNow(new Date(lastDate), { addSuffix: false, locale: ptBR })}
                    </p>
                  </div>
                  <Badge className="bg-orange-500/15 text-orange-600 flex-shrink-0">Sem contato</Badge>
                </div>
              );
            })}

            {/* Contratos pendentes */}
            {pendingContratos.map((contrato) => (
              <div
                key={`contrato-${contrato.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-violet-500/5 hover:bg-violet-500/10 transition-colors cursor-pointer"
                onClick={() => navigate('/contratos')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/contratos'); }}
              >
                <div className="p-1.5 bg-violet-500/10 rounded-md flex-shrink-0">
                  <FileSignature className="h-3.5 w-3.5 text-violet-500" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{contrato.titulo ?? 'Contrato sem título'}</p>
                  <p className="text-xs text-muted-foreground">
                    {contrato.status === 'enviado' ? 'Enviado, aguardando assinatura' : 'Pendente de envio'}
                    {' · '}
                    {formatDistanceToNow(new Date(contrato.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <Badge className="bg-violet-500/15 text-violet-600 flex-shrink-0">
                  {contrato.status === 'enviado' ? 'Aguardando' : 'Pendente'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Prazos Urgentes ── */}
      <PrazosUrgentesWidget />

      {/* ── Performance dos Agentes ── */}
      <Card className="border-border bg-card shadow-sm fade-in" style={{ animationDelay: '0.4s' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/8 dark:bg-primary/20 rounded-lg">
              <Bot className="h-4 w-4 text-primary" strokeWidth={2} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Performance dos Agentes IA</CardTitle>
              <CardDescription>Execuções recentes e taxa de sucesso</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topAgentes.map((agente) => {
              const successRate = agente.total_execucoes > 0
                ? (agente.sucesso / agente.total_execucoes) * 100
                : 0;
              return (
                <div key={agente.agente_nome} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border/50">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-primary/8 dark:bg-primary/20 rounded-md flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{agente.agente_nome}</p>
                      <p className="text-xs text-muted-foreground">{agente.total_execucoes} execuções • {successRate.toFixed(0)}% sucesso</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />{agente.sucesso}</Badge>
                    {agente.erro > 0 && (
                      <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{agente.erro}</Badge>
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

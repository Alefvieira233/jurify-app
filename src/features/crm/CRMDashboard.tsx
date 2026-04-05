
import { useState, useMemo } from 'react';
import {
  Target, Clock,
  BarChart3, Tag, ArrowRight, UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import FollowUpPanel from './FollowUpPanel';
import { useCRMPipeline, type PipelineStage } from '@/hooks/useCRMPipeline';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useTags } from '@/hooks/useTags';
import { useLeads } from '@/hooks/useLeads';
import { usePageTitle } from '@/hooks/usePageTitle';
import { fmtCurrency as fmt } from '@/utils/formatting';
import PipelineStageCard from './components/PipelineStageCard';
import FollowUpItem from './components/FollowUpItem';
import KPICards from './components/KPICards';
import ClientsTab from './components/ClientsTab';

const CRMDashboard = () => {
  usePageTitle('CRM');
  const { stages, loading: stagesLoading } = useCRMPipeline();
  const { followUps, overdueCount, loading: followUpsLoading } = useFollowUps();
  const { tags } = useTags();
  const { leads, loading: leadsLoading } = useLeads();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [followUpsOpen, setFollowUpsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline');

  const loading = stagesLoading || followUpsLoading || leadsLoading;

  const metrics = useMemo(() => {
    const totalPipelineValue = stages.reduce((s, st) => s + (st.total_value || 0), 0);
    const totalLeads         = stages.reduce((s, st) => s + (st.lead_count  || 0), 0);
    const pendingFollowUps   = followUps.filter(f => f.status === 'pending').length;
    const hotLeads           = leads.filter(l => l.temperature === 'hot').length;
    return { totalPipelineValue, totalLeads, pendingFollowUps, hotLeads, overdueCount };
  }, [stages, followUps, leads, overdueCount]);

  const upcomingFollowUps = useMemo(() =>
    followUps
      .filter(f => f.status === 'pending' || f.status === 'overdue')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 5),
  [followUps]);

  const clientCount = useMemo(() =>
    leads.filter(l => l.status === 'ganho').length,
  [leads]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))]">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="flex-1 p-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-[120px] rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))] bg-background">

      {/* ── Header ── */}
      <header className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">CRM Profissional</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {metrics.totalLeads} clientes · {fmt(metrics.totalPipelineValue)} no pipeline
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setFollowUpsOpen(true)}
          >
            <Clock className="h-3.5 w-3.5" />
            Follow-ups
            {metrics.overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px] font-bold">
                {metrics.overdueCount}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-5 pt-4 pb-0">
          <TabsList className="h-8 p-0.5 bg-muted/60">
            <TabsTrigger value="pipeline" className="h-7 text-xs px-3 gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="followups" className="h-7 text-xs px-3 gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Follow-ups
              {metrics.overdueCount > 0 && (
                <Badge variant="destructive" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-bold">
                  {metrics.overdueCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clientes" className="h-7 text-xs px-3 gap-1.5">
              <UserCheck className="h-3.5 w-3.5" />
              Clientes
              {clientCount > 0 && (
                <span className="ml-0.5 text-[10px] text-muted-foreground">({clientCount})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Pipeline Tab ── */}
        <TabsContent value="pipeline" className="mt-0 flex-1 overflow-y-auto px-5 py-5 space-y-5">

      <KPICards
        totalLeads={metrics.totalLeads}
        totalPipelineValue={metrics.totalPipelineValue}
        pendingFollowUps={metrics.pendingFollowUps}
        overdueCount={metrics.overdueCount}
        hotLeads={metrics.hotLeads}
      />

      {/* ── Pipeline Stages ── */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="px-4 py-3 border-b border-border/60">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Pipeline de Vendas
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">
              {stages.length} estágios
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {stages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum estágio configurado</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {stages.map((stage: PipelineStage) => (
                <PipelineStageCard
                  key={stage.id}
                  stage={stage}
                  isSelected={selectedStage === stage.id}
                  onToggle={(id) => setSelectedStage(selectedStage === id ? null : id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Bottom grid: Follow-ups + Tags ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Upcoming Follow-ups */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="px-4 py-3 border-b border-border/60 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Próximos Follow-ups
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setFollowUpsOpen(true)}
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-3">
            {upcomingFollowUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground">Nenhum follow-up pendente</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcomingFollowUps.map(fu => (
                  <FollowUpItem key={fu.id} fu={fu} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="px-4 py-3 border-b border-border/60">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Tags
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">({tags.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {tags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground">Nenhuma tag criada</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium cursor-default transition-opacity hover:opacity-80"
                    style={{ borderColor: tag.cor + '60', color: tag.cor, background: tag.cor + '12' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.cor }} />
                    {tag.nome}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

        </TabsContent>

        {/* ── Follow-ups Tab ── */}
        <TabsContent value="followups" className="mt-0 flex-1 overflow-y-auto px-5 py-5">
          <FollowUpPanel />
        </TabsContent>

        {/* ── Clientes Tab ── */}
        <TabsContent value="clientes" className="mt-0 flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <ClientsTab leads={leads} />
        </TabsContent>

      </Tabs>

      <Sheet open={followUpsOpen} onOpenChange={setFollowUpsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0">
          <SheetHeader className="px-6 pt-5 pb-0">
            <SheetTitle>Follow-ups</SheetTitle>
          </SheetHeader>
          <FollowUpPanel />
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default CRMDashboard;


import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, TrendingUp, Clock, Users, DollarSign,
  BarChart3, Tag, ArrowRight, AlertCircle, Search, Plus, UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import FollowUpPanel from './FollowUpPanel';
import { useCRMPipeline, type PipelineStage } from '@/hooks/useCRMPipeline';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useTags } from '@/hooks/useTags';
import { useLeads } from '@/hooks/useLeads';
import { usePageTitle } from '@/hooks/usePageTitle';

/* ── KPI config ── */
const KPI_COLORS = {
  blue:    { hex: '#2563eb', bg: 'rgba(37,99,235,0.08)'   },
  emerald: { hex: '#059669', bg: 'rgba(5,150,105,0.08)'   },
  amber:   { hex: '#d97706', bg: 'rgba(217,119,6,0.08)'   },
  rose:    { hex: '#e11d48', bg: 'rgba(225,29,72,0.08)'   },
};

import { fmtCurrency as fmt, fmtDateTime as fmtDt, fmtDate } from '@/utils/formatting';

/* ── Client status filter ── */
const CLIENT_STATUSES = ['ganho'] as const;
const STATUS_LABEL: Record<string, string> = {
  ganho: 'Ganho',
};

/* ── Priority badge classes ── */
const PRIORITY_CLS: Record<string, string> = {
  urgent: 'bg-rose-100  text-rose-700  border-rose-200  dark:bg-rose-900/30  dark:text-rose-300',
  high:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  medium: 'bg-blue-100  text-blue-700  border-blue-200  dark:bg-blue-900/30  dark:text-blue-300',
  low:    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400',
};
const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa',
};

/* ─────────────────────────────────────────────── */

const CRMDashboard = () => {
  usePageTitle('CRM');
  const navigate = useNavigate();
  const { stages, loading: stagesLoading } = useCRMPipeline();
  const { followUps, overdueCount, loading: followUpsLoading } = useFollowUps();
  const { tags } = useTags();
  const { leads, loading: leadsLoading } = useLeads();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [followUpsOpen, setFollowUpsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [clientSearch, setClientSearch] = useState('');

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

  const clients = useMemo(() => {
    const filtered = leads.filter(l =>
      CLIENT_STATUSES.includes(l.status as typeof CLIENT_STATUSES[number]),
    );
    if (!clientSearch.trim()) return filtered;
    const q = clientSearch.trim().toLowerCase();
    return filtered.filter(l =>
      (l.nome_completo ?? l.nome ?? '').toLowerCase().includes(q),
    );
  }, [leads, clientSearch]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col h-screen">
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
    <div className="flex flex-col h-screen bg-background">

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
              {clients.length > 0 && (
                <span className="ml-0.5 text-[10px] text-muted-foreground">({clients.length})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Pipeline Tab ── */}
        <TabsContent value="pipeline" className="mt-0 flex-1 overflow-y-auto px-5 py-5 space-y-5">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Leads */}
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Clientes no Pipeline</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">{metrics.totalLeads}</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: KPI_COLORS.blue.bg }}>
                <Users className="h-4.5 w-4.5" style={{ color: KPI_COLORS.blue.hex }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Value */}
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Valor Total Pipeline</p>
                <p className="text-lg font-bold tabular-nums mt-0.5 truncate">{fmt(metrics.totalPipelineValue)}</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: KPI_COLORS.emerald.bg }}>
                <DollarSign className="h-4.5 w-4.5" style={{ color: KPI_COLORS.emerald.hex }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Follow-ups Pendentes</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">{metrics.pendingFollowUps}</p>
                {metrics.overdueCount > 0 && (
                  <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1">
                    <AlertCircle className="h-2.5 w-2.5" /> {metrics.overdueCount} atrasados
                  </p>
                )}
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: KPI_COLORS.amber.bg }}>
                <Clock className="h-4.5 w-4.5" style={{ color: KPI_COLORS.amber.hex }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hot leads */}
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Clientes Quentes</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">{metrics.hotLeads}</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: KPI_COLORS.rose.bg }}>
                <TrendingUp className="h-4.5 w-4.5" style={{ color: KPI_COLORS.rose.hex }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
                  className={`flex-shrink-0 min-w-[130px] p-3 rounded-lg border text-left transition-all duration-150 ${
                    selectedStage === stage.id
                      ? 'ring-2 ring-primary/40 shadow-md scale-[1.02]'
                      : 'hover:shadow-sm hover:scale-[1.01]'
                  }`}
                  style={{ borderColor: stage.color + '30', background: stage.color + '08' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                    <p className="text-[11px] font-medium text-muted-foreground truncate">{stage.name}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums leading-none" style={{ color: stage.color }}>
                    {stage.lead_count || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                    {fmt(stage.total_value || 0)}
                  </p>
                </button>
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
                  <div
                    key={fu.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                      fu.status === 'overdue' ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'bg-muted/40 hover:bg-muted/70'
                    }`}
                  >
                    {/* Status dot */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: fu.status === 'overdue' ? '#e11d48' : '#d97706' }}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{fu.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {fu.lead_name} · {fmtDt(fu.scheduled_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {fu.status === 'overdue' && (
                        <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">Atrasado</Badge>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PRIORITY_CLS[fu.priority] ?? PRIORITY_CLS.low}`}>
                        {PRIORITY_LABEL[fu.priority] ?? fu.priority}
                      </span>
                    </div>
                  </div>
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
          {/* Search + Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente por nome..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => navigate('/pipeline')}
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Cliente
            </Button>
          </div>

          {/* Clients Table */}
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-0">
              {clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <UserCheck className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {clientSearch.trim() ? 'Nenhum cliente encontrado' : 'Nenhum cliente ativo'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                    {clientSearch.trim()
                      ? 'Tente buscar por outro nome.'
                      : 'Leads com status "Contrato Assinado" ou "Em Atendimento" aparecem aqui.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nome</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">CPF/CNPJ</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Telefone</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Data de Cadastro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map(client => (
                        <tr
                          key={client.id}
                          className="border-b border-border/40 hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => navigate(`/crm/lead/${client.id}`)}
                        >
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            {client.nome_completo ?? client.nome ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell tabular-nums">
                            {client.cpf_cnpj ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell tabular-nums">
                            {client.telefone ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">
                            {client.email ?? '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium ${
                                client.status === 'ganho'
                                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-900/30'
                                  : 'border-cyan-300 text-cyan-700 bg-cyan-50 dark:border-cyan-700 dark:text-cyan-300 dark:bg-cyan-900/30'
                              }`}
                            >
                              {STATUS_LABEL[client.status ?? ''] ?? client.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell tabular-nums">
                            {fmtDate(client.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
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

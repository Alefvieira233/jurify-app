import { useState, useMemo } from 'react';
import { Target, TrendingUp, Clock, Users, DollarSign, BarChart3, Tag, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCRMPipeline, type PipelineStage } from '@/hooks/useCRMPipeline';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useCRMTags } from '@/hooks/useCRMTags';
import { useLeads } from '@/hooks/useLeads';
import { useNavigate } from 'react-router-dom';

const CRMDashboard = () => {
  const navigate = useNavigate();
  const { stages, loading: stagesLoading } = useCRMPipeline();
  const { followUps, overdueCount, loading: followUpsLoading } = useFollowUps();
  const { tags } = useCRMTags();
  const { leads, loading: leadsLoading } = useLeads();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const loading = stagesLoading || followUpsLoading || leadsLoading;

  const metrics = useMemo(() => {
    const totalPipelineValue = stages.reduce((sum, s) => sum + (s.total_value || 0), 0);
    const totalLeads = stages.reduce((sum, s) => sum + (s.lead_count || 0), 0);
    const pendingFollowUps = followUps.filter(f => f.status === 'pending').length;
    const hotLeads = leads.filter(l => (l as Record<string, unknown>).temperature === 'hot').length;

    return { totalPipelineValue, totalLeads, pendingFollowUps, hotLeads, overdueCount };
  }, [stages, followUps, leads, overdueCount]);

  const upcomingFollowUps = useMemo(() => {
    return followUps
      .filter(f => f.status === 'pending' || f.status === 'overdue')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 5);
  }, [followUps]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            CRM Profissional
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie seu pipeline, follow-ups e leads em um só lugar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/crm/followups')}>
            <Clock className="h-4 w-4 mr-2" />
            Follow-ups
            {metrics.overdueCount > 0 && (
              <Badge variant="destructive" className="ml-2">{metrics.overdueCount}</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads no Pipeline</p>
                <p className="text-3xl font-bold mt-1">{metrics.totalLeads}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total Pipeline</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.totalPipelineValue)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Follow-ups Pendentes</p>
                <p className="text-3xl font-bold mt-1">{metrics.pendingFollowUps}</p>
                {metrics.overdueCount > 0 && (
                  <p className="text-xs text-destructive mt-1">{metrics.overdueCount} atrasados</p>
                )}
              </div>
              <Clock className="h-10 w-10 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads Quentes</p>
                <p className="text-3xl font-bold mt-1">{metrics.hotLeads}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Pipeline de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {stages.map((stage: PipelineStage) => (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
                className={`p-4 rounded-lg border text-center transition-all hover:scale-105 ${
                  selectedStage === stage.id ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
                style={{ borderColor: stage.color + '40', backgroundColor: stage.color + '10' }}
              >
                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: stage.color }} />
                <p className="text-xs font-medium truncate">{stage.name}</p>
                <p className="text-2xl font-bold mt-1">{stage.lead_count || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatCurrency(stage.total_value || 0)}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Follow-ups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Próximos Follow-ups
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/crm/followups')}>
              Ver todos <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum follow-up pendente</p>
            ) : (
              <div className="space-y-3">
                {upcomingFollowUps.map(fu => (
                  <div key={fu.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fu.title}</p>
                      <p className="text-xs text-muted-foreground">{fu.lead_name} &middot; {formatDate(fu.scheduled_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={fu.status === 'overdue' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {fu.followup_type}
                      </Badge>
                      <Badge variant={fu.priority === 'urgent' ? 'destructive' : fu.priority === 'high' ? 'default' : 'secondary'} className="text-[10px]">
                        {fu.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5" />
              Tags ({tags.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tag criada</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge key={tag.id} variant="outline" className="px-3 py-1.5" style={{ borderColor: tag.color, color: tag.color }}>
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CRMDashboard;

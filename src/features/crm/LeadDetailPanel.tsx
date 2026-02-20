import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Tag, Activity, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useCRMActivities, type Activity as CRMActivity } from '@/hooks/useCRMActivities';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useCRMTags, type Tag as CRMTag } from '@/hooks/useCRMTags';
import { useLeadScoring } from '@/hooks/useLeadScoring';
import { createLogger } from '@/lib/logger';

const log = createLogger('LeadDetail');

type LeadDetail = {
  id: string;
  nome_completo: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  area_juridica: string | null;
  status: string | null;
  origem: string | null;
  valor_causa: number | null;
  lead_score: number | null;
  temperature: string | null;
  expected_value: number | null;
  probability: number | null;
  company_name: string | null;
  cpf_cnpj: string | null;
  pipeline_stage_id: string | null;
  last_activity_at: string | null;
  next_followup_at: string | null;
  followup_count: number | null;
  created_at: string;
  updated_at: string | null;
};

const activityTypeConfig: Record<string, { label: string; color: string }> = {
  call: { label: 'Ligação', color: 'text-blue-500' },
  email: { label: 'E-mail', color: 'text-green-500' },
  meeting: { label: 'Reunião', color: 'text-purple-500' },
  note: { label: 'Nota', color: 'text-gray-500' },
  whatsapp: { label: 'WhatsApp', color: 'text-emerald-500' },
  task: { label: 'Tarefa', color: 'text-orange-500' },
  status_change: { label: 'Status', color: 'text-yellow-500' },
  followup_scheduled: { label: 'Follow-up', color: 'text-cyan-500' },
  followup_completed: { label: 'Concluído', color: 'text-green-500' },
  document_sent: { label: 'Documento', color: 'text-indigo-500' },
  proposal_sent: { label: 'Proposta', color: 'text-pink-500' },
};

const LeadDetailPanel = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [leadTags, setLeadTags] = useState<CRMTag[]>([]);
  const [loading, setLoading] = useState(true);

  const { activities, fetchActivities } = useCRMActivities();
  const { followUps, fetchFollowUps, completeFollowUp } = useFollowUps();
  const { getLeadTags } = useCRMTags();
  const { scores, getLeadScore } = useLeadScoring();

  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      if (error) throw error;
      setLead(data as LeadDetail);
    } catch (error) {
      log.error('Failed to fetch lead', error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) {
      void fetchLead();
      void fetchActivities(leadId);
      void fetchFollowUps({ leadId });
      void getLeadTags(leadId).then(setLeadTags);
      void getLeadScore(leadId);
    }
  }, [leadId, fetchLead, fetchActivities, fetchFollowUps, getLeadTags, getLeadScore]);

  const leadFollowUps = followUps.filter(f => f.lead_id === leadId);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatShortDate = (date: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

  const getTemperatureColor = (temp: string | null) => {
    if (temp === 'hot') return 'bg-red-500/15 text-red-300 border-red-400/30';
    if (temp === 'warm') return 'bg-orange-500/15 text-orange-300 border-orange-400/30';
    return 'bg-blue-500/15 text-blue-300 border-blue-400/30';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-muted-foreground">Lead não encontrado</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/leads')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Leads
        </Button>
      </div>
    );
  }

  const score = scores[leadId || ''] || lead.lead_score || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      {/* Lead Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{lead.nome_completo || lead.nome || 'Lead sem nome'}</h1>
                {lead.company_name && <p className="text-sm text-muted-foreground">{lead.company_name}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {lead.status && <Badge variant="outline">{lead.status.replace(/_/g, ' ')}</Badge>}
                  {lead.temperature && (
                    <Badge variant="outline" className={getTemperatureColor(lead.temperature)}>
                      {lead.temperature === 'hot' ? 'Quente' : lead.temperature === 'warm' ? 'Morno' : 'Frio'}
                    </Badge>
                  )}
                  {lead.area_juridica && <Badge variant="secondary">{lead.area_juridica}</Badge>}
                  {lead.origem && <Badge variant="secondary">{lead.origem}</Badge>}
                </div>
                {leadTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {leadTags.map(tag => (
                      <Badge key={tag.id} variant="outline" className="text-[10px] px-2" style={{ borderColor: tag.color, color: tag.color }}>
                        <Tag className="h-2.5 w-2.5 mr-1" /> {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Score & Value */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</p>
              </div>
              {lead.expected_value && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Valor Esperado</p>
                  <p className="text-lg font-bold text-green-500">{formatCurrency(lead.expected_value)}</p>
                  {lead.probability != null && (
                    <p className="text-xs text-muted-foreground">{lead.probability}% probabilidade</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
              </div>
            )}
            {lead.telefone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${lead.telefone}`} className="text-primary hover:underline">{lead.telefone}</a>
              </div>
            )}
            {lead.cpf_cnpj && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{lead.cpf_cnpj}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Activities, Follow-ups */}
      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities" className="gap-1">
            <Activity className="h-4 w-4" /> Atividades ({activities.length})
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-1">
            <Clock className="h-4 w-4" /> Follow-ups ({leadFollowUps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade registrada</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {activities.map((act: CRMActivity) => {
                      const config = activityTypeConfig[act.activity_type] || { label: act.activity_type, color: 'text-gray-500' };
                      return (
                        <div key={act.id} className="flex items-start gap-4 relative">
                          <div className={`w-10 h-10 rounded-full bg-card border flex items-center justify-center z-10 flex-shrink-0 ${config.color}`}>
                            <Activity className="h-4 w-4" />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{act.title}</p>
                              <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                            </div>
                            {act.description && <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>}
                            <p className="text-[11px] text-muted-foreground mt-1">{formatShortDate(act.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {leadFollowUps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum follow-up agendado</p>
              ) : (
                <div className="space-y-3">
                  {leadFollowUps.map(fu => (
                    <div key={fu.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <Clock className={`h-5 w-5 flex-shrink-0 ${fu.status === 'overdue' ? 'text-red-500' : fu.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fu.title}</p>
                        <p className="text-xs text-muted-foreground">{fu.followup_type} &middot; {formatShortDate(fu.scheduled_at)}</p>
                      </div>
                      <Badge variant={fu.status === 'overdue' ? 'destructive' : fu.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                        {fu.status}
                      </Badge>
                      {(fu.status === 'pending' || fu.status === 'overdue') && (
                        <Button size="sm" variant="ghost" className="h-8 text-green-500" onClick={() => void completeFollowUp(fu.id)}>
                          Concluir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeadDetailPanel;

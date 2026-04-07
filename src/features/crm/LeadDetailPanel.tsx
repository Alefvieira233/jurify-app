
import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  ArrowLeft, Phone, Mail, Tag, Activity, Clock,
  Scale, Building2, CreditCard,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useCRMActivities, type Activity as CRMActivity } from '@/hooks/useCRMActivities';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useLeadTags } from '@/hooks/useTags';
import { useLeadScoring } from '@/hooks/useLeadScoring';
import { getInitials, getAvatarHex, fmtCurrency, fmtDateTime } from '@/utils/formatting';
import { usePageTitle } from '@/hooks/usePageTitle';

type LeadDetail = {
  id:                 string;
  nome_completo:      string | null;
  nome:               string | null;
  email:              string | null;
  telefone:           string | null;
  area_juridica:      string | null;
  status:             string | null;
  origem:             string | null;
  valor_causa:        number | null;
  lead_score:         number | null;
  temperature:        string | null;
  expected_value:     number | null;
  probability:        number | null;
  company_name:       string | null;
  cpf_cnpj:          string | null;
  pipeline_stage_id:  string | null;
  last_activity_at:   string | null;
  next_followup_at:   string | null;
  followup_count:     number | null;
  created_at:         string;
  updated_at:         string | null;
};

/* ── Status palette (dark-mode aware Tailwind classes) ── */
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  novo:        { bg: 'bg-blue-600/10 dark:bg-blue-400/10',     text: 'text-blue-700 dark:text-blue-400',      label: 'Novo'        },
  em_contato:  { bg: 'bg-cyan-600/10 dark:bg-cyan-400/10',     text: 'text-cyan-700 dark:text-cyan-400',      label: 'Em Contato'  },
  qualificado: { bg: 'bg-amber-600/10 dark:bg-amber-400/10',   text: 'text-amber-700 dark:text-amber-400',    label: 'Qualificado' },
  proposta:    { bg: 'bg-indigo-600/10 dark:bg-indigo-400/10', text: 'text-indigo-700 dark:text-indigo-400',  label: 'Proposta'    },
  negociacao:  { bg: 'bg-violet-600/10 dark:bg-violet-400/10', text: 'text-violet-700 dark:text-violet-400',  label: 'Negociação'  },
  ganho:       { bg: 'bg-emerald-600/10 dark:bg-emerald-400/10', text: 'text-emerald-700 dark:text-emerald-400', label: 'Ganho'    },
  perdido:     { bg: 'bg-rose-600/10 dark:bg-rose-400/10',     text: 'text-rose-700 dark:text-rose-400',      label: 'Perdido'     },
};

const ACTIVITY_CFG: Record<string, { label: string; bg: string; text: string; iconText: string }> = {
  call:               { label: 'Ligação',   bg: 'bg-blue-600/10 dark:bg-blue-400/10',     text: 'text-blue-700 dark:text-blue-400',      iconText: 'text-blue-600 dark:text-blue-400'    },
  email:              { label: 'E-mail',    bg: 'bg-emerald-600/10 dark:bg-emerald-400/10', text: 'text-emerald-700 dark:text-emerald-400', iconText: 'text-emerald-600 dark:text-emerald-400' },
  meeting:            { label: 'Reunião',   bg: 'bg-violet-600/10 dark:bg-violet-400/10', text: 'text-violet-700 dark:text-violet-400',  iconText: 'text-violet-600 dark:text-violet-400' },
  note:               { label: 'Nota',      bg: 'bg-gray-600/10 dark:bg-gray-400/10',     text: 'text-gray-700 dark:text-gray-400',      iconText: 'text-gray-500 dark:text-gray-400'    },
  whatsapp:           { label: 'WhatsApp',  bg: 'bg-emerald-600/10 dark:bg-emerald-400/10', text: 'text-emerald-700 dark:text-emerald-400', iconText: 'text-emerald-600 dark:text-emerald-400' },
  task:               { label: 'Tarefa',    bg: 'bg-orange-600/10 dark:bg-orange-400/10', text: 'text-orange-700 dark:text-orange-400',  iconText: 'text-orange-600 dark:text-orange-400' },
  status_change:      { label: 'Status',    bg: 'bg-amber-600/10 dark:bg-amber-400/10',   text: 'text-amber-700 dark:text-amber-400',    iconText: 'text-amber-600 dark:text-amber-400'  },
  followup_scheduled: { label: 'Follow-up', bg: 'bg-sky-600/10 dark:bg-sky-400/10',       text: 'text-sky-700 dark:text-sky-400',        iconText: 'text-sky-600 dark:text-sky-400'      },
  followup_completed: { label: 'Concluído', bg: 'bg-emerald-600/10 dark:bg-emerald-400/10', text: 'text-emerald-700 dark:text-emerald-400', iconText: 'text-emerald-600 dark:text-emerald-400' },
  document_sent:      { label: 'Documento', bg: 'bg-indigo-600/10 dark:bg-indigo-400/10', text: 'text-indigo-700 dark:text-indigo-400',  iconText: 'text-indigo-600 dark:text-indigo-400' },
  proposal_sent:      { label: 'Proposta',  bg: 'bg-pink-600/10 dark:bg-pink-400/10',     text: 'text-pink-700 dark:text-pink-400',      iconText: 'text-pink-600 dark:text-pink-400'    },
};


/* ── Component ── */
const LeadDetailPanel = () => {
  usePageTitle('Detalhes do Lead');
  const { leadId }  = useParams<{ leadId: string }>();
  const navigate    = useNavigate();
  const { activities, fetchActivities }               = useCRMActivities();
  const { followUps, fetchFollowUps, completeFollowUp } = useFollowUps();
  const { leadTags: leadTagsData }                    = useLeadTags(leadId ?? null);
  const { scores, getLeadScore }                      = useLeadScoring();

  const { data: lead, isLoading: loading } = useQuery({
    queryKey: queryKeys.leads.byId(leadId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads').select('id, nome, email, telefone, area_juridica, status, origem, valor_causa, lead_score, temperature, expected_value, probability, company_name, cpf_cnpj, pipeline_stage_id, last_activity_at, next_followup_at, followup_count, created_at, updated_at').eq('id', leadId!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, nome_completo: data.nome, created_at: data.created_at ?? '' } as LeadDetail;
    },
    enabled: !!leadId,
  });

  useEffect(() => {
    if (leadId) {
      void fetchActivities(leadId);
      void fetchFollowUps({ leadId });
      void getLeadScore(leadId);
    }
  }, [leadId, fetchActivities, fetchFollowUps, getLeadScore]);

  const leadFollowUps = followUps.filter(f => f.lead_id === leadId);
  const score  = scores[leadId ?? ''] || lead?.lead_score || 0;
  const sc     = STATUS_COLORS[lead?.status ?? ''];
  const initials = useMemo(() => getInitials(lead?.nome_completo ?? null), [lead?.nome_completo]);
  const bg       = useMemo(() => getAvatarHex(lead?.nome_completo ?? ''), [lead?.nome_completo]);

  const scoreClass = score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
  const tempLabel  = lead?.temperature === 'hot' ? 'Quente' : lead?.temperature === 'warm' ? 'Morno' : 'Frio';
  const tempBg     = lead?.temperature === 'hot' ? 'bg-rose-600/10 dark:bg-rose-400/10' : lead?.temperature === 'warm' ? 'bg-orange-600/10 dark:bg-orange-400/10' : 'bg-blue-600/10 dark:bg-blue-400/10';
  const tempText   = lead?.temperature === 'hot' ? 'text-rose-700 dark:text-rose-400' : lead?.temperature === 'warm' ? 'text-orange-700 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400';

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))]">
        <div className="px-5 py-3 border-b border-border">
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="p-5 space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!lead) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))]">
        <div className="px-5 py-3 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 text-xs gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <p className="text-sm text-muted-foreground mb-3">Cliente não encontrado</p>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leads')} className="h-8 text-xs gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Clientes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-h,4rem))] bg-background">

      {/* ── Back bar ── */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-border bg-background flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 text-xs gap-1.5 -ml-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Button>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          Criado em {new Date(lead.created_at).toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* ── Lead header card ── */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-border bg-background">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ring-2 ring-background shadow-sm"
            style={{ background: bg }}
          >
            {initials}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-base font-bold text-foreground">
                {lead.nome_completo || lead.nome || 'Cliente sem nome'}
              </h1>
              {sc && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}
                >
                  {sc.label}
                </span>
              )}
              {lead.temperature && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tempBg} ${tempText}`}
                >
                  {tempLabel}
                </span>
              )}
            </div>

            {/* Contact row */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70 mb-1.5">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  {lead.email}
                </a>
              )}
              {lead.telefone && (
                <a href={`tel:${lead.telefone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  {lead.telefone}
                </a>
              )}
              {lead.area_juridica && (
                <span className="flex items-center gap-1">
                  <Scale className="h-3 w-3 flex-shrink-0" />
                  {lead.area_juridica}
                </span>
              )}
              {lead.company_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  {lead.company_name}
                </span>
              )}
              {lead.cpf_cnpj && (
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3 flex-shrink-0" />
                  {lead.cpf_cnpj}
                </span>
              )}
            </div>

            {/* Tags */}
            {leadTagsData.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {leadTagsData.map(lt => (
                  <Badge
                    key={lt.id}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0.5 gap-0.5"
                    style={{ borderColor: (lt.tag?.cor ?? '#6b7280') + '50', color: lt.tag?.cor ?? '#6b7280' }}
                  >
                    <Tag className="h-2.5 w-2.5" /> {lt.tag?.nome ?? ''}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Score + value */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Score</p>
              <p className={`text-2xl font-bold tabular-nums ${scoreClass}`}>{score}</p>
            </div>
            {lead.expected_value && (
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Valor esperado</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {fmtCurrency(lead.expected_value)}
                </p>
                {lead.probability != null && (
                  <p className="text-[10px] text-muted-foreground">{lead.probability}%</p>
                )}
              </div>
            )}
            {lead.valor_causa && (
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Causa</p>
                <p className="text-sm font-bold text-foreground">{fmtCurrency(lead.valor_causa)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="activities" className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-shrink-0 px-5 border-b border-border">
            <TabsList className="h-10 bg-transparent gap-0 rounded-none p-0">
              <TabsTrigger
                value="activities"
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent text-xs gap-1.5"
              >
                <Activity className="h-3.5 w-3.5" />
                Atividades
                <span className="text-[10px] tabular-nums">({activities.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="followups"
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent text-xs gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                Follow-ups
                <span className="text-[10px] tabular-nums">({leadFollowUps.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="activities" className="flex-1 overflow-y-auto mt-0 p-0">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
              </div>
            ) : (
              <div className="relative px-5 py-4">
                {/* Timeline line */}
                <div className="absolute left-[32px] top-4 bottom-4 w-px bg-border" />
                <div className="space-y-4">
                  {activities.map((act: CRMActivity) => {
                    const cfg = ACTIVITY_CFG[act.activity_type] ?? { label: act.activity_type, bg: 'bg-gray-600/10 dark:bg-gray-400/10', text: 'text-gray-700 dark:text-gray-400', iconText: 'text-gray-500 dark:text-gray-400' };
                    return (
                      <div key={act.id} className="flex items-start gap-4 relative">
                        <div
                          className={`w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center z-10 flex-shrink-0 ${cfg.iconText}`}
                        >
                          <Activity className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 pt-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-semibold text-foreground truncate">{act.title}</p>
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.text}`}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-[11px] text-muted-foreground/60 truncate">{act.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/40 mt-0.5 tabular-nums">
                            {fmtDateTime(act.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="followups" className="flex-1 overflow-y-auto mt-0 p-0">
            {leadFollowUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum follow-up agendado</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {leadFollowUps.map(fu => {
                  const isOverdue   = fu.status === 'overdue';
                  const isCompleted = fu.status === 'completed';
                  const iconClass = isOverdue ? 'text-rose-600 dark:text-rose-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';
                  const badgeBg   = isOverdue ? 'bg-rose-600/10 dark:bg-rose-400/10' : isCompleted ? 'bg-emerald-600/10 dark:bg-emerald-400/10' : 'bg-amber-600/10 dark:bg-amber-400/10';
                  const badgeText = isOverdue ? 'text-rose-700 dark:text-rose-400' : isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400';
                  const label = isOverdue ? 'Atrasado' : isCompleted ? 'Concluído' : 'Pendente';
                  return (
                    <div key={fu.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <Clock className={`h-4 w-4 flex-shrink-0 ${iconClass}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{fu.title}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {fu.followup_type} · {fmtDateTime(fu.scheduled_at)}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${badgeBg} ${badgeText}`}
                      >
                        {label}
                      </span>
                      {(fu.status === 'pending' || fu.status === 'overdue') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 px-2"
                          onClick={() => void completeFollowUp(fu.id)}
                        >
                          Concluir
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LeadDetailPanel;

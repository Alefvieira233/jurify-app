
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Phone, Mail, Tag, Activity, Clock,
  Scale, Building2, CreditCard,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useCRMActivities, type Activity as CRMActivity } from '@/hooks/useCRMActivities';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useCRMTags, type Tag as CRMTag } from '@/hooks/useCRMTags';
import { useLeadScoring } from '@/hooks/useLeadScoring';
import { getInitials, getAvatarHex, fmtCurrency, fmtDateTime } from '@/utils/formatting';

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

/* ── Status palette ── */
const STATUS_COLORS: Record<string, { hex: string; textColor: string; label: string }> = {
  novo_lead:         { hex: '#2563eb', textColor: '#1d4ed8', label: 'Captação'    },
  em_qualificacao:   { hex: '#d97706', textColor: '#b45309', label: 'Qualificação' },
  proposta_enviada:  { hex: '#4f46e5', textColor: '#4338ca', label: 'Proposta'    },
  contrato_assinado: { hex: '#059669', textColor: '#047857', label: 'Contrato'    },
  em_atendimento:    { hex: '#0284c7', textColor: '#0369a1', label: 'Execução'    },
  lead_perdido:      { hex: '#e11d48', textColor: '#be123c', label: 'Arquivado'   },
};

const ACTIVITY_CFG: Record<string, { label: string; hex: string }> = {
  call:               { label: 'Ligação',   hex: '#2563eb' },
  email:              { label: 'E-mail',    hex: '#059669' },
  meeting:            { label: 'Reunião',   hex: '#7c3aed' },
  note:               { label: 'Nota',      hex: '#6b7280' },
  whatsapp:           { label: 'WhatsApp',  hex: '#059669' },
  task:               { label: 'Tarefa',    hex: '#ea580c' },
  status_change:      { label: 'Status',    hex: '#d97706' },
  followup_scheduled: { label: 'Follow-up', hex: '#0284c7' },
  followup_completed: { label: 'Concluído', hex: '#059669' },
  document_sent:      { label: 'Documento', hex: '#4f46e5' },
  proposal_sent:      { label: 'Proposta',  hex: '#db2777' },
};


/* ── Component ── */
const LeadDetailPanel = () => {
  const { leadId }  = useParams<{ leadId: string }>();
  const navigate    = useNavigate();
  const [leadTags, setLeadTags] = useState<CRMTag[]>([]);

  const { activities, fetchActivities }               = useCRMActivities();
  const { followUps, fetchFollowUps, completeFollowUp } = useFollowUps();
  const { getLeadTags }                               = useCRMTags();
  const { scores, getLeadScore }                      = useLeadScoring();

  const { data: lead, isLoading: loading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads').select('*').eq('id', leadId!).single();
      if (error) throw error;
      return data as LeadDetail;
    },
    enabled: !!leadId,
  });

  useEffect(() => {
    if (leadId) {
      void fetchActivities(leadId);
      void fetchFollowUps({ leadId });
      void getLeadTags(leadId).then(setLeadTags);
      void getLeadScore(leadId);
    }
  }, [leadId, fetchActivities, fetchFollowUps, getLeadTags, getLeadScore]);

  const leadFollowUps = followUps.filter(f => f.lead_id === leadId);
  const score  = scores[leadId ?? ''] || lead?.lead_score || 0;
  const sc     = STATUS_COLORS[lead?.status ?? ''];
  const initials = useMemo(() => getInitials(lead?.nome_completo ?? null), [lead?.nome_completo]);
  const bg       = useMemo(() => getAvatarHex(lead?.nome_completo ?? ''), [lead?.nome_completo]);

  const scoreColor = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#e11d48';
  const tempLabel  = lead?.temperature === 'hot' ? 'Quente' : lead?.temperature === 'warm' ? 'Morno' : 'Frio';
  const tempHex    = lead?.temperature === 'hot' ? '#e11d48' : lead?.temperature === 'warm' ? '#ea580c' : '#2563eb';

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col h-screen">
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
      <div className="flex flex-col h-screen">
        <div className="px-5 py-3 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 text-xs gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <p className="text-sm text-muted-foreground mb-3">Lead não encontrado</p>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leads')} className="h-8 text-xs gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Leads
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">

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
                {lead.nome_completo || lead.nome || 'Lead sem nome'}
              </h1>
              {sc && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: sc.hex + '1a', color: sc.textColor }}
                >
                  {sc.label}
                </span>
              )}
              {lead.temperature && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: tempHex + '1a', color: tempHex }}
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
            {leadTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {leadTags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0.5 gap-0.5"
                    style={{ borderColor: tag.color + '50', color: tag.color }}
                  >
                    <Tag className="h-2.5 w-2.5" /> {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Score + value */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Score</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: scoreColor }}>{score}</p>
            </div>
            {lead.expected_value && (
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Valor esperado</p>
                <p className="text-sm font-bold" style={{ color: '#059669' }}>
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
                    const cfg = ACTIVITY_CFG[act.activity_type] ?? { label: act.activity_type, hex: '#6b7280' };
                    return (
                      <div key={act.id} className="flex items-start gap-4 relative">
                        <div
                          className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center z-10 flex-shrink-0"
                          style={{ color: cfg.hex }}
                        >
                          <Activity className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 pt-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-semibold text-foreground truncate">{act.title}</p>
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: cfg.hex + '1a', color: cfg.hex }}
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
                  const hex = isOverdue ? '#e11d48' : isCompleted ? '#059669' : '#d97706';
                  const label = isOverdue ? 'Atrasado' : isCompleted ? 'Concluído' : 'Pendente';
                  return (
                    <div key={fu.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <Clock className="h-4 w-4 flex-shrink-0" style={{ color: hex }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{fu.title}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {fu.followup_type} · {fmtDateTime(fu.scheduled_at)}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: hex + '1a', color: hex }}
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

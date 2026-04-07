import React, { useState } from 'react';
import { type Lead, useLeads } from '@/hooks/useLeads';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getInitials, getAvatarHex, fmtDate, fmtCurrency } from '@/utils/formatting';
import {
  User,
  Phone,
  Calendar,
  Clock,
  Link2,
  AlertCircle,
  ShieldCheck,
  Save,
  MessageCircle,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { STATUS_LEAD, LEAD_STATUS_LABELS } from '@/schemas/leadSchema';
import { PRIORIDADES, type Prioridade } from '@/types/crm-operacional';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface LeadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onSuccess?: () => void;
  onDelete?: () => void;
  onTimelineRequest?: () => void;
}

export const LeadDrawer: React.FC<LeadDrawerProps> = ({ open, onOpenChange, lead, onSuccess, onDelete, onTimelineRequest }) => {
  const { updateLead } = useLeads();
  const { activeDepartamentos } = useDepartamentos();
  const { members } = useTeamMembers();
  const [isSaving, setIsSaving] = useState(false);

  const [statusVal, setStatusVal] = useState(lead.status ?? 'novo');
  const [departamentoVal, setDepartamentoVal] = useState(lead.departamento_id ?? '');
  const [prioridadeVal, setPrioridadeVal] = useState<Prioridade>(lead.prioridade || 'media');
  const [responsavelVal, setResponsavelVal] = useState(lead.responsavel_id ?? '');
  const [observacoesVal, setObservacoesVal] = useState(lead.observacoes ?? '');

  const bgColor = getAvatarHex(lead.nome_completo ?? '');
  const initials = getInitials(lead.nome_completo ?? '?');

  const selectedDepto = activeDepartamentos.find(d => d.id === departamentoVal);
  const selectedMember = members.find(m => m.id === responsavelVal);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateLead(lead.id, {
      status: statusVal,
      responsavel_id: responsavelVal || null,
      observacoes: observacoesVal,
      prioridade: prioridadeVal,
      departamento_id: departamentoVal || null,
    });
    setIsSaving(false);
    if (success) {
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-xl xl:max-w-2xl overflow-y-auto bg-background/95 backdrop-blur-xl border-l border-border/10 shadow-2xl p-0 flex flex-col">

        {/* Header - Fixed */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/10 p-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg ring-4 ring-background"
              style={{ background: bgColor }}
            >
              {initials}
            </div>
            <div>
              <SheetTitle className="text-xl font-bold tracking-tight text-foreground">
                {lead.nome_completo}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1.5 opacity-80">
                <Badge variant="outline" className="text-[10px] font-semibold border-primary/20 bg-primary/5 text-primary">
                  {LEAD_STATUS_LABELS[statusVal as keyof typeof LEAD_STATUS_LABELS] || 'Lead'}
                </Badge>
                {lead.telefone && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {lead.telefone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onTimelineRequest && (
              <Button onClick={() => { onOpenChange(false); onTimelineRequest(); }} variant="outline" size="icon" className="h-10 w-10 border-border/20 rounded-[12px]" title="Ver Histórico Conversas">
                <MessageCircle className="w-4 h-4 text-primary" />
              </Button>
            )}
            {onDelete && (
              <Button onClick={() => { onOpenChange(false); onDelete(); }} variant="outline" size="icon" className="h-10 w-10 border-border/20 rounded-[12px] hover:text-destructive hover:bg-destructive/10" title="Excluir Lead">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button onClick={() => { void handleSave(); }} disabled={isSaving} className="shadow-lg shadow-primary/20 rounded-[12px] h-10 px-4">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-8 flex-1">

          {/* Section: Operacional & Triagem (The Core Pivot) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/10 pb-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Triagem & Operação</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Departamento</label>
                <Select value={departamentoVal} onValueChange={setDepartamentoVal}>
                  <SelectTrigger className="bg-muted/30 border-border/10 h-10 rounded-[10px]">
                    <SelectValue placeholder="Selecione o departamento">
                      {selectedDepto ? (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: selectedDepto.cor }} />
                          {selectedDepto.nome}
                        </span>
                      ) : 'Sem departamento'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem departamento</SelectItem>
                    {activeDepartamentos.map(dep => (
                      <SelectItem key={dep.id} value={dep.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: dep.cor }} />
                          {dep.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Responsável (Ownership)</label>
                <Select value={responsavelVal} onValueChange={setResponsavelVal}>
                  <SelectTrigger className="bg-muted/30 border-border/10 h-10 rounded-[10px]">
                    <SelectValue placeholder="Selecione o responsável">
                      {selectedMember ? (
                        <span className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground/50" />
                          {selectedMember.nome_completo}
                        </span>
                      ) : 'Sem responsável'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem responsável</SelectItem>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Status (Kanban)</label>
                <Select value={statusVal} onValueChange={setStatusVal}>
                  <SelectTrigger className="bg-muted/30 border-border/10 h-10 rounded-[10px]">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LEAD.map(s => <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Prioridade</label>
                <Select value={prioridadeVal} onValueChange={(v) => setPrioridadeVal(v as Prioridade)}>
                  <SelectTrigger className="bg-muted/30 border-border/10 h-10 rounded-[10px]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: p.cor }} />
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Conexões & Atendimento */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/10 pb-2">
              <Link2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Conexão & Histórico</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/20 p-4 rounded-[16px] border border-border/5 space-y-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Entrada</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/50" /> {fmtDate(lead.created_at)}
                </p>
              </div>
              <div className="bg-muted/20 p-4 rounded-[16px] border border-border/5 space-y-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Última Interação</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary/50" /> {(lead.last_activity_at ?? lead.ultima_interacao) ? fmtDate(lead.last_activity_at ?? lead.ultima_interacao!) : 'Nenhuma'}
                </p>
              </div>
              <div className="bg-muted/20 p-4 rounded-[16px] border border-border/5 space-y-1 col-span-2">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Origem / Conexão</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary/50" />
                  {lead.origem || 'WhatsApp'} • Instância Padrão
                </p>
              </div>
            </div>
          </div>

          {/* Section: Contexto & Notas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/10 pb-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Observações Internas</h3>
            </div>

            <Textarea
              value={observacoesVal}
              onChange={e => setObservacoesVal(e.target.value)}
              placeholder="Digite o resumo do caso, dores do cliente, ou notas da equipe de triagem..."
              className="resize-none h-32 bg-muted/30 border-border/10 rounded-[16px] p-4 text-sm"
            />
          </div>

          {/* Readonly Lead Data Section */}
          <div className="space-y-4 pb-8">
            <div className="flex items-center gap-2 border-b border-border/10 pb-2">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Dados de Cadastro</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Email</span>
                <span className="font-medium">{lead.email || '—'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Área Jurídica</span>
                <span className="font-medium">{lead.area_juridica || '—'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Valor Idealizado</span>
                <span className="font-medium">{lead.valor_causa ? fmtCurrency(lead.valor_causa) : '—'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Empresa</span>
                <span className="font-medium">{lead.company_name || '—'}</span>
              </div>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LeadDrawer;


import { memo, useMemo, useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { type Lead, type LeadInput } from '@/hooks/useLeads';
import {
  User,
  MoreHorizontal, Pencil, ClipboardList, CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import LeadDrawer from '@/components/forms/LeadDrawer';
import { STATUS_LABELS, STATUS_LEAD } from '@/schemas/leadSchema';
import { type StageColors } from './pipelineConfig';

interface PipelineCardProps {
  lead:         Lead;
  index:        number;
  stageColor:   StageColors;
  onUpdateLead: (id: string, data: Partial<LeadInput>) => Promise<boolean>;
  onRefresh:    () => void;
}

import { getInitials, getAvatarHex, fmtDate } from '@/utils/formatting';

/* ── Component ── */
export const PipelineCard = memo(({ lead, index, stageColor, onUpdateLead, onRefresh }: PipelineCardProps) => {
  const [showEdit,   setShowEdit]   = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showNotes,  setShowNotes]  = useState(false);
  const [showDate,   setShowDate]   = useState(false);

  const [statusVal, setStatusVal] = useState(lead.status ?? 'novo_lead');
  const [notesVal,  setNotesVal]  = useState(lead.observacoes ?? '');
  const [dateVal,   setDateVal]   = useState('');

  const followUpDate = useMemo(() => {
    const meta = (lead.metadata ?? {}) as Record<string, unknown>;
    const raw  = meta.next_followup_at as string | undefined;
    if (!raw) return '';
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }, [lead.metadata]);

  const initials   = useMemo(() => getInitials(lead.nome_completo ?? '?'), [lead.nome_completo]);
  const bgColor    = useMemo(() => getAvatarHex(lead.nome_completo ?? ''),  [lead.nome_completo]);

  const saveStatus = async () => { await onUpdateLead(lead.id, { status: statusVal }); setShowStatus(false); };
  const saveNotes  = async () => { await onUpdateLead(lead.id, { observacoes: notesVal || null }); setShowNotes(false); };
  const saveDate   = async () => {
    const meta = (lead.metadata ?? {}) as Record<string, unknown>;
    await onUpdateLead(lead.id, { metadata: { ...meta, next_followup_at: dateVal ? new Date(dateVal).toISOString() : null } });
    setShowDate(false);
  };

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group relative rounded-[20px] bg-card p-4 transition-all duration-300 cursor-grab active:cursor-grabbing select-none hover:-translate-y-1 ${
            snapshot.isDragging
              ? 'shadow-2xl ring-2 ring-primary rotate-[2deg] scale-[1.03] z-50'
              : 'border border-border/5 hover:border-border/30 shadow-card hover:shadow-lg'
          }`}
        >
          <div className="flex flex-col gap-3">
            {/* ── Top row: avatar + info ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 border-2 border-background shadow-sm"
                  style={{ background: bgColor }}
                >
                  {initials}
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-foreground leading-tight group-hover:text-primary transition-colors duration-200">
                    {lead.nome_completo?.split(' ').slice(0, 2).join(' ')}
                  </h4>
                  {lead.telefone && (
                    <p className="text-[11px] text-muted-foreground/60 font-medium mt-0.5">
                      ***{lead.telefone.slice(-4)}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Dot + Date */}
              <div className="flex items-center gap-1.5 flex-shrink-0 self-start mt-1">
                <span className="text-[11px] font-bold text-muted-foreground/50">
                  {fmtDate(lead.created_at).slice(0, 5)}
                </span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageColor.hex }} />
              </div>
            </div>

            {/* ── Message / Note snippet ── */}
            <div className="pl-3 border-l-2 ml-2 py-0.5" style={{ borderColor: stageColor.hex + '40' }}>
              <p className="text-[12px] text-muted-foreground/80 leading-relaxed line-clamp-2">
                {lead.observacoes || "Novo contato cadastrado na plataforma e aguardando primeira interação."}
              </p>
            </div>

            {/* ── Bottom row: Tags / Values ── */}
            <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/10">
              <div className="flex items-center gap-2 overflow-hidden">
                {lead.responsavel_id && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-[8px] bg-muted/30 border border-border/40">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">
                      —
                    </span>
                  </div>
                )}
                {lead.origem && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-[8px] bg-muted/30 border border-border/40">
                    <ClipboardList className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[60px]">
                      {lead.origem}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Action menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded-[8px] text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                      onPointerDown={e => e.stopPropagation()}
                      aria-label="Opções do lead"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem className="gap-2 text-xs" onClick={() => { setDateVal(followUpDate); setShowDate(true); }}>
                      <CalendarClock className="h-3.5 w-3.5 text-primary" /> Alterar data
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-xs" onClick={() => { setNotesVal(lead.observacoes ?? ''); setShowNotes(true); }}>
                      <ClipboardList className="h-3.5 w-3.5 text-primary" /> Observações
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-xs" onClick={() => { setStatusVal(lead.status ?? 'novo_lead'); setShowStatus(true); }}>
                      <Pencil className="h-3.5 w-3.5 text-primary" /> Alterar status
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-xs" onClick={() => setShowEdit(true)}>
                      <Pencil className="h-3.5 w-3.5 text-primary" /> Editar lead
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Dialogs */}
          {showEdit && (
            <LeadDrawer open={showEdit} onOpenChange={setShowEdit} lead={lead} onSuccess={onRefresh} />
          )}

          <Dialog open={showStatus} onOpenChange={setShowStatus}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Alterar status</DialogTitle>
                <DialogDescription>Atualize o estágio do lead no pipeline.</DialogDescription>
              </DialogHeader>
              <Select value={statusVal} onValueChange={setStatusVal}>
                <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  {STATUS_LEAD.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowStatus(false)}>Cancelar</Button>
                <Button onClick={() => void saveStatus()}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showNotes} onOpenChange={setShowNotes}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Observações</DialogTitle>
                <DialogDescription>Registre detalhes importantes para este lead.</DialogDescription>
              </DialogHeader>
              <Textarea value={notesVal} onChange={e => setNotesVal(e.target.value)} placeholder="Escreva observações relevantes..." rows={5} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNotes(false)}>Cancelar</Button>
                <Button onClick={() => void saveNotes()}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showDate} onOpenChange={setShowDate}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Próximo follow-up</DialogTitle>
                <DialogDescription>Defina a data do próximo contato com o lead.</DialogDescription>
              </DialogHeader>
              <Input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDate(false)}>Cancelar</Button>
                <Button onClick={() => void saveDate()}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </Draggable>
  );
});

PipelineCard.displayName = 'PipelineCard';

export default PipelineCard;

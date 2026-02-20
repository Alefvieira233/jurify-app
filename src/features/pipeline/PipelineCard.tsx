
import { memo, useMemo, useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { type Lead, type LeadInput } from '@/hooks/useLeads';
import {
  User, Phone, Scale, Calendar,
  MoreHorizontal, Pencil, ClipboardList, CalendarClock, GripVertical,
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
import EditarLeadForm from '@/components/forms/EditarLeadForm';
import { STATUS_LABELS, STATUS_LEAD } from '@/schemas/leadSchema';
import { type StageColors } from './PipelineJuridico';

interface PipelineCardProps {
  lead:         Lead;
  index:        number;
  stageColor:   StageColors;
  onUpdateLead: (id: string, data: Partial<LeadInput>) => Promise<boolean>;
  onRefresh:    () => void;
}

/* ── Avatar helpers ── */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

const PALETTE = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#9333ea','#0d9488'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length] ?? PALETTE[0]!;
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

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
  const bgColor    = useMemo(() => avatarColor(lead.nome_completo ?? ''),  [lead.nome_completo]);

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
          className={`group relative rounded-lg border bg-card transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
            snapshot.isDragging
              ? 'shadow-xl border-primary/50 rotate-[0.8deg] scale-[1.02] z-50'
              : 'border-border hover:border-border/60 hover:shadow-md'
          }`}
        >
          {/* Left accent bar (stage color) */}
          <div
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-60"
            style={{ background: stageColor.hex }}
          />

          <div className="p-3 pl-4">

            {/* ── Top row: avatar + name + menu ── */}
            <div className="flex items-start gap-2 mb-2">

              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5 ring-2 ring-background"
                style={{ background: bgColor }}
              >
                {initials}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                  {lead.nome_completo}
                </p>
                {lead.origem && (
                  <span className="text-[10px] text-muted-foreground/50 leading-tight block">
                    {lead.origem}
                  </span>
                )}
              </div>

              {/* Action menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                    aria-label="Opções do lead"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
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

            {/* ── Info rows ── */}
            <div className="space-y-1 mb-2.5">
              {lead.telefone && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                  <Phone className="h-3 w-3 flex-shrink-0" style={{ color: stageColor.hex }} />
                  <span className="truncate">{lead.telefone}</span>
                </div>
              )}
              {lead.area_juridica && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                  <Scale className="h-3 w-3 flex-shrink-0" style={{ color: stageColor.hex }} />
                  <span className="truncate">{lead.area_juridica}</span>
                </div>
              )}
              {lead.responsavel && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{lead.responsavel}</span>
                </div>
              )}
            </div>

            {/* ── Footer: value + date ── */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: lead.valor_causa ? stageColor.textColor : undefined }}
              >
                {lead.valor_causa ? fmtCurrency(Number(lead.valor_causa)) : <span className="text-muted-foreground/30 font-normal">—</span>}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                <Calendar className="h-2.5 w-2.5" />
                <span className="tabular-nums">{fmtDate(lead.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Drag glow border */}
          {snapshot.isDragging && (
            <div className="absolute inset-0 rounded-lg border-2 border-primary/40 pointer-events-none" />
          )}

          {/* Grip indicator (hover only) */}
          <div className="absolute top-1/2 -translate-y-1/2 right-1 opacity-0 group-hover:opacity-30 pointer-events-none transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Dialogs */}
          {showEdit && (
            <EditarLeadForm open={showEdit} onOpenChange={setShowEdit} lead={lead} onSuccess={onRefresh} />
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

export default PipelineCard;

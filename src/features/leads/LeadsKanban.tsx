
import { memo, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { type Lead } from '@/hooks/useLeads';
import { Phone, Scale, User, Calendar, GripVertical, Inbox } from 'lucide-react';

interface LeadsKanbanProps {
  leads:          Lead[];
  onDragEnd:      (result: DropResult) => void;
  onEditLead:     (lead: Lead) => void;
  onViewTimeline: (leadId: string, leadName: string) => void;
}

/* ── Stage config (mirrors Pipeline) ── */
const COLUMNS = [
  { id: 'novo_lead',         title: 'Captação',     hex: '#2563eb', textColor: '#1d4ed8' },
  { id: 'em_qualificacao',   title: 'Qualificação', hex: '#d97706', textColor: '#b45309' },
  { id: 'proposta_enviada',  title: 'Proposta',     hex: '#4f46e5', textColor: '#4338ca' },
  { id: 'contrato_assinado', title: 'Contrato',     hex: '#059669', textColor: '#047857' },
  { id: 'em_atendimento',    title: 'Execução',     hex: '#0284c7', textColor: '#0369a1' },
  { id: 'lead_perdido',      title: 'Arquivados',   hex: '#e11d48', textColor: '#be123c' },
];

/* ── Avatar helpers ── */
const PALETTE = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#9333ea','#0d9488'];
function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return (p[0]?.charAt(0) ?? '?').toUpperCase();
  return ((p[0]?.charAt(0) ?? '') + (p[p.length - 1]?.charAt(0) ?? '')).toUpperCase();
}
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length] ?? PALETTE[0]!;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

/* ── Mini card ── */
const KanbanCard = memo(({ lead, index, hex, textColor, onEdit, onTimeline }: {
  lead:       Lead;
  index:      number;
  hex:        string;
  textColor:  string;
  onEdit:     () => void;
  onTimeline: () => void;
}) => {
  const initials = getInitials(lead.nome_completo ?? '?');
  const bg       = avatarColor(lead.nome_completo ?? '');

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
          {/* Left accent bar */}
          <div
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-60"
            style={{ background: hex }}
          />

          <div className="p-3 pl-4">
            {/* Top row: avatar + name + actions */}
            <div className="flex items-start gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5 ring-2 ring-background"
                style={{ background: bg }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                  {lead.nome_completo}
                </p>
                {lead.origem && (
                  <span className="text-[10px] text-muted-foreground/50 leading-tight block">{lead.origem}</span>
                )}
              </div>
              <button
                type="button"
                className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 text-[10px]"
                onClick={e => { e.stopPropagation(); onEdit(); }}
                onPointerDown={e => e.stopPropagation()}
                aria-label="Editar lead"
              >
                ···
              </button>
            </div>

            {/* Info rows */}
            <div className="space-y-1 mb-2.5">
              {lead.telefone && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                  <Phone className="h-3 w-3 flex-shrink-0" style={{ color: hex }} />
                  <span className="truncate">{lead.telefone}</span>
                </div>
              )}
              {lead.area_juridica && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                  <Scale className="h-3 w-3 flex-shrink-0" style={{ color: hex }} />
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

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: lead.valor_causa ? textColor : undefined }}
              >
                {lead.valor_causa
                  ? fmtCurrency(Number(lead.valor_causa))
                  : <span className="text-muted-foreground/30 font-normal">—</span>
                }
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                <Calendar className="h-2.5 w-2.5" />
                <span className="tabular-nums">{fmtDate(lead.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Drag glow */}
          {snapshot.isDragging && (
            <div className="absolute inset-0 rounded-lg border-2 border-primary/40 pointer-events-none" />
          )}

          {/* Grip indicator */}
          <div className="absolute top-1/2 -translate-y-1/2 right-1 opacity-0 group-hover:opacity-30 pointer-events-none transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
    </Draggable>
  );
});
KanbanCard.displayName = 'KanbanCard';

/* ── Main component ── */
const LeadsKanban = ({ leads, onDragEnd, onEditLead, onViewTimeline }: LeadsKanbanProps) => {
  const grouped = useMemo(() =>
    COLUMNS.reduce((acc, col) => {
      acc[col.id] = leads.filter(l => l.status === col.id);
      return acc;
    }, {} as Record<string, Lead[]>),
  [leads]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full overflow-x-auto overflow-y-hidden">
        {COLUMNS.map((col, colIdx) => {
          const colLeads = grouped[col.id] ?? [];
          return (
            <div
              key={col.id}
              className="flex flex-col min-w-[210px] flex-1 border-r border-border bg-background last:border-r-0"
              style={{ animationDelay: `${colIdx * 0.04}s` }}
            >
              {/* Accent strip */}
              <div className="h-[3px] flex-shrink-0" style={{ background: col.hex }} />

              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-border flex-shrink-0 bg-background">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.hex }} />
                    <h3 className="text-xs font-semibold text-foreground truncate">{col.title}</h3>
                  </div>
                  <span
                    className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: col.hex + '1a', color: col.textColor }}
                  >
                    {colLeads.length}
                  </span>
                </div>
              </div>

              {/* Droppable zone */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 overflow-y-auto p-2 space-y-2 transition-colors duration-150 scrollbar-thin"
                    style={snapshot.isDraggingOver ? { background: col.hex + '0a' } : undefined}
                  >
                    {colLeads.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                          style={{ background: col.hex + '15' }}
                        >
                          <Inbox className="h-4 w-4" style={{ color: col.hex + '80' }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground/40 font-medium">Sem leads</p>
                      </div>
                    )}

                    {colLeads.map((lead, idx) => (
                      <KanbanCard
                        key={lead.id}
                        lead={lead}
                        index={idx}
                        hex={col.hex}
                        textColor={col.textColor}
                        onEdit={() => onEditLead(lead)}
                        onTimeline={() => onViewTimeline(lead.id, lead.nome_completo ?? '')}
                      />
                    ))}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default LeadsKanban;

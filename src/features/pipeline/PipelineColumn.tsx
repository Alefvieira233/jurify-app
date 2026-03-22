
import { memo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { PipelineCard } from './PipelineCard';
import { type Lead, type LeadInput } from '@/hooks/useLeads';
import { type StageColors } from './pipelineConfig';
import { Inbox } from 'lucide-react';

interface Stage { id: string; title: string; color: string; }

interface PipelineColumnProps {
  stage:       Stage;
  colors:      StageColors;
  leads:       Lead[];
  stageIndex:  number;
  onUpdateLead:(id: string, data: Partial<LeadInput>) => Promise<boolean>;
  onRefresh:   () => void;
}

const fmt = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export const PipelineColumn = memo(({ stage, colors, leads, stageIndex, onUpdateLead, onRefresh }: PipelineColumnProps) => {
  const total = leads.reduce((s, l) => s + (Number(l.valor_causa) || 0), 0);

  return (
    <div
      className="flex flex-col min-w-[320px] max-w-[320px] rounded-[24px] overflow-hidden flex-shrink-0 border border-border/5"
      style={{ animationDelay: `${stageIndex * 0.04}s`, backgroundColor: colors.hex + '12' }}
    >
      {/* Column header */}
      <div className="px-5 py-5 flex flex-col justify-between flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Inbox className="w-4 h-4" style={{ color: colors.hex }} />
            <h3 className="text-sm font-bold text-foreground truncate">{stage.title}</h3>
          </div>
          <span
            className="text-[12px] font-bold tabular-nums px-2 py-1 rounded-full flex-shrink-0"
            style={{ background: colors.hex, color: '#fff' }}
          >
            {leads.length}
          </span>
        </div>
        {/* Total value */}
        {total > 0 && (
          <div className="mt-3 flex items-center gap-1.5 opacity-70">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.hex }} />
            <p className="text-[11px] font-semibold" style={{ color: colors.textColor }}>{fmt(total)}</p>
          </div>
        )}
      </div>

      {/* Droppable zone */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 transition-colors duration-200 scrollbar-hide"
            style={snapshot.isDraggingOver ? { background: colors.hex + '20' } : undefined}
          >
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                  style={{ background: colors.hex + '15' }}
                >
                  <Inbox className="h-4 w-4" style={{ color: colors.hex + '80' }} />
                </div>
                <p className="text-[10px] text-muted-foreground/40 font-medium">Sem leads</p>
              </div>
            )}

            {leads.map((lead, idx) => (
              <PipelineCard
                key={lead.id}
                lead={lead}
                index={idx}
                stageColor={colors}
                onUpdateLead={onUpdateLead}
                onRefresh={onRefresh}
              />
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
});

export default PipelineColumn;


import { memo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { PipelineCard } from './PipelineCard';
import { type Lead, type LeadInput } from '@/hooks/useLeads';
import { type StageColors } from './PipelineJuridico';
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
      className="flex flex-col min-w-[210px] flex-1 border-r border-border bg-background last:border-r-0"
      style={{ animationDelay: `${stageIndex * 0.04}s` }}
    >
      {/* Stage color accent strip */}
      <div className="h-[3px] flex-shrink-0" style={{ background: colors.hex }} />

      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-border flex-shrink-0 bg-background">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: colors.hex }}
            />
            <h3 className="text-xs font-semibold text-foreground truncate">{stage.title}</h3>
          </div>
          <span
            className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: colors.hex + '1a', color: colors.textColor }}
          >
            {leads.length}
          </span>
        </div>
        {/* Total value */}
        <p className="text-[10px] text-muted-foreground mt-1 pl-3.5 tabular-nums">
          {total > 0 ? fmt(total) : <span className="opacity-40">—</span>}
        </p>
      </div>

      {/* Droppable zone */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-2 space-y-2 transition-colors duration-150 scrollbar-thin"
            style={snapshot.isDraggingOver ? { background: colors.hex + '0a' } : undefined}
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

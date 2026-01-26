import { memo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { PipelineCard } from './PipelineCard';
import { type Lead } from '@/hooks/useLeads';

interface Stage {
    id: string;
    title: string;
    color: string;
}

interface PipelineColumnProps {
    stage: Stage;
    leads: Lead[];
    stageIndex: number;
}

export const PipelineColumn = memo(({ stage, leads, stageIndex }: PipelineColumnProps) => {
    return (
        <div
            className="flex flex-col h-full bg-card border-r border-border transition-all duration-700 hover:bg-muted/30 scrollbar-premium reveal-up"
            style={{
                animationDelay: `${stageIndex * 0.15}s`,
                minHeight: '600px'
            }}
        >
            {/* Header Column */}
            <div className="p-8 border-b border-border bg-card/50">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {stage.title}
                    </h3>
                    <div className="px-3 py-1 bg-foreground/5 border border-border">
                        <span className="text-[10px] font-black text-primary">{leads.length}</span>
                    </div>
                </div>
                <div className="h-[2px] w-8 bg-primary/40" />
            </div>

            <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-6 space-y-6 transition-all duration-300 overflow-y-auto ${snapshot.isDraggingOver ? 'bg-primary/5' : ''
                            }`}
                    >
                        {leads.map((lead, index) => (
                            <PipelineCard key={lead.id} lead={lead} index={index} />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
});

export default PipelineColumn;

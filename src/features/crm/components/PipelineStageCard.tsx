import { memo } from 'react';
import type { PipelineStage } from '@/hooks/useCRMPipeline';
import { fmtCurrency as fmt } from '@/utils/formatting';

export interface PipelineStageCardProps {
  stage: PipelineStage;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const PipelineStageCard = memo(({ stage, isSelected, onToggle }: PipelineStageCardProps) => (
  <button
    onClick={() => onToggle(stage.id)}
    className={`flex-shrink-0 min-w-[130px] p-3 rounded-lg border text-left transition-all duration-150 ${
      isSelected
        ? 'ring-2 ring-primary/40 shadow-md scale-[1.02]'
        : 'hover:shadow-sm hover:scale-[1.01]'
    }`}
    style={{ borderColor: stage.color + '30', background: stage.color + '08' }}
  >
    <div className="flex items-center gap-1.5 mb-2">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
      <p className="text-[11px] font-medium text-muted-foreground truncate">{stage.name}</p>
    </div>
    <p className="text-xl font-bold tabular-nums leading-none" style={{ color: stage.color }}>
      {stage.lead_count || 0}
    </p>
    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
      {fmt(stage.total_value || 0)}
    </p>
  </button>
));

PipelineStageCard.displayName = 'PipelineStageCard';

export default PipelineStageCard;

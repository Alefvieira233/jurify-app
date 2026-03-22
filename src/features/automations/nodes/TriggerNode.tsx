import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TRIGGER_LABELS: Record<string, string> = {
  novo_lead: 'Novo Lead',
  status_alterado: 'Status Alterado',
  departamento_alterado: 'Departamento Alterado',
  lead_quente: 'Lead Quente',
  agendamento_criado: 'Agendamento Criado',
  contrato_assinado: 'Contrato Assinado',
  webhook: 'Webhook',
  manual: 'Manual',
  timer: 'Timer',
};

interface TriggerNodeData {
  label: string;
  triggerType?: string;
  active?: boolean;
  [key: string]: unknown;
}

function TriggerNodeComponent({ data, selected }: NodeProps & { data: TriggerNodeData }) {
  const isActive = data.active !== false;

  return (
    <div
      className={`
        relative min-w-[200px] rounded-[16px] border px-4 py-3
        bg-background/95 backdrop-blur-xl
        ${isActive
          ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/20'
          : 'border-border/10'
        }
        ${selected ? 'ring-2 ring-emerald-400/60' : ''}
        transition-all duration-200
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-emerald-500/15">
          <Zap className="h-4 w-4 text-emerald-400" />
        </div>
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Gatilho
        </span>
      </div>

      <p className="text-sm font-medium text-foreground truncate mb-1.5">
        {data.label || 'Novo Gatilho'}
      </p>

      {data.triggerType && (
        <Badge
          variant="outline"
          className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20 rounded-[6px]"
        >
          {TRIGGER_LABELS[data.triggerType] ?? data.triggerType}
        </Badge>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-emerald-600 !rounded-full"
      />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
export default TriggerNode;

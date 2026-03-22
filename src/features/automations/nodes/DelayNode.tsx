import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DELAY_LABELS: Record<string, string> = {
  '5min': '5 minutos',
  '15min': '15 minutos',
  '30min': '30 minutos',
  '1h': '1 hora',
  '2h': '2 horas',
  '6h': '6 horas',
  '12h': '12 horas',
  '24h': '24 horas',
  '48h': '48 horas',
  '72h': '72 horas',
};

interface DelayNodeData {
  label: string;
  delay?: string;
  [key: string]: unknown;
}

function DelayNodeComponent({ data, selected }: NodeProps & { data: DelayNodeData }) {
  return (
    <div
      className={`
        relative min-w-[200px] rounded-[16px] border px-4 py-3
        bg-background/95 backdrop-blur-xl
        border-purple-500/40 shadow-lg shadow-purple-500/20
        ${selected ? 'ring-2 ring-purple-400/60' : ''}
        transition-all duration-200
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-purple-600 !rounded-full"
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-purple-500/15">
          <Clock className="h-4 w-4 text-purple-400" />
        </div>
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Espera
        </span>
      </div>

      <p className="text-sm font-medium text-foreground truncate mb-1.5">
        {data.label || 'Aguardar'}
      </p>

      {data.delay && (
        <Badge
          variant="outline"
          className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20 rounded-[6px]"
        >
          {DELAY_LABELS[data.delay] ?? data.delay}
        </Badge>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-purple-600 !rounded-full"
      />
    </div>
  );
}

export const DelayNode = memo(DelayNodeComponent);
export default DelayNode;

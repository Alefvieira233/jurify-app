import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ACTION_LABELS: Record<string, string> = {
  enviar_whatsapp: 'Enviar WhatsApp',
  enviar_email: 'Enviar E-mail',
  atribuir_responsavel: 'Atribuir Responsável',
  alterar_status: 'Alterar Status',
  alterar_prioridade: 'Alterar Prioridade',
  adicionar_tag: 'Adicionar Tag',
  mover_departamento: 'Mover Departamento',
  criar_agendamento: 'Criar Agendamento',
  executar_agente: 'Executar Agente IA',
  chamar_webhook: 'Chamar Webhook',
  notificar_equipe: 'Notificar Equipe',
};

interface ActionNodeData {
  label: string;
  actionType?: string;
  [key: string]: unknown;
}

function ActionNodeComponent({ data, selected }: NodeProps & { data: ActionNodeData }) {
  return (
    <div
      className={`
        relative min-w-[200px] rounded-[16px] border px-4 py-3
        bg-background/95 backdrop-blur-xl
        border-primary/40 shadow-lg shadow-primary/20
        ${selected ? 'ring-2 ring-primary/60' : ''}
        transition-all duration-200
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary !border-2 !border-primary/60 !rounded-full"
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary/15">
          <Play className="h-4 w-4 text-primary" />
        </div>
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Ação
        </span>
      </div>

      <p className="text-sm font-medium text-foreground truncate mb-1.5">
        {data.label || 'Nova Ação'}
      </p>

      {data.actionType && (
        <Badge
          variant="outline"
          className="text-[10px] bg-primary/10 text-primary border-primary/20 rounded-[6px]"
        >
          {ACTION_LABELS[data.actionType] ?? data.actionType}
        </Badge>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary !border-2 !border-primary/60 !rounded-full"
      />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
export default ActionNode;

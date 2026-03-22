import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

interface ConditionNodeData {
  label: string;
  campo?: string;
  operador?: string;
  valor?: string;
  [key: string]: unknown;
}

const CAMPO_LABELS: Record<string, string> = {
  status: 'Status',
  prioridade: 'Prioridade',
  temperatura: 'Temperatura',
  area_juridica: 'Área Jurídica',
  departamento_id: 'Departamento',
  valor_causa: 'Valor da Causa',
  origem: 'Origem',
};

const OPERADOR_LABELS: Record<string, string> = {
  igual: '=',
  diferente: '≠',
  contem: 'contém',
  nao_contem: 'não contém',
  maior_que: '>',
  menor_que: '<',
  vazio: 'vazio',
  nao_vazio: 'não vazio',
  mudou_para: '→',
  mudou_de: '←',
};

function ConditionNodeComponent({ data, selected }: NodeProps & { data: ConditionNodeData }) {
  const summary = data.campo
    ? `${CAMPO_LABELS[data.campo] ?? data.campo} ${OPERADOR_LABELS[data.operador ?? ''] ?? ''} ${data.valor ?? ''}`
    : null;

  return (
    <div
      className={`
        relative min-w-[220px] rounded-[16px] border px-4 py-3
        bg-background/95 backdrop-blur-xl
        border-amber-500/40 shadow-lg shadow-amber-500/20
        ${selected ? 'ring-2 ring-amber-400/60' : ''}
        transition-all duration-200
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-amber-600 !rounded-full"
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-amber-500/15">
          <GitBranch className="h-4 w-4 text-amber-400" />
        </div>
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Condição
        </span>
      </div>

      <p className="text-sm font-medium text-foreground truncate mb-1">
        {data.label || 'Nova Condição'}
      </p>

      {summary && (
        <p className="text-[11px] text-muted-foreground truncate">
          {summary}
        </p>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-emerald-600 !rounded-full !left-[30%]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-red-600 !rounded-full !left-[70%]"
      />

      {/* Handle labels */}
      <div className="absolute -bottom-5 left-[30%] -translate-x-1/2 text-[9px] text-emerald-400 font-bold">
        SIM
      </div>
      <div className="absolute -bottom-5 left-[70%] -translate-x-1/2 text-[9px] text-red-400 font-bold">
        NÃO
      </div>
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
export default ConditionNode;

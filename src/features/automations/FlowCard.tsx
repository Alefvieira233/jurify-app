import { Activity, Clock, Edit, Trash2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AutomationFlow {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  status: 'rascunho' | 'ativo' | 'pausado' | 'arquivado';
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  viewport: { x: number; y: number; zoom: number };
  execucoes_total: number;
  ultima_execucao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlowNode {
  id: string;
  flow_id: string;
  tipo: string;
  label: string;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
}

export interface FlowEdge {
  id: string;
  flow_id: string;
  source_node: string;
  target_node: string;
  source_handle: string | null;
  label: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  novo: 'Novo Lead',
  status_alterado: 'Status Alterado',
  departamento_alterado: 'Dept. Alterado',
  lead_quente: 'Lead Quente',
  agendamento_criado: 'Agendamento',
  ganho: 'Ganho',
  webhook: 'Webhook',
  manual: 'Manual',
  timer: 'Timer',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  rascunho: {
    label: 'Rascunho',
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
  ativo: {
    label: 'Ativo',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  pausado: {
    label: 'Pausado',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  arquivado: {
    label: 'Arquivado',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return 'Nunca';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── FlowCard ────────────────────────────────────────────────────────────────

interface FlowCardProps {
  flow: AutomationFlow;
  onEdit: (id: string) => void;
  onDelete: (id: string, label: string) => void;
}

export function FlowCard({ flow, onEdit, onDelete }: FlowCardProps) {
  const statusBadge = STATUS_BADGES[flow.status] ?? {
    label: 'Rascunho',
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  };

  return (
    <div
      className="group relative rounded-[20px] border border-border/10 bg-background/95 backdrop-blur-xl
                 p-5 hover:border-border/20 transition-all duration-200 cursor-pointer"
      onClick={() => onEdit(flow.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(flow.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <Badge
          variant="outline"
          className={`text-[10px] rounded-full ${statusBadge.className}`}
        >
          {flow.status === 'ativo' && (
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
          {statusBadge.label}
        </Badge>

        <Badge
          variant="outline"
          className="text-[10px] bg-muted/30 text-muted-foreground border-border/10 rounded-full"
        >
          <Zap className="h-3 w-3 mr-1" />
          {TRIGGER_LABELS[flow.trigger_type] ?? flow.trigger_type}
        </Badge>
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-foreground mb-1 truncate">
        {flow.nome}
      </h3>
      {flow.descricao && (
        <p className="text-[11px] text-muted-foreground truncate mb-3">
          {flow.descricao}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-auto pt-3 border-t border-border/5">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          <span>{flow.execucoes_total} execuções</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatDate(flow.ultima_execucao)}</span>
        </div>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-[8px] bg-muted/30 hover:bg-muted/50"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(flow.id);
          }}
          aria-label="Editar fluxo"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-[8px] bg-muted/30 hover:bg-red-500/20 hover:text-red-400"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(flow.id, flow.nome);
          }}
          aria-label="Excluir fluxo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

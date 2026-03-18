import { useLeadHistorico } from '@/hooks/useLeadHistorico';
import type { TipoEventoHistorico } from '@/types/crm-operacional';
import {
  ArrowRight,
  UserPlus,
  Archive,
  RotateCcw,
  Tag,
  TagsIcon,
  StickyNote,
  AlertTriangle,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface LeadDrawerHistoricoProps {
  leadId: string;
}

const eventoIcons: Record<TipoEventoHistorico, LucideIcon> = {
  status_alterado: RefreshCw,
  departamento_alterado: ArrowRight,
  responsavel_alterado: UserPlus,
  prioridade_alterada: AlertTriangle,
  tag_adicionada: Tag,
  tag_removida: TagsIcon,
  arquivado: Archive,
  reativado: RotateCcw,
  propriedade_alterada: Edit3,
  nota_adicionada: StickyNote,
};

const eventoColors: Record<TipoEventoHistorico, string> = {
  status_alterado: 'text-amber-500',
  departamento_alterado: 'text-violet-500',
  responsavel_alterado: 'text-blue-500',
  prioridade_alterada: 'text-red-500',
  tag_adicionada: 'text-emerald-500',
  tag_removida: 'text-gray-500',
  arquivado: 'text-rose-600',
  reativado: 'text-green-600',
  propriedade_alterada: 'text-indigo-500',
  nota_adicionada: 'text-teal-500',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d atrás`;
  const diffM = Math.floor(diffD / 30);
  return `${diffM} mês${diffM > 1 ? 'es' : ''} atrás`;
}

function buildDescription(entry: {
  tipo_evento: TipoEventoHistorico;
  descricao: string | null;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  usuario_nome: string | null;
}): string {
  if (entry.descricao) return entry.descricao;

  const actor = entry.usuario_nome ?? 'Sistema';

  switch (entry.tipo_evento) {
    case 'status_alterado':
      return `${actor} alterou status de "${entry.valor_anterior ?? '—'}" para "${entry.valor_novo ?? '—'}"`;
    case 'departamento_alterado':
      return `${actor} moveu para departamento "${entry.valor_novo ?? '—'}"`;
    case 'responsavel_alterado':
      return `${actor} alterou responsável para "${entry.valor_novo ?? '—'}"`;
    case 'prioridade_alterada':
      return `${actor} alterou prioridade para "${entry.valor_novo ?? '—'}"`;
    case 'tag_adicionada':
      return `${actor} adicionou tag "${entry.valor_novo ?? '—'}"`;
    case 'tag_removida':
      return `${actor} removeu tag "${entry.valor_anterior ?? '—'}"`;
    case 'arquivado':
      return `${actor} arquivou o lead`;
    case 'reativado':
      return `${actor} reativou o lead`;
    case 'propriedade_alterada':
      return `${actor} alterou ${entry.campo ?? 'propriedade'}`;
    case 'nota_adicionada':
      return `${actor} adicionou uma nota`;
    default:
      return `${actor} realizou uma ação`;
  }
}

export default function LeadDrawerHistorico({ leadId }: LeadDrawerHistoricoProps) {
  const { data: historico, isLoading } = useLeadHistorico(leadId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={`skeleton-${i}`} className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!historico || historico.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Nenhum histórico registrado
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-3 top-3 bottom-3 w-px bg-border" />

      <div className="space-y-4">
        {historico.map((entry) => {
          const Icon = eventoIcons[entry.tipo_evento] ?? RefreshCw;
          const colorClass = eventoColors[entry.tipo_evento] ?? 'text-gray-500';

          return (
            <div key={entry.id} className="flex gap-3 relative">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background border z-10 ${colorClass}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm leading-snug">
                  {buildDescription(entry)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {timeAgo(entry.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

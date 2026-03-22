import { memo, useMemo } from 'react';
import type { DraggableProvided } from '@hello-pangea/dnd';
import type { Lead } from '@/hooks/useLeads';
import { Phone, Clock } from 'lucide-react';
import { getInitials, getAvatarHex } from '@/utils/formatting';
import { Badge } from '@/components/ui/badge';

interface KanbanCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  provided: DraggableProvided;
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d`;
  const diffM = Math.floor(diffD / 30);
  return `${diffM}mo`;
}

function maskPhone(tel: string | null | undefined): string {
  if (!tel) return '';
  const digits = tel.replace(/\D/g, '');
  if (digits.length < 4) return tel;
  return `\u2022\u2022\u2022\u2022\u2022 ${digits.slice(-4)}`;
}

const PRIORIDADE_STYLE: Record<string, { label: string; className: string }> = {
  urgente: { label: 'Urgente', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  alta:    { label: 'Alta',    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

export const KanbanCard = memo(({ lead, onClick, provided }: KanbanCardProps) => {
  const initials = useMemo(() => getInitials(lead.nome_completo ?? '?'), [lead.nome_completo]);
  const bgColor = useMemo(() => getAvatarHex(lead.nome_completo ?? ''), [lead.nome_completo]);
  const relTime = useMemo(
    () => formatRelativeTime(lead.ultima_interacao ?? lead.created_at),
    [lead.ultima_interacao, lead.created_at],
  );
  const prioridade = PRIORIDADE_STYLE[lead.prioridade];

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => onClick(lead)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(lead); }}
      className="p-3 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow cursor-pointer select-none"
    >
      {/* Top: avatar + name */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
          style={{ background: bgColor }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-snug line-clamp-1">
            {lead.nome_completo ?? lead.nome ?? 'Sem nome'}
          </p>
          {lead.responsavel_id && (
            <p className="text-[10px] text-muted-foreground/60 truncate">—</p>
          )}
        </div>
      </div>

      {/* Phone */}
      {lead.telefone && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 mb-1.5">
          <Phone className="h-3 w-3 shrink-0" />
          <span>{maskPhone(lead.telefone)}</span>
        </div>
      )}

      {/* Bottom row: badges + time */}
      <div className="flex items-center justify-between gap-1 mt-1">
        <div className="flex items-center gap-1 min-w-0">
          {prioridade && (
            <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-4 font-medium ${prioridade.className}`}>
              {prioridade.label}
            </Badge>
          )}
        </div>
        {relTime && (
          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground/50 shrink-0">
            <Clock className="h-2.5 w-2.5" />
            <span>{relTime}</span>
          </div>
        )}
      </div>
    </div>
  );
});

KanbanCard.displayName = 'KanbanCard';

export default KanbanCard;

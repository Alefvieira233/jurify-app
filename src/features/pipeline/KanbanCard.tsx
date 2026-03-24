import { memo, useMemo } from 'react';
import type { DraggableProvided } from '@hello-pangea/dnd';
import type { Lead } from '@/hooks/useLeads';
import type { Tag } from '@/types/crm-operacional';
import { Phone, Clock, MessageSquare, Wifi } from 'lucide-react';
import { getInitials, getAvatarHex } from '@/utils/formatting';
import { Badge } from '@/components/ui/badge';

interface KanbanCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  provided: DraggableProvided;
  /** Tags assigned to this lead (resolved from lead_tags) */
  tags?: Tag[];
  /** Connection name for this lead */
  conexaoNome?: string;
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
  baixa:   { label: 'Baixa',   className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
  media:   { label: 'Média',   className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  alta:    { label: 'Alta',    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  urgente: { label: 'Urgente', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const MAX_VISIBLE_TAGS = 3;

export const KanbanCard = memo(({ lead, onClick, provided, tags, conexaoNome }: KanbanCardProps) => {
  const initials = useMemo(() => getInitials(lead.nome_completo ?? '?'), [lead.nome_completo]);
  const bgColor = useMemo(() => getAvatarHex(lead.nome_completo ?? ''), [lead.nome_completo]);
  const relTime = useMemo(
    () => formatRelativeTime(lead.ultima_interacao ?? lead.created_at),
    [lead.ultima_interacao, lead.created_at],
  );
  const prioridade = PRIORIDADE_STYLE[lead.prioridade];

  // Message preview: use mensagem_inicial or proxima_acao as fallback
  const messagePreview = lead.mensagem_inicial ?? lead.proxima_acao ?? null;
  const truncatedPreview = messagePreview
    ? messagePreview.length > 60 ? `${messagePreview.slice(0, 57)}...` : messagePreview
    : null;

  // Tags to display
  const visibleTags = tags?.slice(0, MAX_VISIBLE_TAGS) ?? [];
  const extraTagCount = (tags?.length ?? 0) - MAX_VISIBLE_TAGS;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => onClick(lead)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(lead); }}
      className="p-3 rounded-lg border border-border bg-card hover:shadow-md hover:border-primary/20 transition-all cursor-pointer select-none group"
    >
      {/* Top: avatar + name + priority */}
      <div className="flex items-start gap-2 mb-1.5">
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
          {lead.telefone && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-0.5">
              <Phone className="h-2.5 w-2.5 shrink-0" />
              <span>{maskPhone(lead.telefone)}</span>
            </div>
          )}
        </div>
        {prioridade && (
          <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-4 font-medium shrink-0 ${prioridade.className}`}>
            {prioridade.label}
          </Badge>
        )}
      </div>

      {/* Message preview */}
      {truncatedPreview && (
        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/60 mb-1.5 pl-9">
          <MessageSquare className="h-2.5 w-2.5 shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-relaxed">{truncatedPreview}</span>
        </div>
      )}

      {/* Tags */}
      {visibleTags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pl-9 mb-1.5">
          {visibleTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[9px] font-medium"
              style={{ backgroundColor: `${tag.cor}20` }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
              <span className="truncate max-w-[80px]">{tag.nome}</span>
            </span>
          ))}
          {extraTagCount > 0 && (
            <span className="text-[9px] text-muted-foreground/50 font-medium">+{extraTagCount}</span>
          )}
        </div>
      )}

      {/* Bottom row: conexao + time */}
      <div className="flex items-center justify-between gap-1 mt-1 pl-9">
        <div className="flex items-center gap-1.5 min-w-0">
          {conexaoNome && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50 max-w-[140px]">
              <Wifi className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{conexaoNome}</span>
            </div>
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

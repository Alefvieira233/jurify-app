/**
 * ProcessoTimeline — visual timeline of tribunal movements (andamentos).
 *
 * Data: `useProcessoAndamentos(processoId)` hook.
 * Sync: "Sincronizar agora" button invokes the `tribunal-sync` edge function,
 *       which fetches from the configured provider (Escavador by default).
 */

import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  FileText,
  Gavel,
  MessageSquare,
  RefreshCw,
  Scale,
  Scroll,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useProcessoAndamentos, type ProcessoAndamento } from '../hooks/useProcessoAndamentos';

const TIPO_ICON: Record<NonNullable<ProcessoAndamento['tipo']>, typeof FileText> = {
  movimento: Scroll,
  decisao: Gavel,
  despacho: FileText,
  audiencia: Users,
  sentenca: Scale,
  other: MessageSquare,
};

const TIPO_LABEL: Record<NonNullable<ProcessoAndamento['tipo']>, string> = {
  movimento: 'Movimento',
  decisao: 'Decisão',
  despacho: 'Despacho',
  audiencia: 'Audiência',
  sentenca: 'Sentença',
  other: 'Outro',
};

const TIPO_COLOR: Record<NonNullable<ProcessoAndamento['tipo']>, string> = {
  movimento: 'bg-slate-500/10 text-slate-600',
  decisao: 'bg-indigo-500/10 text-indigo-600',
  despacho: 'bg-blue-500/10 text-blue-600',
  audiencia: 'bg-amber-500/10 text-amber-600',
  sentenca: 'bg-emerald-500/10 text-emerald-600',
  other: 'bg-slate-500/10 text-slate-600',
};

function fmtRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return iso;
  }
}

function fmtAbsolute(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

interface ProcessoTimelineProps {
  processoId: string;
}

const ProcessoTimelineRow = memo(({ a }: { a: ProcessoAndamento }) => {
  const tipo = a.tipo ?? 'other';
  const Icon = TIPO_ICON[tipo];
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${TIPO_COLOR[tipo]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="mt-1 w-px flex-1 bg-border" aria-hidden />
      </div>
      <div className="flex-1 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {TIPO_LABEL[tipo]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {fmtAbsolute(a.data_andamento)} · {fmtRelative(a.data_andamento)}
          </span>
        </div>
        <p className="mt-1 text-sm leading-snug">{a.descricao}</p>
        {a.orgao && (
          <p className="mt-0.5 text-xs text-muted-foreground">{a.orgao}</p>
        )}
      </div>
    </li>
  );
});
ProcessoTimelineRow.displayName = 'ProcessoTimelineRow';

const ProcessoTimeline = ({ processoId }: ProcessoTimelineProps) => {
  const { andamentos, loading, error, syncNow, syncing } = useProcessoAndamentos(processoId);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Andamentos do tribunal</h3>
          <p className="text-xs text-muted-foreground">
            Movimentações sincronizadas com o provider configurado.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={syncNow}
          disabled={syncing}
          aria-label="Sincronizar andamentos com o tribunal"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Erro ao carregar andamentos</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        </div>
      )}

      {!loading && !error && andamentos.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-muted-foreground">
          <Scroll className="h-8 w-8 opacity-40" />
          <p className="text-sm">Nenhum andamento sincronizado ainda.</p>
          <p className="text-xs">Clique em "Sincronizar agora" para buscar do tribunal.</p>
        </div>
      )}

      {!loading && !error && andamentos.length > 0 && (
        <ol className="mt-2">
          {andamentos.map((a) => (
            <ProcessoTimelineRow key={a.id} a={a} />
          ))}
        </ol>
      )}
    </div>
  );
};

export default memo(ProcessoTimeline);

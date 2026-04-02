import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ConexaoLog } from '@/hooks/useConexoes';
import { SEVERITY_STYLES } from './connectionDetailsTypes';

interface ConnectionLogsTabProps {
  logs: ConexaoLog[];
  isLoading: boolean;
}

function LogEntry({ log }: { log: ConexaoLog }) {
  const severity = SEVERITY_STYLES[log.severidade] || SEVERITY_STYLES.info;
  const time = new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="flex gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex flex-col items-center text-xs text-muted-foreground shrink-0 w-12">
        <span>{time}</span>
        <span className="text-[10px]">{date}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', severity)}>
            {log.severidade}
          </Badge>
          <span className="text-xs font-medium text-foreground truncate">{log.evento}</span>
        </div>
        {log.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{log.descricao}</p>
        )}
        {log.origem && (
          <span className="text-[10px] text-muted-foreground/70">via {log.origem}</span>
        )}
      </div>
    </div>
  );
}

const ConnectionLogsTab = ({ logs, isLoading }: ConnectionLogsTabProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum log registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <LogEntry key={log.id} log={log} />
      ))}
    </div>
  );
};

export default ConnectionLogsTab;

import { Bell, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ConexaoAlerta } from '@/hooks/useConexoes';
import { SEVERITY_STYLES, ALERTA_TYPE_LABELS, formatRelativeTime } from './connectionDetailsTypes';

interface ConnectionAlertasTabProps {
  alertas: ConexaoAlerta[];
  isLoading: boolean;
  onResolverAlerta: (alertaId: string) => void;
}

function AlertaCard({ alerta, onResolver }: { alerta: ConexaoAlerta; onResolver: () => void }) {
  const severityStyle = SEVERITY_STYLES[alerta.severidade] || SEVERITY_STYLES.info;
  const typeLabel = ALERTA_TYPE_LABELS[alerta.tipo] || alerta.tipo;

  return (
    <div className="p-3 rounded-lg border space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', severityStyle)}>
          {alerta.severidade}
        </Badge>
        <span className="text-xs font-medium text-foreground">{typeLabel}</span>
        {alerta.lido && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Lido
          </Badge>
        )}
        {alerta.resolvido && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 bg-green-50 dark:bg-green-900/30 gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Resolvido
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{alerta.mensagem}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/70">
          {formatRelativeTime(alerta.created_at)}
        </span>
        {!alerta.resolvido && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1 text-green-600 hover:text-green-700"
            onClick={onResolver}
          >
            <CheckCircle2 className="h-3 w-3" />
            Marcar como resolvido
          </Button>
        )}
      </div>
    </div>
  );
}

const ConnectionAlertasTab = ({ alertas, isLoading, onResolverAlerta }: ConnectionAlertasTabProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (alertas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum alerta registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alertas.map((alerta) => (
        <AlertaCard
          key={alerta.id}
          alerta={alerta}
          onResolver={() => { onResolverAlerta(alerta.id); }}
        />
      ))}
    </div>
  );
};

export default ConnectionAlertasTab;

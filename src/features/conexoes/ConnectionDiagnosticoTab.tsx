import { Loader2, Shield, CheckCircle2, XCircle, Settings, Key, Phone, User, Signal, Database, Activity, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type DiagnosticoResult, type DiagnoseCheck, DIAGNOSE_CHECK_LABELS } from './connectionDetailsTypes';

interface ConnectionDiagnosticoTabProps {
  diagLoading: boolean;
  diagResult: DiagnosticoResult | null;
  onRunDiagnostico: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  settings: <Settings className="h-3 w-3" />,
  key:      <Key className="h-3 w-3" />,
  phone:    <Phone className="h-3 w-3" />,
  user:     <User className="h-3 w-3" />,
  signal:   <Signal className="h-3 w-3" />,
  database: <Database className="h-3 w-3" />,
  activity: <Activity className="h-3 w-3" />,
  shield:   <ShieldCheck className="h-3 w-3" />,
};

function CheckItem({ checkKey, check }: { checkKey: string; check: DiagnoseCheck }) {
  const meta = DIAGNOSE_CHECK_LABELS[checkKey];
  const label = meta?.label ?? checkKey;
  const icon = meta?.icon ? ICON_MAP[meta.icon] : null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className={cn(
        'mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-white text-xs shrink-0',
        check.ok ? 'bg-green-500' : 'bg-red-500',
      )}>
        {check.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <p className="text-sm font-medium">{label}</p>
        </div>
        <p className={cn('text-xs mt-0.5', check.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
          {check.detail}
        </p>
      </div>
    </div>
  );
}

function OverallHealthBadge({ healthy, checks }: { healthy: boolean; checks: Record<string, DiagnoseCheck> }) {
  const failedCount = Object.values(checks).filter(c => !c.ok).length;
  const totalCount = Object.keys(checks).length;
  const passedCount = totalCount - failedCount;

  if (healthy) {
    return (
      <div className="p-4 rounded-lg border text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-300">
            Integração saudável
          </span>
        </div>
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
          {passedCount}/{totalCount} verificações OK
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border text-center bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
      <div className="flex items-center justify-center gap-2">
        <XCircle className="h-5 w-5 text-red-600" />
        <span className="text-sm font-semibold text-red-700 dark:text-red-300">
          {failedCount === 1 ? '1 problema encontrado' : `${failedCount} problemas encontrados`}
        </span>
      </div>
      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
        {passedCount}/{totalCount} verificações OK
      </p>
    </div>
  );
}

const ConnectionDiagnosticoTab = ({ diagLoading, diagResult, onRunDiagnostico }: ConnectionDiagnosticoTabProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Painel de Diagnóstico</h4>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={diagLoading}
          onClick={onRunDiagnostico}
        >
          {diagLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
          {diagLoading ? 'Verificando...' : 'Executar diagnóstico'}
        </Button>
      </div>

      {diagLoading && !diagResult && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Verificando toda a cadeia de integração...</p>
          <p className="text-xs text-muted-foreground mt-1">API Key, Kapso, Webhook, Conexão</p>
        </div>
      )}

      {diagResult && (
        <div className="space-y-4">
          <OverallHealthBadge healthy={diagResult.healthy} checks={diagResult.checks} />

          <div className="space-y-2">
            {Object.entries(diagResult.checks).map(([key, check]) => (
              <CheckItem key={key} checkKey={key} check={check} />
            ))}
          </div>

          {diagResult.timestamp && (
            <p className="text-[11px] text-muted-foreground text-center">
              Verificado em {new Date(diagResult.timestamp).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}

      {!diagLoading && !diagResult && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            Verifica API key, número conectado, webhook e estado da conexão
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em "Executar diagnóstico" para iniciar
          </p>
        </div>
      )}
    </div>
  );
};

export default ConnectionDiagnosticoTab;

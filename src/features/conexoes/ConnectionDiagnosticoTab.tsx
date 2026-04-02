import { Loader2, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate, type DiagnosticoResult } from './connectionDetailsTypes';
import { formatRelativeTime } from './connectionDetailsTypes';

interface ConnectionDiagnosticoTabProps {
  diagLoading: boolean;
  diagResult: DiagnosticoResult | null;
  onRunDiagnostico: () => void;
}

function DiagnosticoItem({
  label, ok, unknown, valueOk, valueFail,
}: {
  label: string;
  ok: boolean;
  unknown?: boolean;
  valueOk: string;
  valueFail: string;
}) {
  const isUnknown = unknown === true;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className={cn(
        'mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-white text-xs',
        isUnknown ? 'bg-slate-400' : ok ? 'bg-green-500' : 'bg-red-500',
      )}>
        {isUnknown ? '?' : ok ? <CheckCircle2 className="h-3 w-3" /> : '!'}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className={cn('text-xs', isUnknown ? 'text-muted-foreground' : ok ? 'text-green-600' : 'text-red-600')}>
          {isUnknown ? 'Indispon\u00edvel' : ok ? valueOk : valueFail}
        </p>
      </div>
    </div>
  );
}

function getOverallHealth(result: DiagnosticoResult): { label: string; color: string } {
  const hasError = !result.sessaoConectada || !result.kapsoReachable || result.sessaoConectada === null;
  const hasWarning = result.reconexoes > 3 || !!result.ultimoErro;
  if (hasError) return { label: 'Cr\u00edtico', color: 'text-red-600 bg-red-50 dark:bg-red-900/30' };
  if (hasWarning) return { label: 'Aten\u00e7\u00e3o', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' };
  return { label: 'Saud\u00e1vel', color: 'text-green-600 bg-green-50 dark:bg-green-900/30' };
}

const ConnectionDiagnosticoTab = ({ diagLoading, diagResult, onRunDiagnostico }: ConnectionDiagnosticoTabProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">{`Painel de Diagn\u00f3stico`}</h4>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={diagLoading}
          onClick={onRunDiagnostico}
        >
          {diagLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
          {`Executar diagn\u00f3stico`}
        </Button>
      </div>

      {diagLoading && !diagResult && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">{`Executando diagn\u00f3stico...`}</p>
        </div>
      )}

      {diagResult && (
        <div className="space-y-4">
          {/* Overall health badge */}
          {(() => {
            const health = getOverallHealth(diagResult);
            return (
              <div className={cn('p-3 rounded-lg border text-center', health.color)}>
                <span className="text-sm font-semibold">Estado geral: {health.label}</span>
              </div>
            );
          })()}

          {/* Checklist items */}
          <div className="space-y-3">
            <DiagnosticoItem
              label="Sess\u00e3o WhatsApp"
              ok={diagResult.sessaoConectada === true}
              unknown={diagResult.sessaoConectada === null}
              valueOk="Conectada"
              valueFail="Desconectada"
            />

            <DiagnosticoItem
              label="\u00daltimo heartbeat"
              ok={diagResult.ultimoHeartbeat != null}
              valueOk={
                diagResult.ultimoHeartbeat
                  ? `${formatDate(diagResult.ultimoHeartbeat)} (${formatRelativeTime(diagResult.ultimoHeartbeat)})`
                  : '\u2014'
              }
              valueFail="Sem registro"
            />

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className={cn(
                'mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-white text-xs',
                diagResult.reconexoes > 3 ? 'bg-amber-500' : 'bg-green-500',
              )}>
                {diagResult.reconexoes > 3 ? '!' : <CheckCircle2 className="h-3 w-3" />}
              </div>
              <div>
                <p className="text-sm font-medium">{`Reconex\u00f5es`}</p>
                <p className={cn('text-xs', diagResult.reconexoes > 3 ? 'text-amber-600' : 'text-muted-foreground')}>
                  {diagResult.reconexoes} tentativa{diagResult.reconexoes !== 1 ? 's' : ''}
                  {diagResult.reconexoes > 3 && ' \u2014 acima do esperado'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className={cn(
                'mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-white text-xs',
                diagResult.ultimoErro ? 'bg-red-500' : 'bg-green-500',
              )}>
                {diagResult.ultimoErro ? '!' : <CheckCircle2 className="h-3 w-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{`\u00daltimo erro`}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {diagResult.ultimoErro || 'Nenhum'}
                </p>
              </div>
            </div>

            <DiagnosticoItem
              label="Kapso API"
              ok={diagResult.kapsoReachable === true}
              unknown={diagResult.kapsoReachable === null}
              valueOk="Acess\u00edvel"
              valueFail="Inacess\u00edvel"
            />
          </div>
        </div>
      )}

      {!diagLoading && !diagResult && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{`Clique em "Executar diagn\u00f3stico" para verificar a sa\u00fade da conex\u00e3o`}</p>
        </div>
      )}
    </div>
  );
};

export default ConnectionDiagnosticoTab;

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { IntegrationStatus } from '@/components/configuracoes/IntegrationCard';

const STATUS_STYLE: Record<IntegrationStatus, { label: string; color: string }> = {
  connected:      { label: 'Conectado',       color: 'text-emerald-600 border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20' },
  pending:        { label: 'Pendente',         color: 'text-amber-600 border-amber-400/60 bg-amber-50 dark:bg-amber-900/20' },
  error:          { label: 'Erro',             color: 'text-red-600 border-red-400/60 bg-red-50 dark:bg-red-900/20' },
  not_configured: { label: 'Não configurado',  color: 'text-amber-600 border-amber-400/60 bg-amber-50 dark:bg-amber-900/20' },
};

export function StatusBadge({ status }: { status: IntegrationStatus }) {
  const cfg = STATUS_STYLE[status];
  const Icon = status === 'connected' ? CheckCircle2 : AlertCircle;
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold ${cfg.color}`}>
      <Icon className="h-2.5 w-2.5 mr-1" />
      {cfg.label}
    </Badge>
  );
}

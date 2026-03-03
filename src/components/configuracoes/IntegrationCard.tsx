import { type LucideIcon } from 'lucide-react';
import { CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type IntegrationStatus = 'connected' | 'pending' | 'error' | 'not_configured';

interface IntegrationCardProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  statusLabel?: string;
  children?: React.ReactNode;
  /** Link externo para abrir o painel do serviço */
  externalLink?: string;
  externalLinkLabel?: string;
}

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; variant: string; icon: typeof CheckCircle2 }> = {
  connected:      { label: 'Conectado',        variant: 'text-emerald-600 border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle2 },
  pending:        { label: 'Pendente',          variant: 'text-amber-600 border-amber-400/60 bg-amber-50 dark:bg-amber-900/20',         icon: AlertCircle },
  error:          { label: 'Erro',              variant: 'text-red-600 border-red-400/60 bg-red-50 dark:bg-red-900/20',                 icon: AlertCircle },
  not_configured: { label: 'Não configurado',   variant: 'text-amber-600 border-amber-400/60 bg-amber-50 dark:bg-amber-900/20',         icon: AlertCircle },
};

export function IntegrationCard({
  icon: Icon,
  iconColor = 'text-muted-foreground',
  iconBg = 'bg-muted/60',
  name,
  description,
  status,
  statusLabel,
  children,
  externalLink,
  externalLinkLabel,
}: IntegrationCardProps) {
  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;
  const label = statusLabel ?? cfg.label;

  return (
    <Card className={status === 'connected' ? 'border-emerald-200 dark:border-emerald-800/50' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {name}
                <Badge variant="outline" className={`text-[10px] font-semibold ${cfg.variant}`}>
                  <StatusIcon className="h-2.5 w-2.5 mr-1" />
                  {label}
                </Badge>
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">{description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {children}

        {externalLink && status !== 'connected' && (
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2" asChild>
            <a href={externalLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              {externalLinkLabel ?? `Abrir ${name}`}
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

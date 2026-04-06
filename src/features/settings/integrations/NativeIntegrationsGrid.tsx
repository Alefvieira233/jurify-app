import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, CreditCard, Mail, Bot, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import type { IntegrationStatus } from '../configuracoes/IntegrationCard';

interface NativeIntegrationsGridProps {
  waStatus: IntegrationStatus;
  stripeStatus: IntegrationStatus;
  aiStatus: IntegrationStatus;
}

const NativeIntegrationsGrid: React.FC<NativeIntegrationsGridProps> = ({
  waStatus,
  stripeStatus,
  aiStatus,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* WhatsApp */}
      <Card className={cn('transition-all hover:shadow-sm', waStatus === 'connected' && 'border-emerald-200 dark:border-emerald-800/50')}>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">WhatsApp</p>
              <StatusBadge status={waStatus} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Automação de mensagens via Kapso API
          </p>
          <Button variant="outline" size="sm" className="w-full text-xs" asChild>
            <a href="/configuracoes?tab=integracoes">Configurar</a>
          </Button>
        </CardContent>
      </Card>

      {/* Stripe */}
      <Card className={cn('transition-all hover:shadow-sm', stripeStatus === 'connected' && 'border-emerald-200 dark:border-emerald-800/50')}>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Stripe</p>
              <StatusBadge status={stripeStatus} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Cobranças recorrentes e assinaturas
          </p>
          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Stripe Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Postmark */}
      <Card className="transition-all hover:shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
              <Mail className="h-5 w-5 text-sky-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Postmark</p>
              <StatusBadge status="not_configured" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            E-mails transacionais e alertas
          </p>
          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
            <a href="https://account.postmarkapp.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Abrir Postmark
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* IA */}
      <Card className={cn('transition-all hover:shadow-sm', aiStatus === 'connected' && 'border-emerald-200 dark:border-emerald-800/50')}>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Inteligência Artificial</p>
              <StatusBadge status={aiStatus} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            OpenAI e Anthropic para agentes IA
          </p>
          <Button variant="outline" size="sm" className="w-full text-xs" asChild>
            <a href="/configuracoes?tab=integracoes">Configurar</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NativeIntegrationsGrid;

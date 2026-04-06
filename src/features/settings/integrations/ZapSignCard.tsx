import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSignature, CheckCircle2, ExternalLink, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import type { IntegrationStatus } from '../configuracoes/IntegrationCard';

interface ZapSignCardProps {
  zapSignStatus: IntegrationStatus;
}

const ZapSignCard: React.FC<ZapSignCardProps> = ({ zapSignStatus }) => {
  return (
    <Card className={cn(
      'relative overflow-hidden transition-all hover:shadow-md',
      zapSignStatus === 'connected'
        ? 'border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10'
        : 'border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/40 to-white dark:from-green-950/20 dark:to-background'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-background shadow-sm border flex items-center justify-center">
              <FileSignature className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                ZapSign
                <StatusBadge status={zapSignStatus} />
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Assinatura digital de contratos com validade jurídica
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {zapSignStatus === 'connected' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/80 border">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">API configurada</p>
                <p className="text-xs text-muted-foreground">Contratos podem ser assinados digitalmente</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full text-sm gap-2" asChild>
              <a href="https://app.zapsign.com.br" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir Painel ZapSign
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Configure sua API Key do ZapSign para habilitar assinaturas digitais nos contratos.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 text-sm gap-2" asChild>
                <a href="https://zapsign.com.br" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Criar conta ZapSign
                </a>
              </Button>
              <Button className="flex-1 h-11 text-sm gap-2" asChild>
                <a href="/configuracoes?tab=integracoes">
                  <Settings className="h-4 w-4" />
                  Configurar API Key
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ZapSignCard;

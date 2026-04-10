import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Settings, Trash2, RefreshCw, Plug, ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { type IntegracaoConfig } from '@/hooks/useIntegracoesConfig';

/** Extended type that includes DB columns not yet in the base IntegracaoConfig type */
type IntegracaoWithDetails = IntegracaoConfig & {
  api_key_encrypted?: string;
  data_ultima_sincronizacao?: string | null;
};

interface CustomIntegrationsProps {
  integracoes: IntegracaoWithDetails[];
  onToggleStatus: (id: string, status: IntegracaoConfig['status']) => void;
  onEdit: (integracao: IntegracaoConfig) => void;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

const CustomIntegrations: React.FC<CustomIntegrationsProps> = ({
  integracoes,
  onToggleStatus,
  onEdit,
  onSync,
  onDelete,
  onCreateNew,
}) => {
  if (integracoes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Settings className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Nenhuma integração customizada</p>
          <p className="text-xs text-muted-foreground text-center max-w-sm mb-4">
            Use o botão "Nova Integração" para conectar serviços terceiros via API.
          </p>
          <Button variant="outline" size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Criar primeira integração
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {integracoes.map((integracao) => {
        const isConnected = integracao.status === 'ativa' && !!integracao.api_key_encrypted && !!integracao.endpoint_url;
        return (
          <Card key={integracao.id} className={cn(isConnected && 'border-emerald-200 dark:border-emerald-800/50')}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center">
                    <Plug className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      {integracao.nome_integracao}
                      <Badge className={cn(
                        'text-[10px]',
                        integracao.status === 'ativa' ? 'bg-green-100 text-green-800' :
                        integracao.status === 'erro' ? 'bg-red-100 text-red-800' :
                        'bg-muted text-foreground'
                      )}>
                        {integracao.status === 'ativa' ? 'Ativa' : integracao.status === 'erro' ? 'Erro' : 'Inativa'}
                      </Badge>
                    </CardTitle>
                    {integracao.observacoes && (
                      <CardDescription className="text-[11px] mt-0.5">{integracao.observacoes}</CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={integracao.status === 'ativa'}
                    onCheckedChange={() => onToggleStatus(integracao.id, integracao.status)}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(integracao)}>
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Editar integração</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSync(integracao.id)}>
                    <RefreshCw className="h-4 w-4" />
                    <span className="sr-only">Sincronizar integração</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(integracao.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="sr-only">Remover integração</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Separator className="mb-3" />
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Endpoint</Label>
                  <p className="font-mono mt-0.5 truncate">{integracao.endpoint_url}</p>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">API Key</Label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3 w-3 text-green-500 shrink-0" />
                    <p className="font-mono truncate">
                      {integracao.api_key_encrypted ? '••••••••' : 'Não configurada'}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Criado em</Label>
                  <p className="mt-0.5">{format(new Date(integracao.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Última sincronização</Label>
                  <p className="mt-0.5">
                    {integracao.data_ultima_sincronizacao
                      ? format(new Date(integracao.data_ultima_sincronizacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                      : 'Nunca'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CustomIntegrations;

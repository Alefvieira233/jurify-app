import { WifiOff, RefreshCw, Trash2, Zap, Loader2, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ConexaoWhatsApp } from '@/hooks/useConexoes';

interface ConnectionAcoesTabProps {
  conexao: ConexaoWhatsApp;
  canManage: boolean;
  canDelete: boolean;
  isTesting: boolean;
  isReconnecting: boolean;
  isRegisteringWebhook?: boolean;
  onTestConnection: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
  onDeleteClick: () => void;
  onRegisterWebhook?: () => void;
}

const ConnectionAcoesTab = ({
  conexao,
  canManage,
  canDelete,
  isTesting,
  isReconnecting,
  isRegisteringWebhook,
  onTestConnection,
  onReconnect,
  onDisconnect,
  onDeleteClick,
  onRegisterWebhook,
}: ConnectionAcoesTabProps) => {
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={onTestConnection}
        disabled={isTesting}
      >
        {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        Testar conexão
      </Button>

      {canManage && onRegisterWebhook && (
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onRegisterWebhook}
          disabled={isRegisteringWebhook}
        >
          {isRegisteringWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          Registrar Webhook
        </Button>
      )}

      {canManage && conexao.status === 'disconnected' && (
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onReconnect}
          disabled={isReconnecting}
        >
          {isReconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Reconectar instância
        </Button>
      )}

      {canManage && conexao.status === 'connected' && (
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-amber-600 hover:text-amber-700"
          onClick={onDisconnect}
        >
          <WifiOff className="h-4 w-4" />
          Desconectar sessão
        </Button>
      )}

      {canDelete && (
        <>
          <Separator />
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={onDeleteClick}
          >
            <Trash2 className="h-4 w-4" />
            Excluir conexão
          </Button>
        </>
      )}
    </div>
  );
};

export default ConnectionAcoesTab;

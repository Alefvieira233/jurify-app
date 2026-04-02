import { WifiOff, RefreshCw, Trash2, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ConexaoWhatsApp } from '@/hooks/useConexoes';

interface ConnectionAcoesTabProps {
  conexao: ConexaoWhatsApp;
  canManage: boolean;
  canDelete: boolean;
  isTesting: boolean;
  isReconnecting: boolean;
  onTestConnection: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
  onDeleteClick: () => void;
}

const ConnectionAcoesTab = ({
  conexao,
  canManage,
  canDelete,
  isTesting,
  isReconnecting,
  onTestConnection,
  onReconnect,
  onDisconnect,
  onDeleteClick,
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
        {`Testar conex\u00e3o`}
      </Button>

      {canManage && conexao.status === 'disconnected' && (
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onReconnect}
          disabled={isReconnecting}
        >
          {isReconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {`Reconectar inst\u00e2ncia`}
        </Button>
      )}

      {canManage && conexao.status === 'connected' && (
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-amber-600 hover:text-amber-700"
          onClick={onDisconnect}
        >
          <WifiOff className="h-4 w-4" />
          {`Desconectar sess\u00e3o`}
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
            {`Excluir conex\u00e3o`}
          </Button>
        </>
      )}
    </div>
  );
};

export default ConnectionAcoesTab;

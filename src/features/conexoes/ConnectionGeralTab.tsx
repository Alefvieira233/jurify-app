import { Copy, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { ConexaoWhatsApp } from '@/hooks/useConexoes';
import { formatDate } from './connectionDetailsTypes';

interface ConnectionGeralTabProps {
  conexao: ConexaoWhatsApp;
  copyToClipboard: (text: string) => void;
}

function InfoItem({ label, value, copyable, onCopy }: { label: string; value: string; copyable?: boolean; onCopy?: () => void }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
        {copyable && value !== '\u2014' && onCopy && (
          <button type="button" onClick={onCopy} className="text-muted-foreground hover:text-foreground">
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

const ConnectionGeralTab = ({ conexao, copyToClipboard }: ConnectionGeralTabProps) => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <InfoItem label="Tipo" value={conexao.tipo === 'kapso' ? 'API N\u00e3o Oficial (Kapso)' : conexao.tipo === 'oficial' ? 'API Oficial' : 'Cloud API'} />
        <InfoItem label="Provider" value={conexao.provider || '\u2014'} />
        <InfoItem label="Inst\u00e2ncia" value={conexao.instance_name || '\u2014'} copyable onCopy={() => copyToClipboard(conexao.instance_name || '')} />
        <InfoItem label="\u00daltima sincroniza\u00e7\u00e3o" value={formatDate(conexao.last_sync)} />
        <InfoItem label="\u00daltimo heartbeat" value={formatDate(conexao.last_heartbeat)} />
        <InfoItem label="Reconex\u00f5es" value={String(conexao.reconnect_attempts)} />
      </div>

      {conexao.last_error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{'\u00daltimo erro'}</span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-300">{conexao.last_error}</p>
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Roteamento</h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Status padr\u00e3o" value={conexao.status_padrao || 'Nenhum'} />
          <InfoItem
            label="Departamento"
            value={conexao.departamento?.nome || 'Nenhum'}
          />
          <InfoItem
            label="Respons\u00e1vel"
            value={conexao.responsavel?.nome_completo || 'Nenhum'}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">{`Cria\u00e7\u00e3o`}</h4>
        <p className="text-sm text-muted-foreground">{formatDate(conexao.created_at)}</p>
      </div>
    </div>
  );
};

export default ConnectionGeralTab;

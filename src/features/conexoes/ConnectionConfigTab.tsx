import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { ConexaoWhatsApp } from '@/hooks/useConexoes';

interface ConnectionConfigTabProps {
  conexao: ConexaoWhatsApp;
  copyToClipboard: (text: string) => void;
}

const ConnectionConfigTab = ({ conexao, copyToClipboard }: ConnectionConfigTabProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">{`Nome da conex\u00e3o`}</Label>
          <p className="text-sm font-medium">{conexao.nome || '\u2014'}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{`Tipo de conex\u00e3o`}</Label>
          <p className="text-sm font-medium">
            {conexao.tipo === 'kapso' ? 'API N\u00e3o Oficial (Kapso)' : conexao.tipo === 'oficial' ? 'API Oficial (Meta)' : 'Cloud API'}
          </p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Provider</Label>
          <p className="text-sm font-medium">{conexao.provider || '\u2014'}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Instance name</Label>
          <div className="flex items-center gap-2">
            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{conexao.instance_name || '\u2014'}</code>
            {conexao.instance_name && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(conexao.instance_name!)} aria-label="Copiar instance name">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">{`Configura\u00e7\u00f5es JSON`}</h4>
        {Object.keys(conexao.config || {}).length > 0 ? (
          <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto max-h-48">
            {JSON.stringify(conexao.config, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">{`Sem configura\u00e7\u00f5es adicionais`}</p>
        )}
      </div>
    </div>
  );
};

export default ConnectionConfigTab;

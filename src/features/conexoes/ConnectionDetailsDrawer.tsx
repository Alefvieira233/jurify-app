import { useState } from 'react';
import {
  WifiOff, RefreshCw, Trash2, AlertTriangle,
  Zap, Activity, Loader2, Copy,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/hooks/useRBAC';
import { useConexoes, useConexaoLogs, type ConexaoWhatsApp, type ConexaoLog } from '@/hooks/useConexoes';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ConnectionDetailsDrawerProps {
  conexao: ConexaoWhatsApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  debug:    'text-slate-500 bg-slate-100 dark:bg-slate-800/40',
  info:     'text-blue-600  bg-blue-50   dark:bg-blue-900/30',
  warning:  'text-amber-600 bg-amber-50  dark:bg-amber-900/30',
  error:    'text-red-600   bg-red-50    dark:bg-red-900/30',
  critical: 'text-red-700   bg-red-100   dark:bg-red-900/50',
};

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  connected:    { label: 'Conectado',    variant: 'default' },
  disconnected: { label: 'Desconectado', variant: 'destructive' },
  connecting:   { label: 'Conectando',   variant: 'secondary' },
  error:        { label: 'Erro',         variant: 'destructive' },
};

const ConnectionDetailsDrawer = ({ conexao, open, onOpenChange }: ConnectionDetailsDrawerProps) => {
  const { toast } = useToast();
  const { can } = useRBAC();
  const { deleteConexao } = useConexoes();
  const { data: logs = [], isLoading: logsLoading } = useConexaoLogs(open && conexao ? conexao.id : null);

  const [activeTab, setActiveTab] = useState('geral');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canManage = can('conexoes', 'manage');
  const canDelete = can('conexoes', 'delete');

  if (!conexao) return null;

  const statusCfg = STATUS_BADGE[conexao.status] ?? STATUS_BADGE.disconnected!;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleReconnect = async () => {
    if (!conexao.instance_name) return;
    setIsReconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'restart', instanceName: conexao.instance_name },
      });
      if (error) throw error;
      toast({ title: 'Reconexão iniciada' });
    } catch {
      toast({ title: 'Erro ao reconectar', variant: 'destructive' });
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!conexao.instance_name) return;
    try {
      await supabase.functions.invoke('evolution-manager', {
        body: { action: 'logout', instanceName: conexao.instance_name },
      });
      toast({ title: 'Sessão desconectada' });
    } catch {
      toast({ title: 'Erro ao desconectar', variant: 'destructive' });
    }
  };

  const handleTestConnection = async () => {
    if (!conexao.instance_name) return;
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'status', instanceName: conexao.instance_name },
      });
      if (error) throw error;
      const connected = data?.connected || data?.state === 'open';
      toast({
        title: connected ? 'Conexão ativa' : 'Conexão inativa',
        description: connected ? 'WhatsApp respondendo normalmente.' : 'A instância não está conectada.',
        variant: connected ? 'default' : 'destructive',
      });
    } catch {
      toast({ title: 'Falha no teste', variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (conexao.instance_name) {
        await supabase.functions.invoke('evolution-manager', {
          body: { action: 'delete', instanceName: conexao.instance_name },
        });
      }
      await deleteConexao(conexao.id);
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-lg p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                {conexao.avatar_url ? (
                  <img src={conexao.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-green-700 dark:text-green-300">
                    {conexao.nome?.charAt(0)?.toUpperCase() || 'W'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg truncate">{conexao.nome || 'WhatsApp'}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  {conexao.telefone && (
                    <span className="text-sm text-muted-foreground">{conexao.telefone}</span>
                  )}
                  <Badge variant={statusCfg.variant} className="text-xs">
                    {statusCfg.label}
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 shrink-0">
              <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
              <TabsTrigger value="config" className="text-xs">Configurações</TabsTrigger>
              <TabsTrigger value="acoes" className="text-xs">Ações</TabsTrigger>
            </TabsList>

            {/* Tab: Geral */}
            <TabsContent value="geral" className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Tipo" value={conexao.tipo === 'evolution' ? 'API Não Oficial' : conexao.tipo === 'oficial' ? 'API Oficial' : 'Cloud API'} />
                <InfoItem label="Provider" value={conexao.provider || '—'} />
                <InfoItem label="Instância" value={conexao.instance_name || '—'} copyable onCopy={() => copyToClipboard(conexao.instance_name || '')} />
                <InfoItem label="Última sincronização" value={formatDate(conexao.last_sync)} />
                <InfoItem label="Último heartbeat" value={formatDate(conexao.last_heartbeat)} />
                <InfoItem label="Reconexões" value={String(conexao.reconnect_attempts)} />
              </div>

              {conexao.last_error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">Último erro</span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-300">{conexao.last_error}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Roteamento</h4>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Status padrão" value={conexao.status_padrao || 'Nenhum'} />
                  <InfoItem
                    label="Departamento"
                    value={conexao.departamento?.nome || 'Nenhum'}
                  />
                  <InfoItem
                    label="Responsável"
                    value={conexao.responsavel?.nome_completo || 'Nenhum'}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Criação</h4>
                <p className="text-sm text-muted-foreground">{formatDate(conexao.created_at)}</p>
              </div>
            </TabsContent>

            {/* Tab: Logs */}
            <TabsContent value="logs" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
              {logsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum log registrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <LogEntry key={log.id} log={log} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab: Configurações */}
            <TabsContent value="config" className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome da conexão</Label>
                  <p className="text-sm font-medium">{conexao.nome || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de conexão</Label>
                  <p className="text-sm font-medium">
                    {conexao.tipo === 'evolution' ? 'API Não Oficial (Evolution)' : conexao.tipo === 'oficial' ? 'API Oficial (Meta)' : 'Cloud API'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Provider</Label>
                  <p className="text-sm font-medium">{conexao.provider || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Instance name</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{conexao.instance_name || '—'}</code>
                    {conexao.instance_name && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(conexao.instance_name!)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Configurações JSON</h4>
                {Object.keys(conexao.config || {}).length > 0 ? (
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto max-h-48">
                    {JSON.stringify(conexao.config, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem configurações adicionais</p>
                )}
              </div>
            </TabsContent>

            {/* Tab: Ações */}
            <TabsContent value="acoes" className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => { void handleTestConnection(); }}
                disabled={isTesting}
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Testar conexão
              </Button>

              {canManage && conexao.status === 'disconnected' && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => { void handleReconnect(); }}
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
                  onClick={() => { void handleDisconnect(); }}
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
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir conexão
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir conexão"
        description={`Tem certeza que deseja excluir "${conexao.nome || 'esta conexão'}"? A instância será removida permanentemente e todas as sessões serão encerradas.`}
        onConfirm={() => { void handleDelete(); }}
        destructive
      />
    </>
  );
};

/* ── Sub-components ── */

function InfoItem({ label, value, copyable, onCopy }: { label: string; value: string; copyable?: boolean; onCopy?: () => void }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
        {copyable && value !== '—' && onCopy && (
          <button type="button" onClick={onCopy} className="text-muted-foreground hover:text-foreground">
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function LogEntry({ log }: { log: ConexaoLog }) {
  const severity = SEVERITY_STYLES[log.severidade] || SEVERITY_STYLES.info;
  const time = new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="flex gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex flex-col items-center text-xs text-muted-foreground shrink-0 w-12">
        <span>{time}</span>
        <span className="text-[10px]">{date}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', severity)}>
            {log.severidade}
          </Badge>
          <span className="text-xs font-medium text-foreground truncate">{log.evento}</span>
        </div>
        {log.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{log.descricao}</p>
        )}
        {log.origem && (
          <span className="text-[10px] text-muted-foreground/70">via {log.origem}</span>
        )}
      </div>
    </div>
  );
}

export default ConnectionDetailsDrawer;

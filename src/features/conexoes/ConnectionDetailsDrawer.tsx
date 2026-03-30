import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  WifiOff, RefreshCw, Trash2, AlertTriangle,
  Zap, Activity, Loader2, Copy,
  Bell, Shield, CheckCircle2,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase, supabaseUntyped } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '@/hooks/useRBAC';
import { useConexoes, useConexaoLogs, useConexaoAlertas, type ConexaoWhatsApp, type ConexaoLog, type ConexaoAlerta } from '@/hooks/useConexoes';
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

const ALERTA_TYPE_LABELS: Record<string, string> = {
  desconexao:          'Desconexão',
  qr_expirado:        'QR Expirado',
  falha_reconexao:     'Falha de Reconexão',
  erro_autenticacao:   'Erro de Autenticação',
  instabilidade:       'Instabilidade',
  falha_envio:         'Falha de Envio',
};

interface DiagnosticoResult {
  sessaoConectada: boolean | null;
  ultimoHeartbeat: string | null;
  reconexoes: number;
  ultimoErro: string | null;
  kapsoReachable: boolean | null;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d`;
}

const ConnectionDetailsDrawer = ({ conexao, open, onOpenChange }: ConnectionDetailsDrawerProps) => {
  const { toast } = useToast();
  const { can } = useRBAC();
  const { deleteConexao } = useConexoes();
  const queryClient = useQueryClient();
  const { data: logs = [], isLoading: logsLoading } = useConexaoLogs(open && conexao ? conexao.id : null);
  const { data: alertas = [], isLoading: alertasLoading } = useConexaoAlertas(open && conexao ? conexao.id : null);

  const [activeTab, setActiveTab] = useState('geral');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<DiagnosticoResult | null>(null);
  const [diagRanOnce, setDiagRanOnce] = useState(false);

  const canManage = can('conexoes', 'manage');
  const canDelete = can('conexoes', 'delete');

  const unresolvedCount = useMemo(
    () => alertas.filter((a) => !a.resolvido).length,
    [alertas],
  );

  // Reset diagnostic state when drawer closes or conexao changes
  useEffect(() => {
    if (!open) {
      setDiagResult(null);
      setDiagRanOnce(false);
      setActiveTab('geral');
    }
  }, [open]);

  const runDiagnostico = useCallback(async () => {
    if (!conexao?.instance_name) return;
    setDiagLoading(true);
    try {
      // Run status check and health-check in parallel
      const [statusRes, healthRes] = await Promise.all([
        supabase.functions.invoke('kapso-manager', {
          body: { action: 'status', instanceName: conexao.instance_name },
        }),
        supabase.functions.invoke('health-check', {
          body: {},
        }),
      ]);

      const statusData = statusRes.data;
      const healthData = healthRes.data;
      const connected = statusData?.connected || statusData?.state === 'open';
      const kapsoOk = healthData?.services?.whatsapp_kapso?.status === 'connected'
        || healthData?.services?.whatsapp_kapso === 'connected';

      setDiagResult({
        sessaoConectada: connected ?? false,
        ultimoHeartbeat: conexao.last_heartbeat,
        reconexoes: conexao.reconnect_attempts,
        ultimoErro: conexao.last_error,
        kapsoReachable: statusRes.error ? false : (kapsoOk ?? !healthRes.error),
      });
    } catch {
      setDiagResult({
        sessaoConectada: null,
        ultimoHeartbeat: conexao.last_heartbeat,
        reconexoes: conexao.reconnect_attempts,
        ultimoErro: conexao.last_error,
        kapsoReachable: false,
      });
      toast({ title: 'Erro ao executar diagnóstico', variant: 'destructive' });
    } finally {
      setDiagLoading(false);
    }
  }, [conexao?.instance_name, conexao?.last_heartbeat, conexao?.reconnect_attempts, conexao?.last_error, toast]);

  // Auto-run diagnostic when tab opens
  useEffect(() => {
    if (activeTab === 'diagnostico' && !diagRanOnce && conexao?.instance_name) {
      setDiagRanOnce(true);
      void runDiagnostico();
    }
  }, [activeTab, diagRanOnce, conexao?.instance_name, runDiagnostico]);

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
      const { error } = await supabase.functions.invoke('kapso-manager', {
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
      const { error } = await supabase.functions.invoke('kapso-manager', {
        body: { action: 'logout', instanceName: conexao.instance_name },
      });
      if (error) { toast({ title: 'Erro ao desconectar', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Sessão desconectada' });
    } catch {
      toast({ title: 'Erro ao desconectar', variant: 'destructive' });
    }
  };

  const handleTestConnection = async () => {
    if (!conexao.instance_name) return;
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('kapso-manager', {
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
        const { error } = await supabase.functions.invoke('kapso-manager', {
          body: { action: 'delete', instanceName: conexao.instance_name },
        });
        if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
      }
      await deleteConexao(conexao.id);
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const handleResolverAlerta = async (alertaId: string) => {
    try {
      const { error } = await supabaseUntyped
        .from('conexoes_alertas')
        .update({ resolvido: true, resolvido_em: new Date().toISOString() })
        .eq('id', alertaId);
      if (error) throw error;
      toast({ title: 'Alerta marcado como resolvido' });
      void queryClient.invalidateQueries({ queryKey: ['conexoes_alertas', conexao?.id] });
    } catch {
      toast({ title: 'Erro ao resolver alerta', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  const getOverallHealth = (result: DiagnosticoResult): { label: string; color: string } => {
    const hasError = !result.sessaoConectada || !result.kapsoReachable || result.sessaoConectada === null;
    const hasWarning = result.reconexoes > 3 || !!result.ultimoErro;
    if (hasError) return { label: 'Crítico', color: 'text-red-600 bg-red-50 dark:bg-red-900/30' };
    if (hasWarning) return { label: 'Atenção', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' };
    return { label: 'Saudável', color: 'text-green-600 bg-green-50 dark:bg-green-900/30' };
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
            <TabsList className="mx-6 mt-4 shrink-0 flex overflow-x-auto">
              <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
              <TabsTrigger value="config" className="text-xs">Configurações</TabsTrigger>
              <TabsTrigger value="acoes" className="text-xs">Ações</TabsTrigger>
              <TabsTrigger value="alertas" className="text-xs flex items-center gap-1">
                Alertas
                {unresolvedCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unresolvedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="text-xs">Diagnóstico</TabsTrigger>
            </TabsList>

            {/* Tab: Geral */}
            <TabsContent value="geral" className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Tipo" value={conexao.tipo === 'kapso' ? 'API Não Oficial (Kapso)' : conexao.tipo === 'oficial' ? 'API Oficial' : 'Cloud API'} />
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
                    {conexao.tipo === 'kapso' ? 'API Não Oficial (Kapso)' : conexao.tipo === 'oficial' ? 'API Oficial (Meta)' : 'Cloud API'}
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

            {/* Tab: Alertas */}
            <TabsContent value="alertas" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
              {alertasLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : alertas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum alerta registrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alertas.map((alerta) => (
                    <AlertaCard
                      key={alerta.id}
                      alerta={alerta}
                      onResolver={() => { void handleResolverAlerta(alerta.id); }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab: Diagnóstico */}
            <TabsContent value="diagnostico" className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Painel de Diagnóstico</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={diagLoading}
                  onClick={() => { void runDiagnostico(); }}
                >
                  {diagLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                  Executar diagnóstico
                </Button>
              </div>

              {diagLoading && !diagResult && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">Executando diagnóstico...</p>
                </div>
              )}

              {diagResult && (
                <div className="space-y-4">
                  {/* Overall health badge */}
                  {(() => {
                    const health = getOverallHealth(diagResult);
                    return (
                      <div className={cn('p-3 rounded-lg border text-center', health.color)}>
                        <span className="text-sm font-semibold">Estado geral: {health.label}</span>
                      </div>
                    );
                  })()}

                  {/* Checklist items */}
                  <div className="space-y-3">
                    <DiagnosticoItem
                      label="Sessão WhatsApp"
                      ok={diagResult.sessaoConectada === true}
                      unknown={diagResult.sessaoConectada === null}
                      valueOk="Conectada"
                      valueFail="Desconectada"
                    />

                    <DiagnosticoItem
                      label="Último heartbeat"
                      ok={diagResult.ultimoHeartbeat != null}
                      valueOk={
                        diagResult.ultimoHeartbeat
                          ? `${formatDate(diagResult.ultimoHeartbeat)} (${formatRelativeTime(diagResult.ultimoHeartbeat)})`
                          : '—'
                      }
                      valueFail="Sem registro"
                    />

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={cn(
                        'mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-white text-xs',
                        diagResult.reconexoes > 3 ? 'bg-amber-500' : 'bg-green-500',
                      )}>
                        {diagResult.reconexoes > 3 ? '!' : <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Reconexões</p>
                        <p className={cn('text-xs', diagResult.reconexoes > 3 ? 'text-amber-600' : 'text-muted-foreground')}>
                          {diagResult.reconexoes} tentativa{diagResult.reconexoes !== 1 ? 's' : ''}
                          {diagResult.reconexoes > 3 && ' — acima do esperado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={cn(
                        'mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-white text-xs',
                        diagResult.ultimoErro ? 'bg-red-500' : 'bg-green-500',
                      )}>
                        {diagResult.ultimoErro ? '!' : <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Último erro</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {diagResult.ultimoErro || 'Nenhum'}
                        </p>
                      </div>
                    </div>

                    <DiagnosticoItem
                      label="Kapso API"
                      ok={diagResult.kapsoReachable === true}
                      unknown={diagResult.kapsoReachable === null}
                      valueOk="Acessível"
                      valueFail="Inacessível"
                    />
                  </div>
                </div>
              )}

              {!diagLoading && !diagResult && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Clique em "Executar diagnóstico" para verificar a saúde da conexão</p>
                </div>
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

function AlertaCard({ alerta, onResolver }: { alerta: ConexaoAlerta; onResolver: () => void }) {
  const severityStyle = SEVERITY_STYLES[alerta.severidade] || SEVERITY_STYLES.info;
  const typeLabel = ALERTA_TYPE_LABELS[alerta.tipo] || alerta.tipo;

  return (
    <div className="p-3 rounded-lg border space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', severityStyle)}>
          {alerta.severidade}
        </Badge>
        <span className="text-xs font-medium text-foreground">{typeLabel}</span>
        {alerta.lido && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Lido
          </Badge>
        )}
        {alerta.resolvido && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 bg-green-50 dark:bg-green-900/30 gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Resolvido
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{alerta.mensagem}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/70">
          {formatRelativeTime(alerta.created_at)}
        </span>
        {!alerta.resolvido && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1 text-green-600 hover:text-green-700"
            onClick={onResolver}
          >
            <CheckCircle2 className="h-3 w-3" />
            Marcar como resolvido
          </Button>
        )}
      </div>
    </div>
  );
}

function DiagnosticoItem({
  label, ok, unknown, valueOk, valueFail,
}: {
  label: string;
  ok: boolean;
  unknown?: boolean;
  valueOk: string;
  valueFail: string;
}) {
  const isUnknown = unknown === true;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className={cn(
        'mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-white text-xs',
        isUnknown ? 'bg-slate-400' : ok ? 'bg-green-500' : 'bg-red-500',
      )}>
        {isUnknown ? '?' : ok ? <CheckCircle2 className="h-3 w-3" /> : '!'}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className={cn('text-xs', isUnknown ? 'text-muted-foreground' : ok ? 'text-green-600' : 'text-red-600')}>
          {isUnknown ? 'Indisponível' : ok ? valueOk : valueFail}
        </p>
      </div>
    </div>
  );
}

export default ConnectionDetailsDrawer;

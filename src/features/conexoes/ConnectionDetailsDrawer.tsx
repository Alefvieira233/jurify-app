import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase, supabaseUntyped } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '@/hooks/useRBAC';
import { useConexoes, useConexaoLogs, useConexaoAlertas } from '@/hooks/useConexoes';
import ConfirmDialog from '@/components/ConfirmDialog';
import { STATUS_BADGE, type ConnectionDetailsDrawerProps, type DiagnosticoResult } from './connectionDetailsTypes';
import ConnectionGeralTab from './ConnectionGeralTab';
import ConnectionLogsTab from './ConnectionLogsTab';
import ConnectionConfigTab from './ConnectionConfigTab';
import ConnectionAcoesTab from './ConnectionAcoesTab';
import ConnectionAlertasTab from './ConnectionAlertasTab';
import ConnectionDiagnosticoTab from './ConnectionDiagnosticoTab';

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
    setDiagLoading(true);
    try {
      const [statusRes, healthRes] = await Promise.all([
        supabase.functions.invoke('kapso-manager', { body: { action: 'status' } }),
        supabase.functions.invoke('health-check', { body: {} }),
      ]);

      const statusData = statusRes.data;
      const healthData = healthRes.data;
      const connected = statusData?.connected ?? false;
      const kapsoOk = healthData?.services?.whatsapp_kapso?.status === 'connected'
        || healthData?.services?.whatsapp_kapso === 'connected';

      setDiagResult({
        sessaoConectada: connected,
        ultimoHeartbeat: conexao?.last_heartbeat ?? null,
        reconexoes: conexao?.reconnect_attempts ?? 0,
        ultimoErro: conexao?.last_error ?? null,
        kapsoReachable: statusRes.error ? false : (kapsoOk ?? !healthRes.error),
      });
    } catch (err) {
      console.error('[ConnectionDetailsDrawer] runDiagnostico failed:', err);
      setDiagResult({
        sessaoConectada: null,
        ultimoHeartbeat: conexao?.last_heartbeat ?? null,
        reconexoes: conexao?.reconnect_attempts ?? 0,
        ultimoErro: conexao?.last_error ?? null,
        kapsoReachable: false,
      });
      toast({ title: 'Erro ao executar diagn\u00f3stico', variant: 'destructive' });
    } finally {
      setDiagLoading(false);
    }
  }, [conexao?.last_heartbeat, conexao?.reconnect_attempts, conexao?.last_error, toast]);

  // Auto-run diagnostic when tab opens
  useEffect(() => {
    if (activeTab === 'diagnostico' && !diagRanOnce && open) {
      setDiagRanOnce(true);
      void runDiagnostico();
    }
  }, [activeTab, diagRanOnce, open, runDiagnostico]);

  if (!conexao) return null;

  const statusCfg = STATUS_BADGE[conexao.status] ?? STATUS_BADGE.disconnected!;

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('kapso-manager', {
        body: { action: 'setup-link' },
      });
      if (error) throw error;
      if (data?.setupUrl) {
        window.open(data.setupUrl as string, '_blank', 'noopener');
        toast({ title: 'Reconex\u00e3o iniciada', description: 'Complete a autentica\u00e7\u00e3o na janela que foi aberta.' });
      }
    } catch (err) {
      console.error('[ConnectionDetailsDrawer] handleReconnect failed:', err);
      toast({ title: 'Erro ao reconectar', variant: 'destructive' });
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await deleteConexao(conexao.id);
      toast({ title: 'Conex\u00e3o desconectada' });
      onOpenChange(false);
    } catch (err) {
      console.error('[ConnectionDetailsDrawer] handleDisconnect failed:', err);
      toast({ title: 'Erro ao desconectar', variant: 'destructive' });
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('kapso-manager', {
        body: { action: 'status' },
      });
      if (error) throw error;
      const connected = data?.connected ?? false;
      toast({
        title: connected ? 'Conex\u00e3o ativa' : 'Conex\u00e3o inativa',
        description: connected ? 'WhatsApp respondendo normalmente.' : 'A conex\u00e3o n\u00e3o est\u00e1 ativa.',
        variant: connected ? 'default' : 'destructive',
      });
    } catch (err) {
      console.error('[ConnectionDetailsDrawer] handleTestConnection failed:', err);
      toast({ title: 'Falha no teste', variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteConexao(conexao.id);
      onOpenChange(false);
    } catch (err) {
      console.error('[ConnectionDetailsDrawer] handleDelete failed:', err);
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
    } catch (err) {
      console.error('[ConnectionDetailsDrawer] handleResolverAlerta failed:', err);
      toast({ title: 'Erro ao resolver alerta', variant: 'destructive' });
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
            <TabsList className="mx-6 mt-4 shrink-0 flex overflow-x-auto">
              <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
              <TabsTrigger value="config" className="text-xs">{`Configura\u00e7\u00f5es`}</TabsTrigger>
              <TabsTrigger value="acoes" className="text-xs">{`A\u00e7\u00f5es`}</TabsTrigger>
              <TabsTrigger value="alertas" className="text-xs flex items-center gap-1">
                Alertas
                {unresolvedCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unresolvedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="text-xs">{`Diagn\u00f3stico`}</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
              <ConnectionGeralTab conexao={conexao} copyToClipboard={copyToClipboard} />
            </TabsContent>

            <TabsContent value="logs" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
              <ConnectionLogsTab logs={logs} isLoading={logsLoading} />
            </TabsContent>

            <TabsContent value="config" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
              <ConnectionConfigTab conexao={conexao} copyToClipboard={copyToClipboard} />
            </TabsContent>

            <TabsContent value="acoes" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
              <ConnectionAcoesTab
                conexao={conexao}
                canManage={canManage}
                canDelete={canDelete}
                isTesting={isTesting}
                isReconnecting={isReconnecting}
                onTestConnection={() => { void handleTestConnection(); }}
                onReconnect={() => { void handleReconnect(); }}
                onDisconnect={() => { void handleDisconnect(); }}
                onDeleteClick={() => setConfirmDelete(true)}
              />
            </TabsContent>

            <TabsContent value="alertas" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
              <ConnectionAlertasTab
                alertas={alertas}
                isLoading={alertasLoading}
                onResolverAlerta={(id) => { void handleResolverAlerta(id); }}
              />
            </TabsContent>

            <TabsContent value="diagnostico" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
              <ConnectionDiagnosticoTab
                diagLoading={diagLoading}
                diagResult={diagResult}
                onRunDiagnostico={() => { void runDiagnostico(); }}
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir conex\u00e3o"
        description={`Tem certeza que deseja excluir "${conexao.nome || 'esta conex\u00e3o'}"? A inst\u00e2ncia ser\u00e1 removida permanentemente e todas as sess\u00f5es ser\u00e3o encerradas.`}
        onConfirm={() => { void handleDelete(); }}
        destructive
      />
    </>
  );
};

export default ConnectionDetailsDrawer;

/**
 * WhatsApp Evolution Setup - QR Code connection flow
 *
 * Component to connect WhatsApp via Evolution API (self-hosted).
 * Supports QR Code scanning, status monitoring, and disconnect.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface WhatsAppEvolutionSetupProps {
  onConnectionSuccess?: () => void;
}

type ConnectionState = 'idle' | 'creating' | 'qr_ready' | 'connected' | 'disconnected' | 'error';

interface InstanceInfo {
  instanceName: string;
  state: ConnectionState;
  qrCode: string | null;
  error: string | null;
}

export default function WhatsAppEvolutionSetup({ onConnectionSuccess }: WhatsAppEvolutionSetupProps) {
  const [instance, setInstance] = useState<InstanceInfo>({
    instanceName: '',
    state: 'idle',
    qrCode: null,
    error: null,
  });
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  const tenantId = profile?.tenant_id ?? null;

  // Chamada à Edge Function evolution-manager
  const callEvolutionManager = useCallback(
    async (action: string, instanceName?: string) => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('evolution-manager', {
        body: { action, instanceName },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data;
    },
    []
  );

  // Carrega estado atual da instância do banco
  useEffect(() => {
    if (!tenantId) return;

    const loadExisting = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes_integracoes')
          .select('phone_number_id, status, verify_token')
          .eq('tenant_id', tenantId)
          .eq('nome_integracao', 'whatsapp_evolution')
          .maybeSingle();

        if (error) throw error;
        if (!data) return;

        const stateMap: Record<string, ConnectionState> = {
          ativa: 'connected',
          desconectada: 'disconnected',
          aguardando_qr: 'qr_ready',
        };

        setInstance({
          instanceName: data.phone_number_id || '',
          state: stateMap[data.status] || 'idle',
          qrCode: data.status === 'aguardando_qr' ? data.verify_token : null,
          error: null,
        });
      } catch (err) {
        console.error('Failed to load Evolution config:', err);
      }
    };

    void loadExisting();
  }, [tenantId]);

  // Polling de status quando aguardando QR
  useEffect(() => {
    if (instance.state === 'qr_ready' && instance.instanceName && !polling) {
      setPolling(true);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const result = await callEvolutionManager('status', instance.instanceName);

          if (result?.connected) {
            setInstance((prev) => ({ ...prev, state: 'connected', qrCode: null }));
            setPolling(false);

            toast({
              title: 'WhatsApp conectado!',
              description: 'Seu numero foi vinculado com sucesso.',
            });

            onConnectionSuccess?.();

            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        } catch {
          // Silently retry
        }
      }, 5000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setPolling(false);
    };
  }, [instance.state, instance.instanceName, callEvolutionManager, onConnectionSuccess, toast, polling]);

  // Criar instância / Obter QR Code
  const handleConnect = async () => {
    setLoading(true);
    setInstance((prev) => ({ ...prev, state: 'creating', error: null }));

    try {
      const result = await callEvolutionManager('create');

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to create instance');
      }

      // Se já está conectada
      if (result.status === 'ativa' || result.message?.includes('connected')) {
        setInstance({
          instanceName: result.instanceName || '',
          state: 'connected',
          qrCode: null,
          error: null,
        });
        toast({ title: 'WhatsApp ja conectado', description: 'Sua instancia ja esta ativa.' });
        return;
      }

      // QR Code disponível
      const qr = result.qrcode?.base64 || result.qrcode || null;

      setInstance({
        instanceName: result.instanceName || '',
        state: qr ? 'qr_ready' : 'creating',
        qrCode: qr,
        error: null,
      });

      // Se não veio QR, tenta buscar
      if (!qr && result.instanceName) {
        const qrResult = await callEvolutionManager('qrcode', result.instanceName);
        if (qrResult?.qrcode) {
          setInstance((prev) => ({
            ...prev,
            state: 'qr_ready',
            qrCode: qrResult.qrcode,
          }));
        }
      }
    } catch (err: any) {
      console.error('Connection error:', err);
      setInstance((prev) => ({
        ...prev,
        state: 'error',
        error: err.message || 'Erro ao conectar',
      }));
      toast({
        title: 'Erro ao conectar',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Atualizar QR Code
  const handleRefreshQR = async () => {
    if (!instance.instanceName) return;
    setLoading(true);

    try {
      const result = await callEvolutionManager('qrcode', instance.instanceName);
      if (result?.qrcode) {
        setInstance((prev) => ({ ...prev, qrCode: result.qrcode }));
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar QR',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Desconectar
  const handleDisconnect = async () => {
    if (!instance.instanceName) return;
    setLoading(true);

    try {
      await callEvolutionManager('disconnect', instance.instanceName);
      setInstance((prev) => ({ ...prev, state: 'disconnected', qrCode: null }));
      toast({ title: 'WhatsApp desconectado' });
    } catch (err: any) {
      toast({
        title: 'Erro ao desconectar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Deletar instância
  const handleDelete = async () => {
    if (!instance.instanceName) return;
    setLoading(true);

    try {
      await callEvolutionManager('delete', instance.instanceName);
      setInstance({ instanceName: '', state: 'idle', qrCode: null, error: null });
      toast({ title: 'Instancia removida' });
    } catch (err: any) {
      toast({
        title: 'Erro ao remover',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Renderiza QR Code
  const renderQRCode = () => {
    if (!instance.qrCode) return null;

    const src = instance.qrCode.startsWith('data:')
      ? instance.qrCode
      : `data:image/png;base64,${instance.qrCode}`;

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-xl shadow-lg">
          <img src={src} alt="QR Code WhatsApp" className="w-64 h-64" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            Escaneie o QR Code com seu WhatsApp
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Abra o WhatsApp &gt; Menu &gt; Aparelhos conectados &gt; Conectar aparelho
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleRefreshQR()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar QR Code
        </Button>
      </div>
    );
  };

  // Status badge
  const renderStatusBadge = () => {
    const badges: Record<ConnectionState, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      idle: { label: 'Nao configurado', variant: 'secondary', icon: <WifiOff className="h-3 w-3" /> },
      creating: { label: 'Criando...', variant: 'outline', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      qr_ready: { label: 'Aguardando QR', variant: 'outline', icon: <QrCode className="h-3 w-3" /> },
      connected: { label: 'Conectado', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
      disconnected: { label: 'Desconectado', variant: 'destructive', icon: <WifiOff className="h-3 w-3" /> },
      error: { label: 'Erro', variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
    };

    const badge = badges[instance.state];

    return (
      <Badge variant={badge.variant} className="flex items-center gap-1">
        {badge.icon}
        {badge.label}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Smartphone className="h-7 w-7 text-emerald-400" />
            WhatsApp Evolution API
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            Conecte seu WhatsApp escaneando o QR Code. Sem custos por mensagem.
          </p>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Info Alert */}
      <Alert className="border-emerald-500/30 bg-emerald-500/10">
        <Wifi className="h-4 w-4 text-emerald-400" />
        <AlertDescription className="text-[hsl(var(--foreground))]">
          A Evolution API permite conectar seu WhatsApp pessoal ou empresarial sem custos adicionais.
          Basta escanear o QR Code abaixo com o aplicativo do WhatsApp.
        </AlertDescription>
      </Alert>

      {/* Error */}
      {instance.error && (
        <Alert className="border-red-500/30 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">{instance.error}</AlertDescription>
        </Alert>
      )}

      {/* Main Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Conexao WhatsApp
          </CardTitle>
          <CardDescription>
            {instance.state === 'connected'
              ? 'Seu WhatsApp esta conectado e pronto para uso.'
              : instance.state === 'qr_ready'
                ? 'Escaneie o QR Code para conectar.'
                : 'Clique em conectar para gerar o QR Code.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code Area */}
          {instance.state === 'qr_ready' && renderQRCode()}

          {/* Connected State */}
          {instance.state === 'connected' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-[hsl(var(--foreground))]">WhatsApp Conectado</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Instancia: {instance.instanceName}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {(instance.state === 'idle' || instance.state === 'error' || instance.state === 'disconnected') && (
              <Button
                onClick={() => void handleConnect()}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    {instance.state === 'disconnected' ? 'Reconectar WhatsApp' : 'Conectar WhatsApp'}
                  </>
                )}
              </Button>
            )}

            {instance.state === 'connected' && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => void handleDisconnect()}
                  disabled={loading}
                  className="flex-1"
                >
                  <WifiOff className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void handleDelete()}
                  disabled={loading}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            )}
          </div>

          {/* Polling indicator */}
          {polling && (
            <p className="text-xs text-center text-[hsl(var(--muted-foreground))] flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aguardando leitura do QR Code...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

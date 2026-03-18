import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Smartphone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type WizardState = 'idle' | 'creating' | 'qr_ready' | 'qr_scanned' | 'authenticating' | 'connected' | 'expired' | 'error';

interface QRCodeWizardProps {
  onBack: () => void;
  onConnected: (instanceName: string) => void;
}

const QR_TIMEOUT_SECONDS = 120;
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 24;

const QRCodeWizard = ({ onBack, onConnected }: QRCodeWizardProps) => {
  const { toast } = useToast();

  const [state, setState] = useState<WizardState>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [showPairingCode, setShowPairingCode] = useState(false);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(QR_TIMEOUT_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
    pollCountRef.current = 0;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const checkStatus = useCallback(async (name: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'status', instanceName: name },
      });
      if (fnError) return;
      if (data?.connected || data?.state === 'open') {
        cleanup();
        setState('connected');
        onConnected(name);
        toast({ title: 'WhatsApp conectado com sucesso!' });
      } else if (data?.state === 'connecting' || data?.status === 'qrReadSuccess') {
        setState('qr_scanned');
        setTimeout(() => {
          setState(prev => prev === 'qr_scanned' ? 'authenticating' : prev);
        }, 1000);
      }
    } catch {
      // Silent - polling will retry
    }
  }, [cleanup, onConnected, toast]);

  const startPolling = useCallback((name: string) => {
    pollCountRef.current = 0;
    pollRef.current = setInterval(() => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
        cleanup();
        setState('expired');
        setQrCode(null);
        toast({ title: 'QR Code expirado', description: 'Gere um novo QR Code para tentar novamente.', variant: 'destructive' });
        return;
      }
      void checkStatus(name);
    }, POLL_INTERVAL_MS);

    setCountdown(QR_TIMEOUT_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
  }, [cleanup, checkStatus, toast]);

  const generateQR = useCallback(async () => {
    setState('creating');
    setError(null);
    setQrCode(null);
    setPairingCode(null);
    cleanup();

    try {
      const { data, error: fnError } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'create' },
      });

      if (fnError || !data?.success) {
        throw new Error(data?.error || fnError?.message || 'Erro ao gerar QR Code');
      }

      const name = data.instanceName as string;
      setInstanceName(name);

      if (data.qrcode) {
        const qrSrc = data.qrcode.startsWith('data:') ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
        setQrCode(qrSrc);
        setState('qr_ready');
        startPolling(name);
      } else {
        // Instance may already be connected
        const statusRes = await supabase.functions.invoke('evolution-manager', {
          body: { action: 'status', instanceName: name },
        });
        if (statusRes.data?.connected) {
          setState('connected');
          onConnected(name);
          return;
        }
        // Try fetching QR
        const qrRes = await supabase.functions.invoke('evolution-manager', {
          body: { action: 'qrcode', instanceName: name },
        });
        if (qrRes.data?.qrcode) {
          const qrSrc = qrRes.data.qrcode.startsWith('data:') ? qrRes.data.qrcode : `data:image/png;base64,${qrRes.data.qrcode}`;
          setQrCode(qrSrc);
          if (qrRes.data.pairingCode) setPairingCode(qrRes.data.pairingCode);
          setState('qr_ready');
          startPolling(name);
        } else {
          throw new Error('Não foi possível obter o QR Code');
        }
      }
    } catch (err) {
      setState('error');
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    }
  }, [cleanup, startPolling, onConnected, toast]);

  const refreshQR = useCallback(async () => {
    if (!instanceName) return;
    cleanup();
    setState('creating');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'qrcode', instanceName },
      });
      if (fnError || !data?.qrcode) throw new Error('Erro ao atualizar QR Code');

      const qrSrc = data.qrcode.startsWith('data:') ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
      setQrCode(qrSrc);
      if (data.pairingCode) setPairingCode(data.pairingCode);
      setState('qr_ready');
      startPolling(instanceName);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Erro ao atualizar QR');
    }
  }, [instanceName, cleanup, startPolling]);

  const countdownColor = countdown <= 10 ? 'text-red-500' : countdown <= 30 ? 'text-amber-500' : 'text-green-500';

  return (
    <div className="p-6">
      {/* Header */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <h2 className="text-xl font-semibold text-foreground">
        Adicionar Nova Conexão - API Não Oficial
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Conecte-se ao Jurify da mesma forma que você se conecta ao WhatsApp Web!
      </p>

      {/* QR Area */}
      <div className="flex flex-col items-center mt-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['Gerar QR', 'Escanear', 'Autenticar', 'Conectado'].map((step, i) => {
            const stepStates: WizardState[][] = [['idle', 'creating'], ['qr_ready'], ['qr_scanned', 'authenticating'], ['connected']];
            const currentStepStates = stepStates[i] ?? [];
            const isActive = currentStepStates.includes(state);
            const isPast = i < stepStates.findIndex(s => s.includes(state));
            return (
              <div key={step} className="flex items-center gap-2">
                {i > 0 && <div className={cn('w-8 h-0.5', isPast ? 'bg-primary' : 'bg-border')} />}
                <div className={cn(
                  'flex items-center gap-1.5 text-xs',
                  isActive ? 'text-primary font-medium' : isPast ? 'text-primary/60' : 'text-muted-foreground/40'
                )}>
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                    isActive ? 'bg-primary text-white' : isPast ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground/40'
                  )}>
                    {isPast ? '\u2713' : i + 1}
                  </div>
                  <span className="hidden sm:inline">{step}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-64 h-64 border-2 border-dashed border-border rounded-xl flex items-center justify-center bg-muted/30">
          {state === 'idle' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-muted/50 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">Clique para gerar QR Code</p>
              <Button onClick={() => { void generateQR(); }}>
                Gerar QR Code
              </Button>
            </div>
          )}

          {state === 'creating' && (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          )}

          {state === 'qr_ready' && qrCode && (
            <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
          )}

          {state === 'qr_scanned' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-pulse">
                <Smartphone className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm font-medium text-green-600">QR Code lido!</p>
              <p className="text-xs text-muted-foreground mt-1">Aguardando autenticação...</p>
            </div>
          )}

          {state === 'authenticating' && (
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Autenticando sessão...</p>
              <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
            </div>
          )}

          {state === 'connected' && (
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-600">Conectado com sucesso!</p>
            </div>
          )}

          {state === 'expired' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-amber-600">QR Code expirado</p>
              <p className="text-xs text-muted-foreground mt-2 mb-4">O código expirou. Gere um novo para continuar.</p>
              <Button onClick={() => { void generateQR(); }}>
                Gerar novo QR Code
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={() => { void generateQR(); }}>
                Tentar novamente
              </Button>
            </div>
          )}
        </div>

        {/* Countdown + Refresh */}
        {state === 'qr_ready' && (
          <div className="flex items-center gap-3 mt-4">
            <span className={cn('text-sm font-mono font-medium', countdownColor)}>
              {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="ghost" size="sm" onClick={() => { void refreshQR(); }}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Gerar novo QR
            </Button>
          </div>
        )}

        {/* Pairing Code Fallback */}
        {state === 'qr_ready' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowPairingCode(!showPairingCode)}
              className="text-sm text-primary hover:underline flex items-center gap-1.5 mx-auto"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Tentar com Código
            </button>
            {showPairingCode && pairingCode && (
              <div className="mt-2 px-4 py-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Código de pareamento:</p>
                <p className="text-lg font-mono font-bold tracking-widest">{pairingCode}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-muted/30 rounded-xl border">
        <p className="font-medium text-sm text-foreground mb-3">
          Passo a passo para conectar WhatsApp ao Jurify pela API não oficial
        </p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground/70">1.</span>
            Abra o WhatsApp no celular
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground/70">2.</span>
            Vá em Configurações → Aparelhos conectados
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground/70">3.</span>
            Clique em Conectar dispositivo
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground/70">4.</span>
            Aponte a câmera para o QR Code e aguarde a conexão
          </li>
        </ol>
      </div>

      {/* Warning */}
      <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p>
          Importante: Não conecte o mesmo número de WhatsApp várias vezes no Jurify.
          Isso pode causar conflitos de sessão.
        </p>
      </div>
    </div>
  );
};

export default QRCodeWizard;

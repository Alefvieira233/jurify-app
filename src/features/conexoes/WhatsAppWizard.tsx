import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, RefreshCw, AlertTriangle,
  CheckCircle2, Smartphone, MessageSquare, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type WizardStep = 'prepare' | 'scan' | 'syncing' | 'connected';
type QrState = 'loading' | 'ready' | 'expired' | 'error';

interface WhatsAppWizardProps {
  onClose: () => void;
  onConnected: () => void;
}

const QR_TIMEOUT_SECONDS = 45;
const POLL_INTERVAL_MS = 2000;

const SYNC_STEPS = [
  'QR code escaneado',
  'Autenticação confirmada',
  'Configurando atendimento automático',
  'Pronto!',
] as const;

const WhatsAppWizard = ({ onClose, onConnected }: WhatsAppWizardProps) => {
  const navigate = useNavigate();

  const [step, setStep] = useState<WizardStep>('prepare');
  const [qrState, setQrState] = useState<QrState>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(QR_TIMEOUT_SECONDS);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncStep, setSyncStep] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // --- Preload QR on mount (while user reads Step 1) ---
  const preloadQR = useCallback(async () => {
    setQrState('loading');
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.functions.invoke('kapso-manager', {
        body: { action: 'create' },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Não foi possível iniciar a conexão.');
      }

      const name = data.instanceName as string;
      setInstanceName(name);

      if (data.qrcode) {
        const src = data.qrcode.startsWith('data:') ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
        setQrCode(src);
        setQrState('ready');
        return;
      }

      // Instance created but no QR — try fetching separately
      const { data: qrData } = await supabase.functions.invoke('kapso-manager', {
        body: { action: 'qrcode', instanceName: name },
      });

      if (qrData?.qrcode) {
        const src = qrData.qrcode.startsWith('data:') ? qrData.qrcode : `data:image/png;base64,${qrData.qrcode}`;
        setQrCode(src);
        setQrState('ready');
      } else if (data.connected || qrData?.connected) {
        // Already connected
        setStep('connected');
        onConnected();
      } else {
        throw new Error('Não foi possível gerar o QR code.');
      }
    } catch {
      setQrState('error');
      setErrorMsg('Não foi possível gerar o QR code. Tente novamente.');
    }
  }, [onConnected]);

  useEffect(() => {
    void preloadQR();
  }, [preloadQR]);

  // --- Polling for scan detection ---
  const startPolling = useCallback(() => {
    if (!instanceName) return;
    cleanup();

    setCountdown(QR_TIMEOUT_SECONDS);

    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const { data } = await supabase.functions.invoke('kapso-manager', {
            body: { action: 'status', instanceName },
          });
          if (data?.connected || data?.state === 'open') {
            cleanup();
            setPhoneNumber(data.phoneNumber || data.phone || null);
            setStep('syncing');
          }
        } catch {
          // Silent — next poll will retry
        }
      })();
    }, POLL_INTERVAL_MS);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          cleanup();
          setQrState('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [instanceName, cleanup]);

  // --- Regenerate QR ---
  const regenerateQR = useCallback(async () => {
    if (!instanceName) return;
    cleanup();
    setQrState('loading');
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.functions.invoke('kapso-manager', {
        body: { action: 'qrcode', instanceName },
      });

      if (error || !data?.qrcode) {
        throw new Error('Não foi possível gerar o QR code. Tente novamente.');
      }

      const src = data.qrcode.startsWith('data:') ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
      setQrCode(src);
      setQrState('ready');
    } catch {
      setQrState('error');
      setErrorMsg('Não foi possível gerar o QR code. Tente novamente.');
    }
  }, [instanceName, cleanup]);

  // --- Start polling when entering scan step ---
  const handleReady = () => {
    setStep('scan');
    if (qrState === 'ready') startPolling();
  };

  useEffect(() => {
    if (step === 'scan' && qrState === 'ready' && !pollRef.current) {
      startPolling();
    }
  }, [step, qrState, startPolling]);

  // --- Trust animation ---
  useEffect(() => {
    if (step !== 'syncing') return;
    setSyncStep(0);
    const timers = SYNC_STEPS.map((_, i) =>
      setTimeout(() => {
        setSyncStep(i + 1);
        if (i === SYNC_STEPS.length - 1) {
          setTimeout(() => {
            setStep('connected');
            onConnected();
          }, 600);
        }
      }, (i + 1) * 800),
    );
    return () => timers.forEach(clearTimeout);
  }, [step, onConnected]);

  // --- Progress indicator ---
  const stepIndex = step === 'prepare' ? 0 : step === 'scan' ? 1 : 2;
  const steps = ['Preparar', 'Escanear', 'Pronto'] as const;

  const countdownPct = (countdown / QR_TIMEOUT_SECONDS) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Back */}
      {step !== 'connected' && step !== 'syncing' && (
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      )}

      {/* Progress bar */}
      <div className="flex items-center justify-center gap-0 mb-8">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div className={cn('w-16 h-0.5 mx-1', i <= stepIndex ? 'bg-primary' : 'bg-border')} />
            )}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                i < stepIndex ? 'bg-primary text-primary-foreground' :
                i === stepIndex ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground',
              )}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={cn(
                'text-xs font-medium',
                i <= stepIndex ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ===== STEP: PREPARE ===== */}
      {step === 'prepare' && (
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6">
            <Smartphone className="h-10 w-10 text-green-600" />
          </div>

          <h2 className="text-xl font-semibold mb-2">Pegue seu celular</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm">
            Vamos conectar seu WhatsApp em 3 passos simples.
          </p>

          <div className="w-full max-w-sm text-left space-y-3 mb-8">
            {[
              'Abra o WhatsApp no celular',
              'Toque em ⋮ → Aparelhos conectados',
              'Toque em Conectar dispositivo',
            ].map((text, i) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground">{text}</p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground max-w-sm mb-8">
            Funciona igual ao WhatsApp Web. Suas conversas pessoais continuam privadas.
          </div>

          <Button
            size="lg"
            className="w-full max-w-sm bg-green-600 hover:bg-green-700"
            onClick={handleReady}
            disabled={qrState === 'loading'}
          >
            {qrState === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Preparando...
              </>
            ) : (
              'Estou pronto'
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-3">
            Usa WhatsApp Business? Também funciona.
          </p>
        </div>
      )}

      {/* ===== STEP: SCAN ===== */}
      {step === 'scan' && (
        <div className="flex-1 flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-2">Escaneie o QR code</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Aponte a câmera do celular para o código abaixo.
          </p>

          <div className="w-72 h-72 rounded-2xl border-2 bg-white flex items-center justify-center relative overflow-hidden">
            {qrState === 'loading' && (
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Gerando QR code...</p>
              </div>
            )}

            {qrState === 'ready' && qrCode && (
              <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 object-contain" />
            )}

            {qrState === 'expired' && (
              <div className="text-center p-4">
                <Clock className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">QR expirou</p>
                <p className="text-xs text-muted-foreground mb-4">Gere um novo para continuar.</p>
                <Button size="sm" onClick={() => { void regenerateQR(); }}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Gerar novo QR
                </Button>
              </div>
            )}

            {qrState === 'error' && (
              <div className="text-center p-4">
                <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <p className="text-sm text-red-600 mb-1">
                  {errorMsg || 'Não foi possível gerar o QR code.'}
                </p>
                <p className="text-xs text-muted-foreground mb-4">Isso é temporário.</p>
                <Button size="sm" variant="outline" onClick={() => { void regenerateQR(); }}>
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>

          {/* Countdown bar */}
          {qrState === 'ready' && (
            <div className="w-72 mt-3 space-y-1.5">
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    countdownPct > 30 ? 'bg-green-500' : countdownPct > 15 ? 'bg-amber-500' : 'bg-red-500',
                  )}
                  style={{ width: `${countdownPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                QR válido por {countdown}s
              </p>
            </div>
          )}

          {/* Back to step 1 */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-6"
            onClick={() => { cleanup(); setStep('prepare'); }}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Voltar
          </Button>
        </div>
      )}

      {/* ===== STEP: SYNCING ===== */}
      {step === 'syncing' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-semibold mb-8">Conectando seu WhatsApp...</h2>

          <div className="w-full max-w-xs space-y-4">
            {SYNC_STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                {i < syncStep ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : i === syncStep ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted flex-shrink-0" />
                )}
                <span className={cn(
                  'text-sm',
                  i < syncStep ? 'text-foreground' :
                  i === syncStep ? 'text-foreground font-medium' :
                  'text-muted-foreground',
                )}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== STEP: CONNECTED ===== */}
      {step === 'connected' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-9 w-9 text-green-500" />
          </div>

          <h2 className="text-xl font-semibold mb-2">WhatsApp conectado!</h2>

          {phoneNumber && (
            <div className="px-4 py-2 rounded-lg bg-muted/50 border mb-6">
              <p className="text-sm font-medium">📱 {phoneNumber}</p>
              <p className="text-xs text-green-600">● Conectado agora</p>
            </div>
          )}

          <div className="w-full max-w-sm text-left space-y-2 mb-8 p-4 rounded-lg bg-muted/30 border">
            <p className="text-sm font-medium mb-3">O que acontece agora:</p>
            {[
              'Mensagens dos clientes chegam aqui no Jurify',
              'A IA responde automaticamente fora do horário',
              'Leads são criados para cada novo contato',
            ].map((text) => (
              <div key={text} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <div className="w-full max-w-sm space-y-2">
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => navigate('/whatsapp')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Ir para Conversas
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppWizard;

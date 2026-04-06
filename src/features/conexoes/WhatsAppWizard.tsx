import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertTriangle, ExternalLink,
  CheckCircle2, MessageSquare, Shield, Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

const log = createLogger('WhatsAppWizard');

type WizardStep = 'api-key' | 'prepare' | 'connecting' | 'syncing' | 'connected';
type SetupState = 'idle' | 'loading' | 'ready' | 'error';

interface WhatsAppWizardProps {
  onClose: () => void;
  onConnected: () => void;
}

const POLL_INTERVAL_MS = 5000;

const SYNC_STEPS = [
  'Conta verificada',
  'Número confirmado',
  'Configurando atendimento automático',
  'Pronto!',
] as const;

const WhatsAppWizard = ({ onClose, onConnected }: WhatsAppWizardProps) => {
  const navigate = useNavigate();

  const [step, setStep] = useState<WizardStep>('api-key');
  const [setupState, setSetupState] = useState<SetupState>('idle');
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncStep, setSyncStep] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);

  // API key step
  const [apiKey, setApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // --- On mount: check if tenant already has a valid API key ---
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.functions.invoke('kapso-manager', {
          body: { action: 'health' },
        });
        if (data?.hasApiKey && data?.success) {
          // Already has valid key — skip to prepare step
          setStep('prepare');
        } else if (data?.hasApiKey && !data?.success) {
          // Has key but it's invalid
          setKeyError('Sua API key está inválida. Atualize abaixo.');
        }
      } catch {
        // No key configured — show api-key step
      }
    })();
  }, []);

  // --- Save API key ---
  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setKeyError('Cole sua API key da Kapso.');
      return;
    }

    setSavingKey(true);
    setKeyError(null);

    try {
      const { data, error } = await supabase.functions.invoke('kapso-manager', {
        body: { action: 'save-key', apiKey: apiKey.trim() },
      });

      if (error || !data?.success) {
        setKeyError(data?.error || 'Não foi possível validar a API key.');
        return;
      }

      setStep('prepare');
    } catch {
      setKeyError('Erro ao salvar API key. Tente novamente.');
    } finally {
      setSavingKey(false);
    }
  };

  // --- Check status on window refocus ---
  useEffect(() => {
    if (step !== 'connecting') return;

    const checkStatus = () => {
      void (async () => {
        try {
          const { data } = await supabase.functions.invoke('kapso-manager', {
            body: { action: 'status' },
          });
          if (data?.connected) {
            cleanup();
            setStep('syncing');
          }
        } catch (err) {
          log.warn('status poll failed', { error: String(err) });
        }
      })();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkStatus();
    };

    window.addEventListener('focus', checkStatus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', checkStatus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [step, cleanup]);

  // --- Generate setup link ---
  const generateSetupLink = useCallback(async () => {
    setSetupState('loading');
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.functions.invoke('kapso-manager', {
        body: { action: 'setup' },
      });

      if (data?.needsApiKey) {
        setStep('api-key');
        return;
      }

      if (error || !data?.success || !data?.setupUrl) {
        throw new Error(data?.error || 'Não foi possível preparar a conexão.');
      }

      setSetupUrl(data.setupUrl as string);
      setSetupState('ready');
    } catch (err) {
      log.error('generateSetupLink failed', err);
      setSetupState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível preparar a conexão.');
    }
  }, []);

  useEffect(() => {
    if (step === 'prepare') void generateSetupLink();
  }, [step, generateSetupLink]);

  // --- Open setup link + start polling ---
  const handleConnect = () => {
    if (!setupUrl) return;
    window.open(setupUrl, '_blank', 'noopener');
    setPopupOpen(true);
    setStep('connecting');

    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const { data } = await supabase.functions.invoke('kapso-manager', {
            body: { action: 'status' },
          });
          if (data?.connected) {
            cleanup();
            setStep('syncing');
          }
        } catch {
          // ignore poll errors
        }
      })();
    }, POLL_INTERVAL_MS);
  };

  // --- Manual finalize ---
  const handleFinished = () => {
    setPopupOpen(false);
    void (async () => {
      try {
        await supabase.functions.invoke('kapso-manager', {
          body: { action: 'finalize' },
        });
      } catch {
        // ignore
      }
      setStep('syncing');
    })();
  };

  // --- Sync animation ---
  useEffect(() => {
    if (step !== 'syncing') return;
    cleanup();
    setSyncStep(0);
    const timers = SYNC_STEPS.map((_, i) =>
      setTimeout(() => {
        setSyncStep(i + 1);
        if (i === SYNC_STEPS.length - 1) {
          setTimeout(() => { setStep('connected'); onConnected(); }, 600);
        }
      }, (i + 1) * 800),
    );
    return () => timers.forEach(clearTimeout);
  }, [step, onConnected, cleanup]);

  // --- Progress bar ---
  const allSteps = ['API Key', 'Preparar', 'Conectar', 'Pronto'] as const;
  const stepIndex = step === 'api-key' ? 0 : step === 'prepare' ? 1 : step === 'connecting' ? 2 : 3;

  return (
    <div className="flex flex-col h-full">
      {/* Back */}
      {step !== 'connected' && step !== 'syncing' && (
        <button type="button" onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      )}

      {/* Progress bar */}
      <div className="flex items-center justify-center gap-0 mb-8">
        {allSteps.map((label, i) => (
          <div key={label} className="flex items-center">
            {i > 0 && <div className={cn('w-12 h-0.5 mx-1', i <= stepIndex ? 'bg-primary' : 'bg-border')} />}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                i <= stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={cn('text-xs font-medium hidden sm:inline',
                i <= stepIndex ? 'text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ===== STEP: API KEY ===== */}
      {step === 'api-key' && (
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
            <Key className="h-10 w-10 text-blue-600" />
          </div>

          <h2 className="text-xl font-semibold mb-2">Configure sua conta Kapso</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            O Jurify usa a Kapso como motor do WhatsApp. Crie sua conta gratuita e cole a API key abaixo.
          </p>

          <div className="w-full max-w-sm space-y-4 text-left mb-6">
            <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
              <p className="text-sm font-medium">Como obter sua API key:</p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Acesse <a href="https://app.kapso.ai" target="_blank" rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline">app.kapso.ai</a> e crie sua conta (grátis)</li>
                <li>Vá em <strong>Settings → API Keys</strong></li>
                <li>Copie sua API key e cole abaixo</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kapso-key" className="text-sm font-medium">API Key da Kapso</Label>
              <Input
                id="kapso-key"
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setKeyError(null); }}
                placeholder="kps_..."
                className="font-mono text-sm"
              />
            </div>

            {keyError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{keyError}</p>
                </div>
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="w-full max-w-sm"
            onClick={() => { void handleSaveKey(); }}
            disabled={savingKey || !apiKey.trim()}
          >
            {savingKey ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validando...</>
            ) : (
              <>Salvar e Continuar</>
            )}
          </Button>

          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>Sua API key é armazenada com segurança e usada apenas para este escritório.</span>
          </div>
        </div>
      )}

      {/* ===== STEP: PREPARE ===== */}
      {step === 'prepare' && (
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6">
            <svg className="h-10 w-10 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold mb-2">Conectar WhatsApp</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm">
            Conecte seu número WhatsApp Business ao Jurify em poucos cliques.
          </p>

          <div className="w-full max-w-sm text-left space-y-3 mb-8">
            {[
              'Você será direcionado para autenticar com o WhatsApp',
              'Selecione o número que deseja conectar',
              'Confirme e pronto — o Jurify faz o resto',
            ].map((text, i) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground max-w-sm mb-8">
            <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span>Conexão segura e criptografada. Apenas seu escritório tem acesso.</span>
          </div>

          {setupState === 'error' && (
            <div className="w-full max-w-sm mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            </div>
          )}

          <Button size="lg" className="w-full max-w-sm bg-green-600 hover:bg-green-700"
            onClick={handleConnect}
            disabled={setupState === 'loading' || setupState === 'error'}>
            {setupState === 'loading' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Preparando...</>
            ) : setupState === 'error' ? 'Conexão indisponível' : (
              <><ExternalLink className="h-4 w-4 mr-2" />Conectar WhatsApp</>
            )}
          </Button>

          {setupState === 'error' && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => { void generateSetupLink(); }}>
              Tentar novamente
            </Button>
          )}
        </div>
      )}

      {/* ===== STEP: CONNECTING ===== */}
      {step === 'connecting' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
            <ExternalLink className="h-10 w-10 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Aguardando conexão...</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm">
            Complete a autenticação na janela que foi aberta. Quando terminar, volte aqui.
          </p>
          {popupOpen && (
            <div className="flex items-center gap-2 mb-6">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Verificando conexão automaticamente...</span>
            </div>
          )}
          <div className="w-full max-w-sm space-y-2">
            <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" onClick={handleFinished}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Já finalizei a conexão
            </Button>
            <Button variant="outline" size="lg" className="w-full"
              onClick={() => { if (setupUrl) window.open(setupUrl, '_blank', 'noopener'); }}>
              <ExternalLink className="h-4 w-4 mr-2" /> Abrir novamente
            </Button>
            <Button variant="ghost" size="sm" className="w-full mt-2"
              onClick={() => { cleanup(); setStep('prepare'); }}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Voltar
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP: SYNCING ===== */}
      {step === 'syncing' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-semibold mb-8">Conectando seu WhatsApp...</h2>
          <div className="w-full max-w-xs space-y-4">
            {SYNC_STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                {i < syncStep ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  : i === syncStep ? <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                  : <div className="w-5 h-5 rounded-full border-2 border-muted flex-shrink-0" />}
                <span className={cn('text-sm',
                  i < syncStep ? 'text-foreground' :
                  i === syncStep ? 'text-foreground font-medium' : 'text-muted-foreground')}>
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
          <p className="text-sm text-muted-foreground mb-6">
            Seu número está pronto para receber mensagens.
          </p>
          <div className="w-full max-w-sm text-left space-y-2 mb-8 p-4 rounded-lg bg-muted/30 border">
            <p className="text-sm font-medium mb-3">O que acontece agora:</p>
            {['Mensagens dos clientes chegam aqui no Jurify',
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
            <Button size="lg" className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => navigate('/whatsapp')}>
              <MessageSquare className="h-4 w-4 mr-2" /> Ir para Conversas
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppWizard;

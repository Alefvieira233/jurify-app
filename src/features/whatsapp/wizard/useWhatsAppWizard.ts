import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import type { WizardStep, SetupState } from './types';
import { SYNC_STEPS } from './types';

const log = createLogger('WhatsAppWizard');

const POLL_INTERVAL_MS = 5000;

export function useWhatsAppWizard(onConnected: () => void) {
  // Default: 'prepare' — Partner mode (master key Jurify) cobre tudo.
  // Caímos em 'api-key' apenas como fallback se backend retornar needsApiKey.
  const [step, setStep] = useState<WizardStep>('prepare');
  const [setupState, setSetupState] = useState<SetupState>('idle');
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncStep, setSyncStep] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const [hasExistingKey, setHasExistingKey] = useState(false);

  // Health check just informs UX; default flow segue para 'prepare' e
  // generateSetupLink resolve. Se backend retornar needsApiKey, caímos em fallback.
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.functions.invoke('kapso-manager', {
          body: { action: 'health' },
        });
        if (data?.hasApiKey) setHasExistingKey(true);
      } catch {
        // ignore — fallback será detectado em generateSetupLink
      }
    })();
  }, []);

  // Allow user to go back to API key step to change the key
  const changeApiKey = useCallback(() => {
    setHasExistingKey(false);
    setStep('api-key');
    setApiKey('');
    setKeyError(null);
  }, []);

  // Save API key
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

  // Check status on window refocus (connecting step)
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

  // Generate setup link
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

  // Open setup link + start polling
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

  // Manual finalize
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

  // Sync animation
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

  const handleBackFromConnecting = () => {
    cleanup();
    setStep('prepare');
  };

  const handleReopenSetupUrl = () => {
    if (setupUrl) window.open(setupUrl, '_blank', 'noopener');
  };

  return {
    step,
    setupState,
    setupUrl,
    errorMsg,
    syncStep,
    popupOpen,
    apiKey,
    setApiKey,
    savingKey,
    keyError,
    setKeyError,
    hasExistingKey,
    handleSaveKey,
    handleConnect,
    handleFinished,
    handleBackFromConnecting,
    handleReopenSetupUrl,
    generateSetupLink,
    changeApiKey,
  };
}

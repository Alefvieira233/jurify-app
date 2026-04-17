import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/logger';

const log = createLogger('OnboardingWizard');
import {
  WelcomeStep,
  EscritorioStep,
  EquipeStep,
  PlanoStep,
  WhatsAppStep,
  AgentsStep,
  DoneStep,
} from './steps/index';

/**
 * Ordered wizard steps. The length drives the progress bar, dots, and the
 * Done step copy. To reorder or insert a step, change this array only.
 */
const STEP_IDS = [
  'welcome',
  'escritorio',
  'equipe',
  'plano',
  'whatsapp',
  'agents',
  'done',
] as const;
type StepId = (typeof STEP_IDS)[number];

const STEP_LABELS: Record<StepId, string> = {
  welcome: 'Boas-vindas',
  escritorio: 'Escritorio',
  equipe: 'Equipe',
  plano: 'Plano',
  whatsapp: 'WhatsApp',
  agents: 'Agentes',
  done: 'Pronto',
};

const TOTAL_STEPS = STEP_IDS.length;
const CONFETTI_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

/**
 * Full-screen onboarding wizard displayed once for new users.
 * Progress is tracked granularly in `profiles.onboarding_step` (Onda 2),
 * and final completion lives in `system_settings.onboarding_wizard_completed`
 * for back-compat with existing dashboards.
 */
const OnboardingWizard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;
  const userId = user?.id ?? null;
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: shouldShow, isLoading } = useQuery({
    queryKey: queryKeys.onboardingWizard.detail(tenantId),
    queryFn: async (): Promise<{ show: boolean; resumeStep: number }> => {
      if (!tenantId || !userId) return { show: false, resumeStep: 0 };
      const { data: settings } = await supabase
        .from('system_settings')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'onboarding_wizard_completed')
        .maybeSingle();
      const completed = settings?.value === 'true';
      if (completed) return { show: false, resumeStep: 0 };

      // Resume from saved step (column added in migration 20260417000010).
      // Wrapped so a missing column during local rollout degrades gracefully.
      let resume = 0;
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('onboarding_step')
          .eq('id', userId)
          .maybeSingle();
        const raw = (prof as { onboarding_step?: number } | null)?.onboarding_step;
        if (typeof raw === 'number' && raw >= 0 && raw < TOTAL_STEPS) {
          resume = raw;
        }
      } catch (err) {
        log.warn('resume lookup failed', { error: String(err) });
      }

      return { show: true, resumeStep: resume };
    },
    enabled: !!user && !!tenantId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Hydrate the starting step from persisted progress (once).
  useEffect(() => {
    if (shouldShow?.show && shouldShow.resumeStep > 0) {
      setStep(shouldShow.resumeStep);
    }
  }, [shouldShow]);

  const persistStep = useCallback(
    async (next: number) => {
      if (!userId) return;
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_step: next } as never)
          .eq('id', userId);
      } catch (err) {
        log.warn('persistStep failed', { error: String(err) });
      }
    },
    [userId],
  );

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      await supabase.from('system_settings').upsert(
        {
          tenant_id: tenantId,
          key: 'onboarding_wizard_completed',
          value: 'true',
          category: 'sistema',
          description: 'Wizard de onboarding concluido',
        },
        { onConflict: 'tenant_id,key' },
      );
      if (userId) {
        try {
          await supabase
            .from('profiles')
            .update({ onboarding_step: TOTAL_STEPS } as never)
            .eq('id', userId);
        } catch (err) {
          log.warn('mark completed on profile failed', { error: String(err) });
        }
      }
      try {
        await supabase
          .from('tenants')
          .update({ onboarding_completed_at: new Date().toISOString() } as never)
          .eq('id', tenantId);
      } catch (err) {
        log.warn('tenant completed_at failed', { error: String(err) });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboardingWizard.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus.all });
    },
    onError: (err) => {
      log.error('complete failed', err);
    },
  });

  useEffect(() => {
    if (step !== TOTAL_STEPS - 1) return;
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [step]);

  const goTo = useCallback(
    (next: number) => {
      setStep(next);
      void persistStep(next);
    },
    [persistStep],
  );

  const goNext = useCallback(() => {
    goTo(Math.min(step + 1, TOTAL_STEPS - 1));
  }, [goTo, step]);

  const goBack = useCallback(() => {
    goTo(Math.max(step - 1, 0));
  }, [goTo, step]);

  const markComplete = useCallback(
    () => completeMutation.mutate(),
    [completeMutation],
  );

  const handleFinish = useCallback(() => {
    setDismissed(true);
    markComplete();
    navigate('/');
  }, [markComplete, navigate]);

  const handleNavigateAway = useCallback(
    (path: string) => {
      setDismissed(true);
      markComplete();
      navigate(path);
    },
    [markComplete, navigate],
  );

  if (isLoading || !shouldShow?.show || dismissed) return null;

  const currentId: StepId = STEP_IDS[step];
  const progressWidth = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-md overflow-y-auto py-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-primary/3 blur-3xl animate-pulse [animation-delay:1.5s]" />
      </div>

      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="absolute block w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${Math.random() * 1.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <Card
        className="relative w-full max-w-xl mx-4 border-border/50 bg-card/95 shadow-2xl overflow-hidden"
        role="dialog"
        aria-label={`Onboarding Jurify — passo ${step + 1} de ${TOTAL_STEPS}: ${STEP_LABELS[currentId]}`}
      >
        {/* Progress bar */}
        <div className="h-1 bg-muted w-full">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressWidth}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={step + 1}
            aria-label={`Passo ${step + 1} de ${TOTAL_STEPS}`}
          />
        </div>

        {/* Step content */}
        <div className="p-5 sm:p-8 min-h-[420px] flex flex-col">
          {currentId === 'welcome' && <WelcomeStep onNext={goNext} />}
          {currentId === 'escritorio' && <EscritorioStep onNext={goNext} onSkip={goNext} />}
          {currentId === 'equipe' && <EquipeStep onNext={goNext} onSkip={goNext} />}
          {currentId === 'plano' && <PlanoStep onNext={goNext} onSkip={goNext} />}
          {currentId === 'whatsapp' && (
            <WhatsAppStep onNext={goNext} onNavigate={handleNavigateAway} />
          )}
          {currentId === 'agents' && (
            <AgentsStep onNext={goNext} onNavigate={handleNavigateAway} />
          )}
          {currentId === 'done' && (
            <DoneStep onComplete={handleFinish} isPending={completeMutation.isPending} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-8 pb-6 flex items-center justify-between gap-2">
          {step > 0 && step < TOTAL_STEPS - 1 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1"
              onClick={goBack}
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
          ) : (
            <span />
          )}

          {step === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-xs"
              onClick={handleFinish}
            >
              Pular configuracao
            </Button>
          )}

          {/* Step dots + count */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted-foreground/20'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          {step > 0 && step < TOTAL_STEPS - 1 && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {step + 1}/{TOTAL_STEPS}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OnboardingWizard;

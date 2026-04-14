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
import { WelcomeStep, WhatsAppStep, AgentsStep, DoneStep } from './steps';

const TOTAL_STEPS = 4;
const CONFETTI_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

/**
 * Full-screen onboarding wizard displayed once for new users.
 * Tracks completion via `system_settings.onboarding_wizard_completed`.
 */
const OnboardingWizard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: shouldShow, isLoading } = useQuery({
    queryKey: queryKeys.onboardingWizard.detail(tenantId),
    queryFn: async (): Promise<boolean> => {
      if (!tenantId) return false;
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'onboarding_wizard_completed')
        .maybeSingle();
      return !data || data.value !== 'true';
    },
    enabled: !!user && !!tenantId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      await supabase.from('system_settings').upsert({
        tenant_id: tenantId,
        key: 'onboarding_wizard_completed',
        value: 'true',
        category: 'sistema',
        description: 'Wizard de onboarding concluido',
      }, { onConflict: 'tenant_id,key' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboardingWizard.all });
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

  const markComplete = useCallback(() => completeMutation.mutate(), [completeMutation]);

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

  if (isLoading || !shouldShow || dismissed) return null;

  const progressWidth = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-md">
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

      <Card className="relative w-full max-w-xl mx-4 border-border/50 bg-card/95 shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted w-full">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {/* Step content */}
        <div className="p-8 min-h-[400px] flex flex-col">
          {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
          {step === 1 && <WhatsAppStep onNext={() => setStep(2)} onNavigate={handleNavigateAway} />}
          {step === 2 && <AgentsStep onNext={() => setStep(3)} onNavigate={handleNavigateAway} />}
          {step === 3 && <DoneStep onComplete={handleFinish} isPending={completeMutation.isPending} />}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 flex items-center justify-between">
          {step > 0 && step < TOTAL_STEPS - 1 ? (
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
          ) : <span />}

          {step === 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={handleFinish}>
              Pular configuracao
            </Button>
          )}

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>

          {step > 0 && step < TOTAL_STEPS - 1 && (
            <span className="text-xs text-muted-foreground">{step + 1}/{TOTAL_STEPS}</span>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OnboardingWizard;

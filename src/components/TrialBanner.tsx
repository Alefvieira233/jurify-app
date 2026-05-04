import { Link } from 'react-router-dom';
import { AlertCircle, Sparkles, Clock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TrialBanner = () => {
  const { status, isLoading, isTrialing, isExpired, daysRemaining } = useSubscription();

  if (isLoading || !status) return null;
  if (!status.has_subscription) return null;
  if (status.plan_tier && !status.is_trial && !isExpired) return null;

  if (isExpired) {
    return (
      <div className="w-full bg-gradient-to-r from-rose-500/10 via-red-500/15 to-rose-500/10 border-b border-rose-500/30">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-medium text-rose-900 dark:text-rose-200">
              Seu trial expirou
            </span>
            <span className="text-rose-700 dark:text-rose-300/80 hidden sm:inline">
              — você ainda vê seus dados, mas não pode criar novos leads, contratos ou responder no WhatsApp.
            </span>
          </div>
          <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
            <Link to="/pricing">Assinar agora</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isTrialing && daysRemaining !== null && daysRemaining !== undefined) {
    const urgent = daysRemaining <= 7;
    const veryUrgent = daysRemaining <= 3;
    return (
      <div className={cn(
        'w-full border-b transition-colors',
        veryUrgent && 'bg-amber-500/15 border-amber-500/40',
        urgent && !veryUrgent && 'bg-amber-500/10 border-amber-500/30',
        !urgent && 'bg-primary/5 border-primary/20',
      )}>
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {veryUrgent ? (
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
            )}
            <span className="font-medium">
              {daysRemaining > 0 ? (
                <>
                  Trial gratuito: <span className={cn(veryUrgent && 'text-amber-700 dark:text-amber-300')}>
                    {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                  </span>
                </>
              ) : (
                <span className="text-amber-700 dark:text-amber-300">Último dia do trial</span>
              )}
            </span>
            <span className="text-muted-foreground hidden md:inline">
              — WhatsApp + IA + leads ilimitados nesta janela.
            </span>
          </div>
          <Button asChild size="sm" variant={urgent ? 'default' : 'outline'}>
            <Link to="/pricing">Ver planos</Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default TrialBanner;

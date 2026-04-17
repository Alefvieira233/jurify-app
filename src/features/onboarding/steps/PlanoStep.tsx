import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  ArrowRight,
  SkipForward,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/logger';

const log = createLogger('PlanoStep');

interface PlanRow {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  stripe_price_id_monthly: string | null;
  features: unknown;
}

function formatPrice(cents: number | null): string {
  if (!cents || cents === 0) return 'Gratis';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function toFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}

interface PlanoStepProps {
  onNext: () => void;
  onSkip: () => void;
}

const PlanoStep = ({ onNext, onSkip }: PlanoStepProps) => {
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: queryKeys.subscriptionPlans.list(),
    queryFn: async (): Promise<PlanRow[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, tier, name, description, price_monthly, stripe_price_id_monthly, features')
        .eq('ativo', true)
        .order('price_monthly', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlanRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const sortedPlans = useMemo(() => {
    if (!plans) return [];
    const order = ['free', 'pro', 'enterprise'];
    return [...plans].sort(
      (a, b) => order.indexOf(a.tier) - order.indexOf(b.tier),
    );
  }, [plans]);

  const handleSelect = async (plan: PlanRow) => {
    if (plan.tier === 'free' || !plan.price_monthly) {
      onNext();
      return;
    }
    const priceId =
      plan.stripe_price_id_monthly && !plan.stripe_price_id_monthly.startsWith('price_PLACEHOLDER')
        ? plan.stripe_price_id_monthly
        : undefined;
    if (!priceId) {
      toast({
        title: 'Plano em configuracao',
        description: 'Este plano ainda nao tem preco publicado. Continue gratuito e assine mais tarde.',
      });
      onNext();
      return;
    }

    setUpgrading(plan.tier);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planId: plan.tier, priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      onNext();
    } catch (err) {
      log.error('checkout failed', err);
      toast({
        title: 'Nao foi possivel iniciar o checkout',
        description: 'Voce pode continuar gratuito e assinar mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setUpgrading(null);
    }
  };

  useEffect(() => {
    // no-op; plans are queried via react-query
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <CreditCard className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Escolha seu plano
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Voce pode comecar gratis e fazer upgrade quando precisar.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sortedPlans.map((plan) => {
            const features = toFeatures(plan.features);
            const isFree = plan.tier === 'free';
            const isPro = plan.tier === 'pro';
            return (
              <Card
                key={plan.id}
                className={`p-4 flex flex-col gap-3 ${
                  isPro ? 'border-primary shadow-md' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{plan.name}</h3>
                  {isPro && (
                    <Badge className="gap-1 text-[10px]">
                      <Sparkles className="w-3 h-3" />
                      Recomendado
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {formatPrice(plan.price_monthly)}
                  </span>
                  {plan.price_monthly ? (
                    <span className="text-xs text-muted-foreground">/mes</span>
                  ) : null}
                </div>
                {plan.description ? (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                ) : null}
                <ul className="space-y-1.5 flex-1">
                  {features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px]">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant={isPro ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => void handleSelect(plan)}
                  disabled={upgrading !== null}
                >
                  {upgrading === plan.tier ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFree ? (
                    'Continuar gratis'
                  ) : (
                    'Assinar'
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 mt-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1"
          onClick={onSkip}
        >
          <SkipForward className="w-4 h-4" />
          Pular por agora
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={onNext}
        >
          Decidir depois
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default PlanoStep;

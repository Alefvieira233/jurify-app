import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { usePageTitle } from '@/hooks/usePageTitle';

const log = createLogger('SubscriptionManager');

export interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface UsageLimits {
  ai_calls: { used: number; limit: number };
  leads: { used: number; limit: number };
  users: { used: number; limit: number };
  storage_mb: { used: number; limit: number };
}

const FREE_LIMITS: UsageLimits = {
  ai_calls: { used: 0, limit: 50 },
  leads: { used: 0, limit: 100 },
  users: { used: 0, limit: 2 },
  storage_mb: { used: 0, limit: 100 },
};

const PLAN_LIMITS: Record<string, UsageLimits> = {
  free: FREE_LIMITS,
  pro: {
    ai_calls: { used: 0, limit: 500 },
    leads: { used: 0, limit: 1000 },
    users: { used: 0, limit: 10 },
    storage_mb: { used: 0, limit: 1000 },
  },
  enterprise: {
    ai_calls: { used: 0, limit: -1 },
    leads: { used: 0, limit: -1 },
    users: { used: 0, limit: -1 },
    storage_mb: { used: 0, limit: 10000 },
  },
};

function getPriceMap(): Record<string, string | undefined> {
  return {
    pro: import.meta.env.VITE_STRIPE_PRICE_PRO,
    enterprise: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE,
  };
}

export function usePlans() {
  usePageTitle('Assinatura');
  const { profile } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  const currentPlan = subscription?.plan_id || profile?.subscription_tier || 'free';

  const loadSubscriptionData = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('id, plan_id, status, current_period_end, cancel_at_period_end')
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle();

      if (subData) setSubscription(subData);

      const tenantId = profile.tenant_id;
      if (!tenantId) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        { count: aiCalls },
        { count: leadsCount },
        { count: usersCount },
      ] = await Promise.all([
        supabase
          .from('agent_ai_logs')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
      ]);

      let storageMbUsed = 0;
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        for (const bucket of buckets ?? []) {
          const { data: files } = await supabase.storage
            .from(bucket.name)
            .list(`${tenantId}/`, { limit: 1000 });
          for (const f of files ?? []) {
            storageMbUsed += (f.metadata?.size ?? 0) / (1024 * 1024);
          }
        }
      } catch (err) {
        log.warn('storage query failed', { error: String(err) });
        storageMbUsed = 0;
      }

      const planLimits = PLAN_LIMITS[currentPlan] ?? FREE_LIMITS;
      setUsage({
        ai_calls: { ...planLimits.ai_calls, used: aiCalls ?? 0 },
        leads: { ...planLimits.leads, used: leadsCount ?? 0 },
        users: { ...planLimits.users, used: usersCount ?? 0 },
        storage_mb: { ...planLimits.storage_mb, used: Math.round(storageMbUsed * 10) / 10 },
      });
    } catch (error) {
      log.error('Error loading subscription', error);
    } finally {
      setLoading(false);
    }
  }, [profile, currentPlan]);

  useEffect(() => {
    void loadSubscriptionData();
  }, [loadSubscriptionData]);

  const handleUpgrade = async (newPlan: string) => {
    const priceId = getPriceMap()[newPlan];
    if (!priceId) {
      toast({
        title: 'Plano indisponível',
        description: 'Este plano não está disponível no momento. Entre em contato com o suporte.',
        variant: 'destructive',
      });
      return;
    }

    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planId: newPlan, priceId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      log.error('Upgrade error', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o upgrade. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUpgrading(false);
    }
  };

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { returnUrl: window.location.href },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      log.error('Portal error', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir o portal de assinatura. Verifique se você possui uma assinatura ativa.',
        variant: 'destructive',
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  return {
    subscription,
    usage,
    loading,
    upgrading,
    openingPortal,
    currentPlan,
    handleUpgrade,
    handleOpenPortal,
  };
}

export function getUsagePercentage(used: number, limit: number): number {
  if (limit === -1) return 0;
  return Math.min((used / limit) * 100, 100);
}

export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-600';
  if (percentage >= 70) return 'text-yellow-600';
  return 'text-green-600';
}

export function formatLimit(limit: number): string {
  return limit === -1 ? 'Ilimitado' : limit.toLocaleString('pt-BR');
}

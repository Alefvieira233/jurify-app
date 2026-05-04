import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrialRestrictions {
  create_lead: boolean;
  edit_lead: boolean;
  create_processo: boolean;
  edit_processo: boolean;
  create_contrato: boolean;
  edit_contrato: boolean;
  send_whatsapp: boolean;
  ai_responder: boolean;
  create_agendamento: boolean;
  create_documento: boolean;
  view_data: boolean;
  receive_whatsapp: boolean;
}

export interface TrialStatus {
  has_subscription: boolean;
  subscription_id?: string;
  tenant_id?: string;
  is_trial: boolean;
  expired: boolean;
  status: 'trialing' | 'expired' | 'active' | 'past_due' | 'canceled' | 'unknown' | 'no_subscription' | 'no_tenant';
  plan_tier?: string;
  plan_name?: string;
  trial_start_date?: string;
  trial_end_date?: string;
  days_remaining?: number | null;
  usage_limits?: Record<string, number>;
  restrictions: TrialRestrictions;
}

const DEFAULT_RESTRICTIVE: TrialRestrictions = {
  create_lead: false, edit_lead: false,
  create_processo: false, edit_processo: false,
  create_contrato: false, edit_contrato: false,
  send_whatsapp: false, ai_responder: false,
  create_agendamento: false, create_documento: false,
  view_data: true, receive_whatsapp: true,
};

const DEFAULT_PERMISSIVE: TrialRestrictions = {
  create_lead: true, edit_lead: true,
  create_processo: true, edit_processo: true,
  create_contrato: true, edit_contrato: true,
  send_whatsapp: true, ai_responder: true,
  create_agendamento: true, create_documento: true,
  view_data: true, receive_whatsapp: true,
};

export function useSubscription() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<TrialStatus>({
    queryKey: ['subscription', 'trial-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trial_status');
      if (error) throw error;
      const parsed = (data ?? {}) as Partial<TrialStatus>;
      return {
        has_subscription: parsed.has_subscription ?? false,
        is_trial: parsed.is_trial ?? false,
        expired: parsed.expired ?? false,
        status: parsed.status ?? 'unknown',
        restrictions: parsed.restrictions ?? DEFAULT_PERMISSIVE,
        ...parsed,
      } as TrialStatus;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const isExpired = data?.expired ?? false;
  const isTrialing = data?.is_trial && !isExpired;
  const daysRemaining = data?.days_remaining ?? null;

  // Sem subscription (legacy/enterprise) = permissivo. Senão usa restrictions do RPC.
  const hasNoSubscription = data && data.has_subscription === false;
  const restrictions: TrialRestrictions = hasNoSubscription
    ? DEFAULT_PERMISSIVE
    : (data?.restrictions && Object.keys(data.restrictions).length > 0
        ? { ...DEFAULT_PERMISSIVE, ...data.restrictions }
        : (isExpired ? DEFAULT_RESTRICTIVE : DEFAULT_PERMISSIVE));

  const can = (action: keyof TrialRestrictions): boolean => restrictions[action] === true;

  return {
    status: data,
    isLoading,
    error,
    refetch,
    isExpired,
    isTrialing,
    daysRemaining,
    restrictions,
    can,
  };
}

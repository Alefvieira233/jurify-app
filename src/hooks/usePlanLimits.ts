import { useState, useEffect, useCallback } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';

const log = createLogger('PlanLimits');

export interface PlanLimits {
  ai_calls: number;
  leads: number;
  users: number;
  storage_mb: number;
}

export interface PlanUsage {
  ai_calls: number;
  leads: number;
  users: number;
  storage_mb: number;
}

export type LimitableResource = 'ai_calls' | 'leads' | 'users' | 'storage_mb';

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { ai_calls: 50, leads: 100, users: 2, storage_mb: 100 },
  pro: { ai_calls: 500, leads: 1000, users: 10, storage_mb: 1000 },
  enterprise: { ai_calls: -1, leads: -1, users: -1, storage_mb: 10000 },
};

const FREE_LIMITS: PlanLimits = PLAN_LIMITS.free!;

interface UsePlanLimitsReturn {
  limits: PlanLimits;
  usage: PlanUsage;
  plan: string;
  loading: boolean;
  canUse: (resource: LimitableResource, amount?: number) => boolean;
  remaining: (resource: LimitableResource) => number;
  percentUsed: (resource: LimitableResource) => number;
  isAtLimit: (resource: LimitableResource) => boolean;
  refresh: () => Promise<void>;
}

export const usePlanLimits = (): UsePlanLimitsReturn => {
  const { profile } = useAuth();
  const [usage, setUsage] = useState<PlanUsage>({ ai_calls: 0, leads: 0, users: 0, storage_mb: 0 });
  const [loading, setLoading] = useState(true);

  const plan = profile?.subscription_tier || 'free';
  const limits = PLAN_LIMITS[plan] ?? FREE_LIMITS;

  const fetchUsage = useCallback(async () => {
    const tenantId = profile?.tenant_id;
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

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

      setUsage({
        ai_calls: aiCalls ?? 0,
        leads: leadsCount ?? 0,
        users: usersCount ?? 0,
        storage_mb: 0,
      });
    } catch (err) {
      log.error('Erro ao carregar uso do plano', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  const canUse = useCallback((resource: LimitableResource, amount = 1): boolean => {
    const limit = limits[resource];
    if (limit === -1) return true; // unlimited
    return usage[resource] + amount <= limit;
  }, [limits, usage]);

  const remaining = useCallback((resource: LimitableResource): number => {
    const limit = limits[resource];
    if (limit === -1) return Infinity;
    return Math.max(0, limit - usage[resource]);
  }, [limits, usage]);

  const percentUsed = useCallback((resource: LimitableResource): number => {
    const limit = limits[resource];
    if (limit === -1) return 0;
    if (limit === 0) return 100;
    return Math.min(100, Math.round((usage[resource] / limit) * 100));
  }, [limits, usage]);

  const isAtLimit = useCallback((resource: LimitableResource): boolean => {
    return !canUse(resource);
  }, [canUse]);

  return {
    limits,
    usage,
    plan,
    loading,
    canUse,
    remaining,
    percentUsed,
    isAtLimit,
    refresh: fetchUsage,
  };
};

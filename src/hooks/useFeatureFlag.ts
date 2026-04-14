/**
 * useFeatureFlag — resolve feature flag pro tenant atual via RPC is_feature_enabled.
 *
 * Uso:
 *   const { enabled, isLoading } = useFeatureFlag('whatsapp_ai_autonomous_scheduling');
 *   if (enabled) { ... }
 *
 * Características:
 *   - staleTime 5min: flag muda raramente, evita consultar RPC toda renderização
 *   - retorna enabled=false se ainda está carregando (fail-safe)
 *   - sem flicker: suspense-free, retorna false até carregar
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';

export interface FeatureFlagResult {
  enabled: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useFeatureFlag(featureName: string): FeatureFlagResult {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.featureFlags.byName(tenantId, featureName),
    queryFn: async (): Promise<boolean> => {
      if (!tenantId) return false;
      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null; error: { message: string } | null }>;
      }).rpc('is_feature_enabled', { _tenant_id: tenantId, _feature_name: featureName });

      if (error) {
        // Fail-safe: na dúvida, flag desligada
        console.warn(`[useFeatureFlag] ${featureName}: ${error.message}`);
        return false;
      }
      return Boolean(data);
    },
    enabled: Boolean(tenantId) && Boolean(featureName),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    enabled: Boolean(data),
    isLoading,
    error: error as Error | null,
  };
}

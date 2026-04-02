import { useMemo } from 'react';
import { isFeatureEnabled, type FeatureFlags } from '@/lib/featureFlags';

/** Hook to check feature flags in components. */
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return useMemo(() => isFeatureEnabled(flag), [flag]);
}

import { useCallback } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';

const log = createLogger('ConsentLog');

export type ConsentType =
  | 'cookies_analytics'
  | 'cookies_marketing'
  | 'cookies_essential'
  | 'terms_of_use'
  | 'privacy_policy'
  | 'data_processing'
  | 'marketing_emails';

export function useConsentLog() {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const logConsent = useCallback(async (
    consentType: ConsentType,
    accepted: boolean,
    metadata?: Record<string, unknown>,
  ) => {
    if (!user || !tenantId) {
      log.debug('Skipping consent log — no user/tenant');
      return;
    }

    try {
      const { error } = await supabase.from('consent_logs').insert([{
        user_id: user.id,
        tenant_id: tenantId,
        consent_type: consentType,
        accepted,
        ip_address: null, // collected server-side if needed
        user_agent: navigator.userAgent,
        metadata: metadata || {},
      }]);

      if (error) {
        log.warn('Failed to log consent (table may not exist yet)', { message: error.message });
      } else {
        log.debug(`Consent logged: ${consentType} = ${accepted}`);
      }
    } catch (err) {
      // Non-critical: don't break UX if consent logging fails
      log.warn('Consent log error', { error: String(err) });
    }
  }, [user, tenantId]);

  return { logConsent };
}

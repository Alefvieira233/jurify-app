/**
 * Simple feature flag system for safe deployments.
 * Flags can be toggled via environment variables or Supabase system_settings.
 */

export interface FeatureFlags {
  /** Enable new WhatsApp AI auto-response (experimental) */
  whatsappAutoResponse: boolean;
  /** Enable Google Calendar sync */
  googleCalendarSync: boolean;
  /** Enable advanced analytics dashboard */
  advancedAnalytics: boolean;
  /** Enable multi-agent AI system */
  multiAgentSystem: boolean;
  /** Enable ZapSign digital signatures */
  zapSignIntegration: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  whatsappAutoResponse: true,
  googleCalendarSync: true,
  advancedAnalytics: true,
  multiAgentSystem: true,
  zapSignIntegration: false,
};

/** Get current feature flags. Environment variables override defaults. */
export function getFeatureFlags(): FeatureFlags {
  return {
    whatsappAutoResponse: envFlag('VITE_FF_WHATSAPP_AUTO', DEFAULT_FLAGS.whatsappAutoResponse),
    googleCalendarSync: envFlag('VITE_FF_GOOGLE_CALENDAR', DEFAULT_FLAGS.googleCalendarSync),
    advancedAnalytics: envFlag('VITE_FF_ADVANCED_ANALYTICS', DEFAULT_FLAGS.advancedAnalytics),
    multiAgentSystem: envFlag('VITE_FF_MULTI_AGENT', DEFAULT_FLAGS.multiAgentSystem),
    zapSignIntegration: envFlag('VITE_FF_ZAPSIGN', DEFAULT_FLAGS.zapSignIntegration),
  };
}

function envFlag(key: string, fallback: boolean): boolean {
  const val = import.meta.env[key];
  if (val === undefined || val === '') return fallback;
  return val === 'true' || val === '1';
}

/** Check if a specific feature is enabled. */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return getFeatureFlags()[flag];
}

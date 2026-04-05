/**
 * Centralized rate limit configuration for all Edge Functions.
 * Change limits here instead of scattered across 25+ functions.
 *
 * Format: { requests: max requests, window: seconds }
 */

export const RATE_LIMITS = {
  // AI/LLM endpoints (expensive, token-consuming)
  ai: { requests: 10, window: 60 },
  'ai-agent-processor': { requests: 5, window: 60 },
  'chat-completion': { requests: 10, window: 60 },
  assistant: { requests: 10, window: 60 },
  'generate-embedding': { requests: 20, window: 60 },
  'vector-search': { requests: 20, window: 60 },

  // Document processing (I/O heavy)
  'extract-document-text': { requests: 10, window: 60 },
  'generate-document': { requests: 10, window: 60 },
  'ingest-document': { requests: 10, window: 60 },
  'ingest-document-from-file': { requests: 10, window: 60 },

  // WhatsApp (external API, rate limited by Kapso/Meta)
  'kapso-manager': { requests: 15, window: 60 },
  'send-whatsapp-message': { requests: 30, window: 60 },

  // Stripe (payment-critical, low volume)
  'create-checkout-session': { requests: 5, window: 60 },
  'create-portal-session': { requests: 5, window: 60 },

  // Google (OAuth, calendar)
  'google-calendar': { requests: 20, window: 60 },
  'create-drive-folder': { requests: 10, window: 60 },

  // Admin/system
  'admin-create-user': { requests: 5, window: 60 },
  'decrypt-data': { requests: 10, window: 60 },
  'encrypt-data': { requests: 10, window: 60 },
  health: { requests: 30, window: 60 },
  'health-check': { requests: 10, window: 60 },
  'send-email': { requests: 10, window: 60 },
  'send-push-notification': { requests: 20, window: 60 },
  'zapsign-integration': { requests: 10, window: 60 },

  // Default for unlisted functions
  default: { requests: 20, window: 60 },
} as const;

export type RateLimitNamespace = keyof typeof RATE_LIMITS;

/**
 * Get rate limit config for a function.
 * Falls back to 'default' if function name not found.
 */
export function getRateLimit(functionName: string): { requests: number; window: number } {
  return RATE_LIMITS[functionName as RateLimitNamespace] ?? RATE_LIMITS.default;
}

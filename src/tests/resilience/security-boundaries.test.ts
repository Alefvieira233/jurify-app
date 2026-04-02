import { describe, it, expect } from 'vitest';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { toUserMessage } from '@/lib/errorMessages';
import {
  SEARCH_DEBOUNCE_MS,
  SESSION_TIMEOUT_MS,
  API_TIMEOUT_MS,
} from '@/constants/timings';

describe('Security Boundaries', () => {
  it('feature flags default to safe values', () => {
    // ZapSign should be disabled by default (not fully configured)
    expect(isFeatureEnabled('zapSignIntegration')).toBe(false);
    // Core features enabled by default
    expect(isFeatureEnabled('whatsappAutoResponse')).toBe(true);
  });

  it('toUserMessage never returns raw error', () => {
    const rawErrors = [
      'Error: ECONNREFUSED',
      'TypeError: Cannot read properties of undefined',
      'SyntaxError: Unexpected token',
    ];
    for (const raw of rawErrors) {
      const safe = toUserMessage(new Error(raw));
      expect(safe).not.toContain('ECONNREFUSED');
      expect(safe).not.toContain('TypeError');
      expect(safe).not.toContain('SyntaxError');
    }
  });

  it('constants have sensible values', () => {
    expect(SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(200);
    expect(SEARCH_DEBOUNCE_MS).toBeLessThanOrEqual(500);
    expect(SESSION_TIMEOUT_MS).toBeGreaterThanOrEqual(15 * 60 * 1000);
    expect(API_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
  });
});

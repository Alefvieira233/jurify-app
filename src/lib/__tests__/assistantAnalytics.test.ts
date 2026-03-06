import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import {
  trackQuery,
  trackToolUsage,
  trackError,
  getAnalyticsSummary,
  resetMetrics,
} from '../assistantAnalytics';

describe('assistantAnalytics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('getAnalyticsSummary — empty', () => {
    it('returns zeros when no metrics tracked', () => {
      const summary = getAnalyticsSummary();
      expect(summary.totalQueries).toBe(0);
      expect(summary.avgResponseTimeMs).toBe(0);
      expect(summary.p95ResponseTimeMs).toBe(0);
      expect(summary.errorRate).toBe(0);
      expect(summary.queriesPerMinute).toBe(0);
      expect(summary.toolUsageCount).toEqual({});
    });
  });

  describe('trackQuery', () => {
    it('increments totalQueries', () => {
      trackQuery('test query', 100, ['tool1'], true);
      const summary = getAnalyticsSummary();
      expect(summary.totalQueries).toBe(1);
    });

    it('calculates avgResponseTimeMs', () => {
      trackQuery('q1', 100, [], true);
      trackQuery('q2', 200, [], true);
      trackQuery('q3', 300, [], true);
      const summary = getAnalyticsSummary();
      expect(summary.avgResponseTimeMs).toBe(200);
    });

    it('tracks tool usage counts', () => {
      trackQuery('q1', 100, ['search', 'summarize'], true);
      trackQuery('q2', 200, ['search'], true);
      const summary = getAnalyticsSummary();
      expect(summary.toolUsageCount).toEqual({ search: 2, summarize: 1 });
    });

    it('calculates error rate', () => {
      trackQuery('ok', 100, [], true);
      trackQuery('ok', 100, [], true);
      trackQuery('fail', 100, [], false);
      trackQuery('fail', 100, [], false);
      const summary = getAnalyticsSummary();
      expect(summary.errorRate).toBe(50);
    });

    it('truncates query to 200 chars', () => {
      const longQuery = 'x'.repeat(300);
      trackQuery(longQuery, 50, [], true);
      const summary = getAnalyticsSummary();
      expect(summary.totalQueries).toBe(1);
    });

    it('respects MAX_METRICS cap (500) by evicting oldest', () => {
      for (let i = 0; i < 510; i++) {
        trackQuery(`q${i}`, i, [], true);
      }
      const summary = getAnalyticsSummary();
      expect(summary.totalQueries).toBe(500);
    });
  });

  describe('trackToolUsage', () => {
    it('does not throw', () => {
      expect(() => trackToolUsage('search', 42)).not.toThrow();
    });
  });

  describe('trackError', () => {
    it('does not throw', () => {
      expect(() => trackError('timeout', { url: '/api' })).not.toThrow();
    });
  });

  describe('resetMetrics', () => {
    it('clears all tracked metrics', () => {
      trackQuery('q', 100, [], true);
      expect(getAnalyticsSummary().totalQueries).toBe(1);
      resetMetrics();
      expect(getAnalyticsSummary().totalQueries).toBe(0);
    });
  });

  describe('p95ResponseTimeMs', () => {
    it('calculates p95 correctly', () => {
      for (let i = 1; i <= 100; i++) {
        trackQuery(`q${i}`, i * 10, [], true);
      }
      const summary = getAnalyticsSummary();
      expect(summary.p95ResponseTimeMs).toBe(960);
    });
  });
});

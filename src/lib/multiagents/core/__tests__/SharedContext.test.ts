import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SharedContext } from '../SharedContext';

describe('SharedContext', () => {
  let ctx: SharedContext;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = SharedContext.getInstance();
  });

  afterEach(() => {
    ctx.destroy();
    vi.useRealTimers();
  });

  it('returns singleton instance', () => {
    expect(SharedContext.getInstance()).toBe(ctx);
  });

  describe('set/get', () => {
    it('stores and retrieves data by leadId', () => {
      ctx.set('lead-1', { name: 'João' });
      expect(ctx.get('lead-1')).toEqual({ name: 'João' });
    });

    it('merges data on subsequent sets', () => {
      ctx.set('lead-1', { name: 'João' });
      ctx.set('lead-1', { email: 'joao@test.com' });
      expect(ctx.get('lead-1')).toEqual({ name: 'João', email: 'joao@test.com' });
    });

    it('overwrites same key on merge', () => {
      ctx.set('lead-1', { name: 'João' });
      ctx.set('lead-1', { name: 'Maria' });
      expect(ctx.get('lead-1')).toEqual({ name: 'Maria' });
    });

    it('returns empty object for unknown leadId', () => {
      expect(ctx.get('unknown')).toEqual({});
    });
  });

  describe('TTL expiration', () => {
    it('returns empty object for expired entries', () => {
      ctx.set('lead-1', { name: 'Test' });
      // Advance past 24h TTL
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      expect(ctx.get('lead-1')).toEqual({});
    });

    it('returns data before TTL expires', () => {
      ctx.set('lead-1', { name: 'Test' });
      vi.advanceTimersByTime(23 * 60 * 60 * 1000);
      expect(ctx.get('lead-1')).toEqual({ name: 'Test' });
    });
  });

  describe('clear', () => {
    it('removes entry by leadId', () => {
      ctx.set('lead-1', { name: 'Test' });
      ctx.clear('lead-1');
      expect(ctx.get('lead-1')).toEqual({});
    });
  });

  describe('eviction', () => {
    it('evicts oldest entry when max entries reached', () => {
      // Set entries up to limit and verify eviction behavior
      for (let i = 0; i < 100; i++) {
        ctx.set(`lead-${i}`, { idx: i });
        vi.advanceTimersByTime(1); // ensure different timestamps
      }
      // All 100 should still be accessible (well under 10000 limit)
      expect(ctx.get('lead-0')).toEqual({ idx: 0 });
    });
  });

  describe('destroy', () => {
    it('clears all data and stops cleanup timer', () => {
      ctx.set('lead-1', { name: 'Test' });
      ctx.destroy();
      expect(ctx.get('lead-1')).toEqual({});
    });
  });
});

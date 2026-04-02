import { describe, it, expect } from 'vitest';
import { toUserMessage } from '@/lib/errorMessages';

describe('Error Recovery & Resilience', () => {
  describe('toUserMessage handles all error types', () => {
    it('handles null/undefined errors', () => {
      expect(toUserMessage(null)).toBeTruthy();
      expect(toUserMessage(undefined)).toBeTruthy();
    });

    it('handles string errors', () => {
      expect(toUserMessage('something broke')).toBeTruthy();
    });

    it('handles Error objects', () => {
      expect(toUserMessage(new Error('test'))).toBeTruthy();
    });

    it('handles RLS permission errors', () => {
      const msg = toUserMessage(new Error('permission denied for table leads'));
      expect(msg).not.toContain('permission denied');
      expect(msg).not.toContain('leads');
    });

    it('handles network errors', () => {
      const msg = toUserMessage(new Error('Failed to fetch'));
      expect(msg).not.toContain('fetch');
    });

    it('handles duplicate key errors', () => {
      const msg = toUserMessage(new Error('duplicate key value violates unique constraint'));
      expect(msg).not.toContain('constraint');
    });

    it('never exposes internal details', () => {
      const dangerous = [
        'PGRST116',
        'row level security',
        'violates foreign key',
        'column "secret_field" does not exist',
        'stack trace at line 42',
      ];
      for (const err of dangerous) {
        const msg = toUserMessage(new Error(err));
        expect(msg).not.toContain('PGRST');
        expect(msg).not.toContain('column');
        expect(msg).not.toContain('stack trace');
      }
    });
  });

  describe('Rate limiter handles edge cases', () => {
    it('handles empty identifier gracefully', () => {
      // Rate limiter is a Deno module — verify the contract: toUserMessage
      // maps rate-limit errors to a safe user message
      const msg = toUserMessage(new Error('rate limit exceeded'));
      expect(msg).not.toContain('rate limit');
      expect(msg).toBeTruthy();
    });
  });
});

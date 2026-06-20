import { describe, it, expect } from 'vitest';
import { toUserMessage } from '../errorMessages';

describe('errorMessages sanitizer', () => {
  it('returns helpful message for known database errors', () => {
    expect(toUserMessage('duplicate key value violates unique constraint')).toContain('já existe');
    expect(toUserMessage('permission denied for table leads')).toContain('não tem permissão');
  });

  it('returns helpful message for auth errors', () => {
    expect(toUserMessage('invalid login credentials')).toContain('incorretos');
    expect(toUserMessage('password is too short')).toContain('fraca');
    expect(toUserMessage('senha fraca')).toContain('fraca');
  });

  it('preserves helpful mapping even when wrapped in Error object', () => {
    expect(toUserMessage(new Error('fetch failed'))).toContain('conexão');
  });

  it('handles non-string inputs gracefully by returning generic message', () => {
    // @ts-expect-error - testing runtime safety
    expect(toUserMessage(null)).toContain('inesperado');
    // @ts-expect-error
    expect(toUserMessage({ error: 'leak' })).toContain('inesperado');
  });

  it('redacts sensitive technical details by falling back to generic', () => {
    const technical = 'Error at line 45: select * from users where id = 1';
    const sanitized = toUserMessage(technical);
    expect(sanitized).not.toContain('select *');
    expect(sanitized).toContain('inesperado');
  });
});

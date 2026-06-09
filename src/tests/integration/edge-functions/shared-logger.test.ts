import { describe, it, expect, vi } from 'vitest';
import { maskString, redactPIIString, redactPII, createEdgeLogger } from '../../../../supabase/functions/_shared/logger';

describe('shared/logger — PII Redaction', () => {
  describe('maskString', () => {
    it('masks the middle of a string', () => {
      expect(maskString('1234567890')).toBe('1234****90');
    });

    it('returns *** for short strings', () => {
      expect(maskString('123')).toBe('***');
    });
  });

  describe('redactPIIString', () => {
    it('redacts emails', () => {
      expect(redactPIIString('Contact test@example.com now')).toContain('@example.com');
      expect(redactPIIString('Contact test@example.com now')).toContain('***');
    });

    it('redacts CPF', () => {
      expect(redactPIIString('CPF: 123.456.789-00')).toBe('CPF: ***.***.***-**');
    });

    it('redacts CNPJ', () => {
      expect(redactPIIString('CNPJ: 12.345.678/0001-90')).toBe('CNPJ: **.***.***/****-**');
    });

    it('redacts phone numbers', () => {
      expect(redactPIIString('Phone: 5511999998888')).toContain('***');
    });

    it('redacts bearer tokens', () => {
      // BEARER_RE requires 8+ chars after prefix
      expect(redactPIIString('Bearer eyJabc123456')).toBe('Bearer eyJabc***');
    });
  });

  describe('redactPII (deep)', () => {
    it('redacts objects recursively', () => {
      const input = {
        name: 'John',
        cpf: '123.456.789-00',
        metadata: {
          email: 'john@example.com'
        }
      };
      const redacted = redactPII(input) as any;
      expect(redacted.cpf).toBe('12**********00');
      expect(redacted.metadata.email).toBe('jo************om');
    });

    it('handles arrays', () => {
      const input = ['123.456.789-00', 'safe'];
      const redacted = redactPII(input) as any;
      expect(redacted[0]).toBe('***.***.***-**');
      expect(redacted[1]).toBe('safe');
    });
  });
});

describe('EdgeLogger', () => {
  it('logs at different levels', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createEdgeLogger('test-fn');

    // Set env to development to ensure info logs are shown
    const originalEnv = process.env.SUPABASE_DB_NAME;
    process.env.SUPABASE_DB_NAME = 'development';

    log.info('Hello world', { foo: 'bar' });

    expect(spy).toHaveBeenCalled();
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.msg).toBe('Hello world');
    expect(output.fn).toBe('test-fn');

    process.env.SUPABASE_DB_NAME = originalEnv;
    spy.mockRestore();
  });

  it('redacts error messages', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createEdgeLogger('test-fn');

    log.error('Failed', new Error('Secret 123.456.789-00'), { p: '12345678901' });

    expect(spy).toHaveBeenCalled();
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.error).toContain('***');

    spy.mockRestore();
  });
});

/**
 * Logger PII Redaction — LGPD compliance
 *
 * Valida que `_shared/logger.ts` redacta emails, telefones, CPF, CNPJ e tokens
 * em TODOS os níveis (msg, data, error). Uma regressão aqui = violação LGPD.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  redactPII,
  redactPIIString,
  maskString,
  createEdgeLogger,
} from '../../../../supabase/functions/_shared/logger.ts';

// Mock Deno.env pro módulo
beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  g.Deno = { env: { get: (k: string) => (k === 'SUPABASE_DB_NAME' ? 'development' : undefined) } };
});

describe('PII redaction primitives', () => {
  describe('maskString', () => {
    it('mantém primeiros e últimos chars, mascara meio', () => {
      expect(maskString('12345678901234', 4, 2)).toBe('1234********34');
    });
    it('retorna *** pra strings curtas', () => {
      expect(maskString('abc', 4, 2)).toBe('***');
      expect(maskString('', 4, 2)).toBe('***');
    });
  });

  describe('redactPIIString', () => {
    it('mascara email preservando domínio', () => {
      const out = redactPIIString('Contato: joao.silva@empresa.com');
      expect(out).toContain('@empresa.com');
      expect(out).toContain('*');
      expect(out).not.toContain('joao.silva');
    });

    it('mascara CPF em qualquer formato', () => {
      expect(redactPIIString('CPF: 123.456.789-00')).toContain('***.***.***-**');
      expect(redactPIIString('CPF 12345678900')).toContain('***.***.***-**');
    });

    it('mascara CNPJ', () => {
      expect(redactPIIString('CNPJ 12.345.678/0001-90')).toContain('**.***.***/****-**');
    });

    it('mascara telefone BR (11 dígitos)', () => {
      const out = redactPIIString('tel 11999998888');
      expect(out).not.toContain('11999998888');
    });

    it('mascara JWT/Bearer tokens', () => {
      const out = redactPIIString('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def');
      // Tail do JWT é redacted; mantém prefixo curto pra debug
      expect(out).toContain('***');
      expect(out).not.toContain('eyJhbGciOiJIUzI1');
      expect(out).not.toContain('.abc.def');
    });

    it('não altera texto sem PII', () => {
      expect(redactPIIString('Olá, tudo bem?')).toBe('Olá, tudo bem?');
    });
  });

  describe('redactPII (deep)', () => {
    it('mascara campos sensíveis por nome', () => {
      const out = redactPII({ email: 'a@b.com', password: 'secret123', nome: 'João' });
      const obj = out as { email: string; password: string; nome: string };
      expect(obj.email).toContain('*');
      expect(obj.email).not.toBe('a@b.com');
      expect(obj.password).toContain('*');
      expect(obj.password).not.toBe('secret123');
      expect(obj.nome).toBe('João');
    });

    it('recursão em objetos aninhados', () => {
      const out = redactPII({ user: { email: 'a@b.com', id: 42 } });
      expect((out as { user: { email: string; id: number } }).user.email).toMatch(/\*/);
      expect((out as { user: { id: number } }).user.id).toBe(42);
    });

    it('mascara em arrays', () => {
      const out = redactPII([{ email: 'a@b.com' }, { email: 'c@d.com' }]);
      expect(Array.isArray(out)).toBe(true);
      for (const item of out as Array<{ email: string }>) {
        expect(item.email).toMatch(/\*/);
      }
    });

    it('redacta PII em strings de campos não sensíveis', () => {
      const out = redactPII({ descricao: 'Cliente joao@empresa.com ligou' });
      expect((out as { descricao: string }).descricao).not.toContain('joao@empresa.com');
    });

    it('limita profundidade pra evitar loops', () => {
      const nested: Record<string, unknown> = {};
      let curr = nested;
      for (let i = 0; i < 10; i++) {
        curr.next = {};
        curr = curr.next as Record<string, unknown>;
      }
      expect(() => redactPII(nested)).not.toThrow();
    });

    it('preserva null/undefined/primitivos', () => {
      expect(redactPII(null)).toBe(null);
      expect(redactPII(undefined)).toBe(undefined);
      expect(redactPII(42)).toBe(42);
      expect(redactPII(true)).toBe(true);
    });
  });
});

describe('EdgeLogger — integração PII', () => {
  it('redacta PII em msg e data em info()', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createEdgeLogger('test-fn');
    log.info('user a@b.com logged in', { email: 'x@y.com', tenantId: 't1' });
    const out = spy.mock.calls[0]?.[0] as string;
    expect(out).not.toContain('a@b.com');
    expect(out).not.toContain('x@y.com');
    expect(out).toContain('t1');
    spy.mockRestore();
  });

  it('redacta PII em error()', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createEdgeLogger('test-fn');
    log.error('auth failed for user@test.com', new Error('jwt eyJhbGciOiJIUzI1NiIsInR5cCI.JWT.invalid'));
    const out = spy.mock.calls[0]?.[0] as string;
    expect(out).not.toContain('user@test.com');
    // Tail do token deve sumir
    expect(out).not.toContain('eyJhbGciOiJIUzI1');
    spy.mockRestore();
  });
});

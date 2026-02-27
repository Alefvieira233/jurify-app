import { describe, it, expect } from 'vitest';
import { SanitizerEngine, sanitizePII, rehydratePII } from '../SanitizerEngine';

describe('SanitizerEngine', () => {
  // ─── CPF ──────────────────────────────────────────────────────
  describe('CPF detection', () => {
    it('masks formatted CPF (XXX.XXX.XXX-XX)', () => {
      const engine = new SanitizerEngine();
      const { safePayload, lookupMap, piiCount } = engine.sanitize(
        'O CPF do cliente é 123.456.789-00'
      );
      expect(safePayload).not.toContain('123.456.789-00');
      expect((safePayload as string)).toMatch(/\[CPF-[a-f0-9]+\]/);
      expect(piiCount).toBe(1);
      expect(lookupMap.size).toBe(1);
    });

    it('masks raw 11-digit CPF', () => {
      const { safePayload } = new SanitizerEngine().sanitize(
        'CPF: 12345678900'
      );
      expect(safePayload).not.toContain('12345678900');
      expect((safePayload as string)).toMatch(/\[CPF-[a-f0-9]+\]/);
    });
  });

  // ─── RG ───────────────────────────────────────────────────────
  describe('RG detection', () => {
    it('masks formatted RG', () => {
      const { safePayload, piiCount } = new SanitizerEngine().sanitize(
        'O RG do cliente é 12.345.678-9'
      );
      expect(safePayload).not.toContain('12.345.678-9');
      expect((safePayload as string)).toMatch(/\[RG-[a-f0-9]+\]/);
      expect(piiCount).toBe(1);
    });

    it('masks RG without dots', () => {
      const { safePayload } = new SanitizerEngine().sanitize(
        'RG: 123456789'
      );
      expect(safePayload).not.toContain('123456789');
      expect((safePayload as string)).toMatch(/\[RG-[a-f0-9]+\]/);
    });
  });

  // ─── Credit Card ──────────────────────────────────────────────
  describe('Credit Card detection', () => {
    it('masks formatted credit card', () => {
      const { safePayload, piiCount } = new SanitizerEngine().sanitize(
        'Cartão: 1234-5678-9012-3456'
      );
      expect(safePayload).not.toContain('1234-5678-9012-3456');
      expect((safePayload as string)).toMatch(/\[CARD-[a-f0-9]+\]/);
      expect(piiCount).toBe(1);
    });

    it('masks credit card with spaces', () => {
      const { safePayload } = new SanitizerEngine().sanitize(
        'Cartão: 1234 5678 9012 3456'
      );
      expect(safePayload).not.toContain('1234 5678 9012 3456');
      expect((safePayload as string)).toMatch(/\[CARD-[a-f0-9]+\]/);
    });
  });

  // ─── CNPJ ─────────────────────────────────────────────────────
  describe('CNPJ detection', () => {
    it('masks formatted CNPJ', () => {
      const { safePayload, piiCount } = new SanitizerEngine().sanitize(
        'CNPJ da empresa: 12.345.678/0001-90'
      );
      expect(safePayload).not.toContain('12.345.678/0001-90');
      expect((safePayload as string)).toMatch(/\[CNPJ-[a-f0-9]+\]/);
      expect(piiCount).toBe(1);
    });
  });

  // ─── OAB ──────────────────────────────────────────────────────
  describe('OAB detection', () => {
    it('masks OAB registration', () => {
      const { safePayload } = new SanitizerEngine().sanitize(
        'Advogado inscrito na OAB SP123456'
      );
      expect(safePayload).not.toContain('SP123456');
      expect((safePayload as string)).toMatch(/\[OAB-[a-f0-9]+\]/);
    });

    it('masks OAB with space', () => {
      const { safePayload } = new SanitizerEngine().sanitize(
        'OAB RJ 98765'
      );
      expect(safePayload).not.toContain('RJ 98765');
    });
  });

  // ─── Processo CNJ ─────────────────────────────────────────────
  describe('Processo CNJ detection', () => {
    it('masks CNJ process number', () => {
      const { safePayload } = new SanitizerEngine().sanitize(
        'Processo: 0001234-56.2023.8.26.0100'
      );
      expect(safePayload).not.toContain('0001234-56.2023.8.26.0100');
      expect((safePayload as string)).toMatch(/\[CNJ-[a-f0-9]+\]/);
    });
  });

  // ─── Email ────────────────────────────────────────────────────
  describe('Email detection', () => {
    it('masks email addresses', () => {
      const { safePayload } = new SanitizerEngine().sanitize(
        'Contato: joao.silva@escritorio.com.br'
      );
      expect(safePayload).not.toContain('joao.silva@escritorio.com.br');
      expect((safePayload as string)).toMatch(/\[EMAIL-[a-f0-9]+\]/);
    });
  });

  // ─── Phone ────────────────────────────────────────────────────
  describe('Phone detection', () => {
    it('masks Brazilian phone numbers', () => {
      const { safePayload } = new SanitizerEngine().sanitize(
        'Telefone: (11) 99999-8888'
      );
      expect(safePayload).not.toContain('99999-8888');
      expect((safePayload as string)).toMatch(/\[TEL-[a-f0-9]+\]/);
    });

    it('masks phone with +55', () => {
      const { safePayload } = new SanitizerEngine().sanitize(
        'WhatsApp: +55 11 98765-4321'
      );
      expect(safePayload).not.toContain('98765-4321');
    });

    it('masks phone without parens but with DDD', () => {
      const { safePayload, piiCount } = new SanitizerEngine().sanitize(
        'Ligue para 21 98765-4321'
      );
      expect(safePayload).not.toContain('98765-4321');
      expect(piiCount).toBeGreaterThanOrEqual(1);
    });

    it('does NOT mask bare number without DDD', () => {
      const { safePayload } = new SanitizerEngine().sanitize(
        'Código: 98765-4321'
      );
      expect(safePayload).toContain('98765-4321');
    });
  });

  // ─── Nested Objects ───────────────────────────────────────────
  describe('nested object traversal', () => {
    it('sanitizes deeply nested objects', () => {
      const input = {
        lead: {
          nome: 'João',
          cpf: '123.456.789-00',
          contato: {
            email: 'joao@test.com',
            telefone: '(11) 99999-1234',
          },
        },
        caso: {
          processo: '0001234-56.2023.8.26.0100',
          descricao: 'Caso trabalhista',
        },
      };

      const { safePayload, lookupMap, piiCount } = new SanitizerEngine().sanitize(input);
      const safe = safePayload as Record<string, unknown>;
      const lead = safe.lead as Record<string, unknown>;
      const contato = lead.contato as Record<string, unknown>;
      const caso = safe.caso as Record<string, unknown>;

      expect(lead.cpf).toMatch(/\[CPF-/);
      expect(contato.email).toMatch(/\[EMAIL-/);
      expect(contato.telefone).toMatch(/\[TEL-/);
      expect(caso.processo).toMatch(/\[CNJ-/);
      expect(lead.nome).toBe('João'); // Non-PII preserved
      expect(caso.descricao).toBe('Caso trabalhista');
      expect(piiCount).toBeGreaterThanOrEqual(4);
      expect(lookupMap.size).toBeGreaterThanOrEqual(4);
    });

    it('sanitizes arrays', () => {
      const input = ['CPF: 123.456.789-00', 'Normal text', 'Email: a@b.com'];
      const { safePayload } = new SanitizerEngine().sanitize(input);
      const safe = safePayload as string[];
      expect(safe[0]).toMatch(/\[CPF-/);
      expect(safe[1]).toBe('Normal text');
      expect(safe[2]).toMatch(/\[EMAIL-/);
    });
  });

  // ─── Deterministic tokenization ───────────────────────────────
  describe('deterministic behavior', () => {
    it('same PII value gets same token within one sanitize call', () => {
      const text = 'CPF: 123.456.789-00. Confirmando CPF: 123.456.789-00';
      const { safePayload, lookupMap } = new SanitizerEngine().sanitize(text);
      // Same CPF should produce same token
      const tokens = [...lookupMap.keys()];
      const cpfToken = tokens.find(t => t.startsWith('[CPF-'));
      expect(cpfToken).toBeDefined();
      // Token appears twice in result
      const occurrences = (safePayload as string).split(cpfToken!).length - 1;
      expect(occurrences).toBe(2);
      // But only 1 entry in lookup
      expect(lookupMap.size).toBe(1);
    });
  });

  // ─── Cumulative Sanitization ─────────────────────────────────
  describe('cumulative sanitization', () => {
    it('keeps tokens from previous calls when shouldReset is false', () => {
      const engine = new SanitizerEngine();
      const r1 = engine.sanitize('CPF: 123.456.789-00');
      const r2 = engine.sanitize('Email: joao@test.com', false);

      expect(r2.piiCount).toBe(2);
      expect(r2.lookupMap.size).toBe(2);

      const tokens = [...r2.lookupMap.keys()];
      expect(tokens.some(t => t.startsWith('[CPF-'))).toBe(true);
      expect(tokens.some(t => t.startsWith('[EMAIL-'))).toBe(true);

      // Rehydration with r2.lookupMap should work for both
      const restored1 = SanitizerEngine.rehydrate(r1.safePayload, r2.lookupMap);
      const restored2 = SanitizerEngine.rehydrate(r2.safePayload, r2.lookupMap);

      expect(restored1).toBe('CPF: 123.456.789-00');
      expect(restored2).toBe('Email: joao@test.com');
    });
  });

  // ─── Rehydration ──────────────────────────────────────────────
  describe('rehydration', () => {
    it('round-trips string correctly', () => {
      const original = 'O CPF 123.456.789-00 e email joao@test.com do processo 0001234-56.2023.8.26.0100';
      const engine = new SanitizerEngine();
      const { safePayload, lookupMap } = engine.sanitize(original);

      // Safe payload should NOT contain PII
      expect(safePayload).not.toContain('123.456.789-00');
      expect(safePayload).not.toContain('joao@test.com');

      // Rehydrate should restore original
      const restored = SanitizerEngine.rehydrate(safePayload, lookupMap);
      expect(restored).toBe(original);
    });

    it('round-trips nested object correctly', () => {
      const original = {
        lead: { cpf: '123.456.789-00', nome: 'Maria' },
        notes: 'Processo 0001234-56.2023.8.26.0100',
      };
      const engine = new SanitizerEngine();
      const { safePayload, lookupMap } = engine.sanitize(original);
      const restored = SanitizerEngine.rehydrate(safePayload, lookupMap);
      expect(restored).toEqual(original);
    });

    it('handles empty lookup map gracefully', () => {
      const result = SanitizerEngine.rehydrate('no pii here', new Map());
      expect(result).toBe('no pii here');
    });
  });

  // ─── Helper functions ─────────────────────────────────────────
  describe('helper functions', () => {
    it('sanitizePII works as standalone', () => {
      const { safePayload, lookupMap } = sanitizePII('CPF: 123.456.789-00');
      expect(safePayload).not.toContain('123.456.789-00');
      expect(lookupMap.size).toBe(1);
    });

    it('rehydratePII restores data', () => {
      const { safePayload, lookupMap } = sanitizePII('CPF: 123.456.789-00');
      const restored = rehydratePII(safePayload, lookupMap);
      expect(restored).toBe('CPF: 123.456.789-00');
    });
  });

  // ─── Regression: lastIndex stale state ───────────────────────────
  describe('lastIndex regression', () => {
    it('sanitize works correctly on consecutive calls', () => {
      const engine = new SanitizerEngine();
      const r1 = engine.sanitize('CPF: 123.456.789-00');
      expect(r1.piiCount).toBe(1);

      // Second call must also work (lastIndex was stale before fix)
      const r2 = engine.sanitize('CPF: 987.654.321-00');
      expect(r2.piiCount).toBe(1);
      expect(r2.safePayload).not.toContain('987.654.321-00');
    });

    it('works on 10 consecutive calls', () => {
      const engine = new SanitizerEngine();
      for (let i = 0; i < 10; i++) {
        const cpf = `${String(i).padStart(3, '0')}.456.789-00`;
        const { piiCount } = engine.sanitize(`CPF: ${cpf}`);
        expect(piiCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ─── Regression: OAB false positives ─────────────────────────
  describe('OAB false positive rejection', () => {
    it('does NOT mask generic 2-letter + digits like "ID 12345"', () => {
      const { safePayload, piiCount } = new SanitizerEngine().sanitize(
        'Registro ID 12345 no sistema'
      );
      expect(safePayload).toContain('ID 12345');
      expect(piiCount).toBe(0);
    });

    it('does NOT mask "OK 9999"', () => {
      const { safePayload } = new SanitizerEngine().sanitize('Status: OK 9999');
      expect(safePayload).toContain('OK 9999');
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────
  describe('edge cases', () => {
    it('handles null and undefined', () => {
      const engine = new SanitizerEngine();
      expect(engine.sanitize(null).safePayload).toBeNull();
      expect(engine.sanitize(undefined).safePayload).toBeUndefined();
    });

    it('handles numbers and booleans', () => {
      const engine = new SanitizerEngine();
      expect(engine.sanitize(42).safePayload).toBe(42);
      expect(engine.sanitize(true).safePayload).toBe(true);
    });

    it('handles empty string', () => {
      const { safePayload, piiCount } = new SanitizerEngine().sanitize('');
      expect(safePayload).toBe('');
      expect(piiCount).toBe(0);
    });

    it('handles text with no PII', () => {
      const text = 'Este é um texto comum sem dados sensíveis';
      const { safePayload, piiCount } = new SanitizerEngine().sanitize(text);
      expect(safePayload).toBe(text);
      expect(piiCount).toBe(0);
    });

    it('handles multiple PII types in one string', () => {
      const text = 'Cliente: 123.456.789-00, CNPJ: 12.345.678/0001-90, OAB SP123456, email: adv@law.com';
      const { safePayload, piiCount } = new SanitizerEngine().sanitize(text);
      expect(piiCount).toBeGreaterThanOrEqual(4);
      expect(safePayload).not.toContain('123.456.789-00');
      expect(safePayload).not.toContain('12.345.678/0001-90');
      expect(safePayload).not.toContain('SP123456');
      expect(safePayload).not.toContain('adv@law.com');
    });
  });
});

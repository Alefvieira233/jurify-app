import { describe, it, expect } from 'vitest';
import { redactPII, generateSecureId } from '../security';

describe('Shared Security Utilities', () => {
  describe('redactPII', () => {
    it('redacts Brazilian CPF', () => {
      const input = 'Meu CPF é 123.456.789-00';
      expect(redactPII(input)).toContain('***CPF***');
    });

    it('redacts Brazilian CNPJ', () => {
      const input = 'Empresa: 12.345.678/0001-90';
      expect(redactPII(input)).toContain('***CNPJ***');
    });

    it('redacts Brazilian RG', () => {
      const input = 'RG: 12.345.678-9';
      expect(redactPII(input)).toContain('***RG***');
    });

    it('redacts OAB registration', () => {
      const input = 'Advogado OAB SP 123456';
      expect(redactPII(input)).toContain('***OAB***');
    });

    it('redacts Brazilian phone numbers', () => {
      const input = 'Ligue para (11) 99999-8888';
      expect(redactPII(input)).toContain('***TEL***');
    });

    it('redacts email addresses', () => {
      const input = 'Email: teste@exemplo.com.br';
      expect(redactPII(input)).toContain('***EMAIL***');
    });

    it('redacts Processo CNJ', () => {
      const input = 'Processo 0012345-67.2023.8.26.0001';
      expect(redactPII(input)).toContain('***PROCESSO***');
    });
  });

  describe('generateSecureId', () => {
    it('generates a secure ID with prefix', () => {
      const id = generateSecureId('test');
      expect(id).toMatch(/^test_\d+_[a-z0-9]+$/);
    });

    it('generates unique IDs', () => {
      const id1 = generateSecureId();
      const id2 = generateSecureId();
      expect(id1).not.toBe(id2);
    });
  });
});

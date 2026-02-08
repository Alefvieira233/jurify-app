import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validateCPF, sanitizeText } from '../validation';

describe('validation utilities', () => {
  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      expect(validateEmail('user@example.com').isValid).toBe(true);
      expect(validateEmail('name.surname@domain.co').isValid).toBe(true);
      expect(validateEmail('test+tag@gmail.com').isValid).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(validateEmail('').isValid).toBe(false);
      expect(validateEmail('not-an-email').isValid).toBe(false);
      expect(validateEmail('@domain.com').isValid).toBe(false);
      expect(validateEmail('user@').isValid).toBe(false);
    });

    it('returns sanitized lowercase email', () => {
      const result = validateEmail('User@Example.COM');
      expect(result.sanitizedData?.email).toBe('user@example.com');
    });
  });

  describe('validatePassword', () => {
    it('accepts strong passwords', () => {
      const result = validatePassword('MyStr0ng!Pass');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects short passwords', () => {
      const result = validatePassword('Ab1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Senha deve ter pelo menos 8 caracteres');
    });

    it('rejects passwords without uppercase', () => {
      const result = validatePassword('mystr0ng!pass');
      expect(result.isValid).toBe(false);
    });

    it('rejects passwords without number', () => {
      const result = validatePassword('MyStrong!Pass');
      expect(result.isValid).toBe(false);
    });

    it('rejects empty passwords', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateCPF', () => {
    it('accepts valid CPFs', () => {
      expect(validateCPF('529.982.247-25').isValid).toBe(true);
      expect(validateCPF('52998224725').isValid).toBe(true);
    });

    it('rejects all-same-digit CPFs', () => {
      expect(validateCPF('000.000.000-00').isValid).toBe(false);
      expect(validateCPF('111.111.111-11').isValid).toBe(false);
    });

    it('rejects invalid check digits', () => {
      expect(validateCPF('123.456.789-00').isValid).toBe(false);
    });

    it('rejects empty CPF', () => {
      expect(validateCPF('').isValid).toBe(false);
    });

    it('rejects non-numeric CPF', () => {
      expect(validateCPF('abc').isValid).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('removes script tags (XSS prevention)', () => {
      const result = sanitizeText('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('trims whitespace', () => {
      expect(sanitizeText('  hello  ')).toBe('hello');
    });

    it('handles empty input', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('preserves normal text', () => {
      expect(sanitizeText('Hello World')).toBe('Hello World');
    });
  });
});

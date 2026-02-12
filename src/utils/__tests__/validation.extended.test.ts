import { describe, it, expect } from 'vitest';
import {
  validation,
  validateEmail,
  validatePassword,
  validatePhone,
  validateCPF,
  sanitizeText,
  sanitizeHTML,
  validateLeadData,
  validateContractData,
} from '../validation';

// =========================================================================
// Phone validation
// =========================================================================
describe('validatePhone', () => {
  it('accepts valid landline (10 digits)', () => {
    expect(validatePhone('1133334444').isValid).toBe(true);
  });

  it('accepts valid mobile (11 digits starting with 9)', () => {
    expect(validatePhone('11999998888').isValid).toBe(true);
  });

  it('accepts formatted phone', () => {
    const result = validatePhone('(11) 99999-8888');
    expect(result.isValid).toBe(true);
    expect(result.sanitizedData?.telefone).toBe('11999998888');
  });

  it('rejects too short phone', () => {
    expect(validatePhone('1234').isValid).toBe(false);
  });

  it('rejects too long phone', () => {
    expect(validatePhone('123456789012').isValid).toBe(false);
  });

  it('rejects 11-digit number not starting with 9 in 3rd position', () => {
    const result = validatePhone('11833334444');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Celular deve começar com 9');
  });

  it('rejects empty phone', () => {
    expect(validatePhone('').isValid).toBe(false);
  });
});

// =========================================================================
// sanitizeHTML
// =========================================================================
describe('sanitizeHTML', () => {
  it('allows safe tags', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHTML(html)).toContain('<p>');
    expect(sanitizeHTML(html)).toContain('<strong>');
  });

  it('strips dangerous tags', () => {
    const html = '<script>alert("xss")</script><p>safe</p>';
    const result = sanitizeHTML(html);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>safe</p>');
  });

  it('strips attributes', () => {
    const html = '<p onclick="alert(1)">text</p>';
    const result = sanitizeHTML(html);
    expect(result).not.toContain('onclick');
  });

  it('handles empty input', () => {
    expect(sanitizeHTML('')).toBe('');
  });
});

// =========================================================================
// sanitizeSQL
// =========================================================================
describe('sanitizeSQL', () => {
  it('removes SQL keywords', () => {
    const result = validation.sanitizeSQL('Robert; DROP TABLE users;--');
    expect(result).not.toContain('DROP');
    expect(result).not.toContain(';');
  });

  it('removes quotes and backslashes', () => {
    const result = validation.sanitizeSQL("O'Brien \"test\" \\path");
    expect(result).not.toContain("'");
    expect(result).not.toContain('"');
    expect(result).not.toContain('\\');
  });

  it('handles empty input', () => {
    expect(validation.sanitizeSQL('')).toBe('');
  });

  it('preserves safe text', () => {
    const result = validation.sanitizeSQL('João da Silva');
    expect(result).toBe('João da Silva');
  });
});

// =========================================================================
// validateLeadData
// =========================================================================
describe('validateLeadData', () => {
  const validLead = {
    nome: 'João Silva',
    email: 'joao@test.com',
    telefone: '11999998888',
    area_juridica: 'Trabalhista',
    descricao: 'Preciso de ajuda com rescisão',
  };

  it('accepts valid lead data', () => {
    const result = validateLeadData(validLead);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitizedData?.nome).toBe('João Silva');
  });

  it('rejects missing nome', () => {
    const result = validateLeadData({ ...validLead, nome: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Nome é obrigatório');
  });

  it('rejects short nome', () => {
    const result = validateLeadData({ ...validLead, nome: 'A' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Nome deve ter pelo menos 2 caracteres');
  });

  it('rejects invalid email', () => {
    const result = validateLeadData({ ...validLead, email: 'not-email' });
    expect(result.isValid).toBe(false);
  });

  it('rejects missing area_juridica', () => {
    const result = validateLeadData({ ...validLead, area_juridica: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Área jurídica é obrigatória');
  });

  it('sanitizes XSS in nome', () => {
    const result = validateLeadData({ ...validLead, nome: '<script>alert(1)</script>João' });
    expect(result.isValid).toBe(true);
    expect(String(result.sanitizedData?.nome)).not.toContain('<script>');
  });

  it('handles optional telefone validation', () => {
    const result = validateLeadData({ ...validLead, telefone: '123' });
    expect(result.isValid).toBe(false);
  });

  it('accepts lead without optional telefone', () => {
    const { telefone: _, ...noPhone } = validLead;
    const result = validateLeadData(noPhone);
    expect(result.isValid).toBe(true);
  });
});

// =========================================================================
// validateContractData
// =========================================================================
describe('validateContractData', () => {
  const validContract = {
    titulo: 'Contrato de Prestação de Serviços',
    valor: 5000,
    cliente_nome: 'Maria Santos',
    cliente_email: 'maria@test.com',
  };

  it('accepts valid contract data', () => {
    const result = validateContractData(validContract);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing titulo', () => {
    const result = validateContractData({ ...validContract, titulo: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Título do contrato é obrigatório');
  });

  it('rejects negative valor', () => {
    const result = validateContractData({ ...validContract, valor: -100 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Valor deve ser um número positivo');
  });

  it('rejects non-numeric valor', () => {
    const result = validateContractData({ ...validContract, valor: 'abc' });
    expect(result.isValid).toBe(false);
  });

  it('rejects missing cliente_nome', () => {
    const result = validateContractData({ ...validContract, cliente_nome: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Nome do cliente é obrigatório');
  });

  it('validates cliente_email when provided', () => {
    const result = validateContractData({ ...validContract, cliente_email: 'invalid' });
    expect(result.isValid).toBe(false);
  });

  it('accepts contract without optional email', () => {
    const { cliente_email: _, ...noEmail } = validContract;
    const result = validateContractData(noEmail);
    expect(result.isValid).toBe(true);
  });

  it('accepts zero valor', () => {
    const result = validateContractData({ ...validContract, valor: 0 });
    expect(result.isValid).toBe(true);
  });
});

// =========================================================================
// Rate limiting
// =========================================================================
describe('validateRateLimit', () => {
  it('allows requests within limit', () => {
    const id = 'test-rate-' + Date.now();
    expect(validation.validateRateLimit(id, 3, 60000)).toBe(true);
    expect(validation.validateRateLimit(id, 3, 60000)).toBe(true);
    expect(validation.validateRateLimit(id, 3, 60000)).toBe(true);
  });

  it('blocks requests exceeding limit', () => {
    const id = 'test-block-' + Date.now();
    validation.validateRateLimit(id, 2, 60000);
    validation.validateRateLimit(id, 2, 60000);
    expect(validation.validateRateLimit(id, 2, 60000)).toBe(false);
  });

  it('allows requests after window expires', () => {
    const id = 'test-expire-' + Math.random();
    // Fill the limit
    validation.validateRateLimit(id, 1, 100);
    // Should be blocked now
    expect(validation.validateRateLimit(id, 1, 100)).toBe(false);
    // After the window passes, it should allow again
    // We use a new identifier with a 0ms window so all previous requests are "expired"
    const id2 = 'test-expire2-' + Math.random();
    validation.validateRateLimit(id2, 1, 0);
    expect(validation.validateRateLimit(id2, 1, 0)).toBe(true);
  });
});

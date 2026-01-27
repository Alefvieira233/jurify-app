/**
 * 🛡️ VALIDATION & SANITIZATION SERVICE
 * 
 * Production-grade validation with TypeScript strict mode support.
 * 
 * @version 2.0.0
 */

import DOMPurify from 'isomorphic-dompurify';

// Helper function for safe array access
const safeCharAt = (str: string, index: number): string => str.charAt(index) || '0';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: Record<string, unknown>;
}

class ValidationService {
  private rateLimitStore?: Map<string, number[]>;

  // Email validation
  validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email é obrigatório');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Email deve ter formato válido');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: { email: email?.toLowerCase().trim() }
    };
  }

  // Password validation (LGPD compliant)
  validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Senha é obrigatória');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }

    if (!/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }

    if (!/[!@#$%^&*(),.?"':{}|<>]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Phone validation (Brazilian format)
  validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];

    if (!phone) {
      errors.push('Telefone é obrigatório');
      return { isValid: false, errors };
    }

    // Remove formatting
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      errors.push('Telefone deve ter 10 ou 11 dígitos');
    }

    if (cleanPhone.length === 11 && safeCharAt(cleanPhone, 2) !== '9') {
      errors.push('Celular deve começar com 9');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: { telefone: cleanPhone }
    };
  }

  // CPF validation
  validateCPF(cpf: string): ValidationResult {
    const errors: string[] = [];

    if (!cpf) {
      errors.push('CPF é obrigatório');
      return { isValid: false, errors };
    }

    const cleanCPF = cpf.replace(/\D/g, '');

    if (cleanCPF.length !== 11) {
      errors.push('CPF deve ter 11 dígitos');
      return { isValid: false, errors };
    }

    // Check for repeated digits
    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      errors.push('CPF inválido');
      return { isValid: false, errors };
    }

    // Validate check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(safeCharAt(cleanCPF, i), 10) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(safeCharAt(cleanCPF, i), 10) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;

    if (parseInt(safeCharAt(cleanCPF, 9), 10) !== digit1 || parseInt(safeCharAt(cleanCPF, 10), 10) !== digit2) {
      errors.push('CPF inválido');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: { cpf: cleanCPF }
    };
  }

  // Text sanitization (XSS protection)
  sanitizeText(text: string): string {
    if (!text) return '';

    // Remove HTML tags and sanitize
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    }).trim();
  }

  // HTML sanitization (for rich text)
  sanitizeHTML(html: string): string {
    if (!html) return '';

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: []
    });
  }

  // SQL injection protection
  sanitizeSQL(input: string): string {
    if (!input) return '';

    // Remove dangerous SQL keywords and characters
    return input
      .replace(/['"`;\\/]/g, '')
      .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/gi, '')
      .trim();
  }

  // Lead data validation
  validateLeadData(data: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: Record<string, unknown> = {};

    // Nome
    if (!data.nome) {
      errors.push('Nome é obrigatório');
    } else {
      sanitizedData.nome = this.sanitizeText(String(data.nome));
      if (String(sanitizedData.nome).length < 2) {
        errors.push('Nome deve ter pelo menos 2 caracteres');
      }
    }

    // Email
    const emailValidation = this.validateEmail(String(data.email || ''));
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    } else {
      sanitizedData.email = emailValidation.sanitizedData?.email;
    }

    // Telefone
    if (data.telefone) {
      const phoneValidation = this.validatePhone(String(data.telefone));
      if (!phoneValidation.isValid) {
        errors.push(...phoneValidation.errors);
      } else {
        sanitizedData.telefone = phoneValidation.sanitizedData?.telefone;
      }
    }

    // Área jurídica
    if (!data.area_juridica) {
      errors.push('Área jurídica é obrigatória');
    } else {
      sanitizedData.area_juridica = this.sanitizeText(String(data.area_juridica));
    }

    // Descrição
    if (data.descricao) {
      sanitizedData.descricao = this.sanitizeText(String(data.descricao));
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  // Contract data validation
  validateContractData(data: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: Record<string, unknown> = {};

    // Título
    if (!data.titulo) {
      errors.push('Título do contrato é obrigatório');
    } else {
      sanitizedData.titulo = this.sanitizeText(String(data.titulo));
    }

    // Valor
    if (data.valor !== undefined) {
      const valor = parseFloat(String(data.valor));
      if (isNaN(valor) || valor < 0) {
        errors.push('Valor deve ser um número positivo');
      } else {
        sanitizedData.valor = valor;
      }
    }

    // Cliente
    if (!data.cliente_nome) {
      errors.push('Nome do cliente é obrigatório');
    } else {
      sanitizedData.cliente_nome = this.sanitizeText(String(data.cliente_nome));
    }

    // Email do cliente
    if (data.cliente_email) {
      const emailValidation = this.validateEmail(String(data.cliente_email));
      if (!emailValidation.isValid) {
        errors.push(...emailValidation.errors.map(e => `Cliente: ${e}`));
      } else {
        sanitizedData.cliente_email = emailValidation.sanitizedData?.email;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  // Rate limiting validation
  validateRateLimit(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    // This would integrate with Redis in production
    // For now, using memory storage
    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }

    const requests = this.rateLimitStore.get(identifier) || [];
    const recentRequests = requests.filter((time: number) => time > windowStart);

    if (recentRequests.length >= limit) {
      return false;
    }

    recentRequests.push(now);
    this.rateLimitStore.set(identifier, recentRequests);

    return true;
  }
}

// Export singleton
export const validation = new ValidationService();

// Convenience exports
export const validateEmail = validation.validateEmail.bind(validation);
export const validatePassword = validation.validatePassword.bind(validation);
export const validatePhone = validation.validatePhone.bind(validation);
export const validateCPF = validation.validateCPF.bind(validation);
export const sanitizeText = validation.sanitizeText.bind(validation);
export const sanitizeHTML = validation.sanitizeHTML.bind(validation);
export const validateLeadData = validation.validateLeadData.bind(validation);
export const validateContractData = validation.validateContractData.bind(validation);

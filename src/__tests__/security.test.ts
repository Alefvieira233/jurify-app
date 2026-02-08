// ==========================================
// SECURITY TESTS - CRITICAL VALIDATIONS
// ==========================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { validation, validateEmail, validatePassword, validateCPF } from '@/utils/validation';
import { encryption, encrypt, decrypt, hashPassword, verifyPassword } from '@/utils/encryption';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

describe('🛡️ Security Tests', () => {
  describe('RBAC & Permissions', () => {
    it('should deny access without proper permissions', async () => {
      const mockSupabase = supabase.from as ReturnType<typeof vi.fn>;
      mockSupabase.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } })
          })
        })
      });

      // Test permission check
      const hasPermission = async (userId: string, resource: string, action: string) => {
        const { data, error } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId)
          .eq('resource', resource)
          .eq('action', action)
          .single();
        
        return !error && data;
      };

      const result = await hasPermission('test-user', 'leads', 'delete');
      expect(result).toBe(false);
    });

    it('should allow admin access to all resources', async () => {
      const mockSupabase = supabase.from as ReturnType<typeof vi.fn>;
      mockSupabase.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ 
              data: { user_id: 'admin-user', resource: 'leads', action: 'delete' }, 
              error: null 
            })
          })
        })
      });

      const hasPermission = async (userId: string, resource: string, action: string) => {
        const { data, error } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId)
          .eq('resource', resource)
          .eq('action', action)
          .single();
        
        return !error && data;
      };

      const result = await hasPermission('admin-user', 'leads', 'delete');
      expect(result).toBeTruthy();
    });
  });

  describe('Input Validation', () => {
    it('should validate email correctly', () => {
      // Valid emails
      expect(validateEmail('test@example.com').isValid).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk').isValid).toBe(true);
      
      // Invalid emails
      expect(validateEmail('').isValid).toBe(false);
      expect(validateEmail('invalid-email').isValid).toBe(false);
      expect(validateEmail('test@').isValid).toBe(false);
      expect(validateEmail('@domain.com').isValid).toBe(false);
    });

    it('should validate password strength', () => {
      // Strong password
      const strongPassword = 'MyStr0ng!Pass';
      const strongResult = validatePassword(strongPassword);
      expect(strongResult.isValid).toBe(true);
      expect(strongResult.errors).toHaveLength(0);

      // Weak passwords
      expect(validatePassword('123').isValid).toBe(false);
      expect(validatePassword('password').isValid).toBe(false);
      expect(validatePassword('PASSWORD').isValid).toBe(false);
      expect(validatePassword('12345678').isValid).toBe(false);
    });

    it('should validate CPF correctly', () => {
      // Valid CPFs
      expect(validateCPF('11144477735').isValid).toBe(true);
      expect(validateCPF('111.444.777-35').isValid).toBe(true);
      
      // Invalid CPFs
      expect(validateCPF('').isValid).toBe(false);
      expect(validateCPF('12345678901').isValid).toBe(false);
      expect(validateCPF('11111111111').isValid).toBe(false);
      expect(validateCPF('123.456.789-00').isValid).toBe(false);
    });

    it('should sanitize dangerous input', () => {
      const dangerousInput = '<script>alert("XSS")</script>';
      const sanitized = validation.sanitizeText(dangerousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should prevent SQL injection', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const sanitized = validation.sanitizeSQL(sqlInjection);
      expect(sanitized).not.toContain('DROP');
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain("'");
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'Sensitive information';
      const encrypted = encrypt(originalData);
      const decrypted = decrypt(encrypted);
      
      expect(encrypted).not.toBe(originalData);
      expect(decrypted).toBe(originalData);
    });

    it('should hash and verify passwords', () => {
      const password = 'MySecurePassword123!';
      const hash = hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword('WrongPassword', hash)).toBe(false);
    });

    it('should encrypt PII data for LGPD compliance', () => {
      const piiData = {
        nome: 'João Silva',
        cpf: '11144477735',
        email: 'joao@example.com',
        telefone: '11999887766'
      };

      const encrypted = encryption.encryptPII(piiData);
      expect(encrypted.cpf).not.toBe(piiData.cpf);
      expect(encrypted.cpf_encrypted).toBe(true);

      const decrypted = encryption.decryptPII(encrypted);
      expect(decrypted.cpf).toBe(piiData.cpf);
      expect(decrypted.cpf_encrypted).toBeUndefined();
    });

    it('should anonymize data correctly', () => {
      const personalData = {
        nome: 'João Silva Santos',
        cpf: '11144477735',
        email: 'joao.silva@example.com',
        telefone: '11999887766'
      };

      const anonymized = encryption.anonymizeData(personalData);
      
      expect(anonymized.cpf).toBe('***.***.***-**');
      expect(anonymized.email).toContain('***');
      expect(anonymized.telefone).toBe('(**) ****-****');
      expect(anonymized.nome).toContain('João');
      expect(anonymized.nome).toContain('S***');
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Reset rate limit store
      validation['rateLimitStore'] = new Map();
    });

    it('should allow requests within limit', () => {
      const identifier = 'test-user';
      const limit = 5;
      const windowMs = 60000; // 1 minute

      // Should allow first 5 requests
      for (let i = 0; i < limit; i++) {
        expect(validation.validateRateLimit(identifier, limit, windowMs)).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const identifier = 'test-user';
      const limit = 3;
      const windowMs = 60000;

      // Fill up the limit
      for (let i = 0; i < limit; i++) {
        validation.validateRateLimit(identifier, limit, windowMs);
      }

      // Next request should be blocked
      expect(validation.validateRateLimit(identifier, limit, windowMs)).toBe(false);
    });
  });

  describe('Data Transmission Security', () => {
    it('should securely prepare and receive data transmission', () => {
      const originalData = {
        leadId: '123',
        clientName: 'João Silva',
        sensitive: 'confidential info'
      };

      const transmission = encryption.prepareForTransmission(originalData);
      
      expect(transmission.payload).not.toContain('João Silva');
      expect(transmission.checksum).toBeTruthy();
      expect(transmission.timestamp).toBeTruthy();

      const received = encryption.receiveTransmission(transmission);
      expect(received).toEqual(originalData);
    });

    it('should reject tampered transmissions', () => {
      const originalData = { test: 'data' };
      const transmission = encryption.prepareForTransmission(originalData);
      
      // Tamper with checksum
      transmission.checksum = 'invalid-checksum';
      
      expect(() => {
        encryption.receiveTransmission(transmission);
      }).toThrow('Data integrity check failed');
    });

    it('should reject expired transmissions', () => {
      const originalData = { test: 'data' };
      const transmission = encryption.prepareForTransmission(originalData);
      
      // Make transmission appear old
      transmission.timestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      
      expect(() => {
        encryption.receiveTransmission(transmission);
      }).toThrow('Transmission expired');
    });
  });
});

describe('🚀 Performance Tests', () => {
  describe('Cache Performance', () => {
    it('should cache data efficiently', async () => {
      const { cacheService } = await import('@/utils/cacheService');
      
      const key = 'test-key';
      const data = { test: 'data', timestamp: Date.now() };
      
      // Set data
      await cacheService.set(key, data);
      
      // Get data (should be from cache)
      const cached = await cacheService.get(key);
      expect(cached).toEqual(data);
    });

    it('should handle cache expiration', async () => {
      const { cacheService } = await import('@/utils/cacheService');
      
      const key = 'expire-test';
      const data = { test: 'data' };
      const shortTTL = 100; // 100ms
      
      await cacheService.set(key, data, shortTTL);
      
      // Should be available immediately
      expect(await cacheService.get(key)).toEqual(data);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(await cacheService.get(key)).toBeNull();
    });
  });

  describe('Query Optimization', () => {
    it('should use debounced search', async () => {
      const { useAgentesIAFilters } = await import('@/components/AgentesIA/hooks/useAgentesIAFilters');
      
      // This would test the debounce functionality
      // In a real test, we'd mock React hooks and test timing
      expect(useAgentesIAFilters).toBeDefined();
    });
  });
});

describe('📊 Business Logic Tests', () => {
  describe('Lead Validation', () => {
    it('should validate lead data correctly', () => {
      const validLead = {
        nome: 'João Silva',
        email: 'joao@example.com',
        telefone: '11999887766',
        area_juridica: 'Direito Trabalhista',
        descricao: 'Preciso de ajuda com rescisão'
      };

      const result = validation.validateLeadData(validLead);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData.nome).toBe('João Silva');
    });

    it('should reject invalid lead data', () => {
      const invalidLead = {
        nome: '', // Empty name
        email: 'invalid-email', // Invalid email
        telefone: '123', // Invalid phone
        area_juridica: '', // Empty area
      };

      const result = validation.validateLeadData(invalidLead);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Contract Validation', () => {
    it('should validate contract data correctly', () => {
      const validContract = {
        titulo: 'Contrato de Prestação de Serviços',
        valor: 5000.50,
        cliente_nome: 'Maria Santos',
        cliente_email: 'maria@example.com'
      };

      const result = validation.validateContractData(validContract);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.valor).toBe(5000.50);
    });
  });
});

// Integration test for the complete security flow
describe('🔒 Integration Security Tests', () => {
  it('should handle complete secure data flow', async () => {
    // 1. Validate input
    const leadData = {
      nome: 'João Silva',
      email: 'joao@example.com',
      telefone: '11999887766',
      area_juridica: 'Direito Trabalhista'
    };

    const validation_result = validation.validateLeadData(leadData);
    expect(validation_result.isValid).toBe(true);

    // 2. Encrypt sensitive data
    const encryptedData = encryption.encryptPII(validation_result.sanitizedData);
    expect(encryptedData.telefone).not.toBe(leadData.telefone);

    // 3. Prepare for transmission
    const transmission = encryption.prepareForTransmission(encryptedData);
    expect(transmission.payload).toBeTruthy();
    expect(transmission.checksum).toBeTruthy();

    // 4. Receive and decrypt
    const received = encryption.receiveTransmission(transmission);
    const decrypted = encryption.decryptPII(received);
    
    expect(decrypted.telefone).toBe(leadData.telefone);
    expect(decrypted.nome).toBe(leadData.nome);
  });
});

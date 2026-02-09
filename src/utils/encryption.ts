// ==========================================
// ENCRYPTION & SECURITY SERVICE
// ==========================================

import CryptoJS from 'crypto-js';

class EncryptionService {
  private readonly secretKey: string;
  private readonly algorithm = 'AES';

  constructor() {
    const envKey = import.meta.env.VITE_ENCRYPTION_KEY;

    if (!envKey && import.meta.env.PROD) {
      throw new Error('VITE_ENCRYPTION_KEY is required in production. Refusing to start with a random key.');
    }

    this.secretKey = envKey || this.generateSecureKey();

    if (import.meta.env.DEV && !envKey) {
      console.warn('⚠️ Using generated encryption key. Set VITE_ENCRYPTION_KEY for persistent encryption.');
    }
  }

  // Generate a secure random key
  private generateSecureKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  // Encrypt sensitive data
  encrypt(plaintext: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(plaintext, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt sensitive data
  decrypt(ciphertext: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Invalid ciphertext or key');
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash passwords (one-way)
  hashPassword(password: string): string {
    const salt = CryptoJS.lib.WordArray.random(128/8);
    const hash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    });
    
    return salt.toString() + ':' + hash.toString();
  }

  // Verify password against hash
  verifyPassword(password: string, hash: string): boolean {
    try {
      const [salt, originalHash] = hash.split(':');
      const computedHash = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
        keySize: 256/32,
        iterations: 10000
      });
      
      return computedHash.toString() === originalHash;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  // Generate secure tokens
  generateToken(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  // Hash data for integrity checks
  hashData(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  // Encrypt sensitive fields in objects
  encryptSensitiveFields(data: Record<string, unknown>, sensitiveFields: string[]): Record<string, unknown> {
    const encrypted = { ...data };
    
    sensitiveFields.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(String(encrypted[field]));
        encrypted[`${field}_encrypted`] = true;
      }
    });
    
    return encrypted;
  }

  // Decrypt sensitive fields in objects
  decryptSensitiveFields(data: Record<string, unknown>, sensitiveFields: string[]): Record<string, unknown> {
    const decrypted = { ...data };
    
    sensitiveFields.forEach(field => {
      if (decrypted[field] && decrypted[`${field}_encrypted`]) {
        try {
          decrypted[field] = this.decrypt(String(decrypted[field]));
          delete decrypted[`${field}_encrypted`];
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
        }
      }
    });
    
    return decrypted;
  }

  // Encrypt PII data for LGPD compliance
  encryptPII(data: {
    cpf?: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    [key: string]: unknown;
  }): Record<string, unknown> {
    const piiFields = ['cpf', 'telefone', 'endereco'];
    return this.encryptSensitiveFields(data, piiFields);
  }

  // Decrypt PII data
  decryptPII(data: Record<string, unknown>): Record<string, unknown> {
    const piiFields = ['cpf', 'telefone', 'endereco'];
    return this.decryptSensitiveFields(data, piiFields);
  }

  // Generate LGPD compliant data anonymization
  anonymizeData(data: Record<string, unknown>): Record<string, unknown> {
    const anonymized = { ...data };
    
    // Replace sensitive data with anonymized versions
    if (anonymized.cpf) {
      anonymized.cpf = '***.***.***-**';
    }
    
    if (anonymized.email && typeof anonymized.email === 'string') {
      const [username, domain] = anonymized.email.split('@');
      anonymized.email = `${username.substring(0, 2)}***@${domain}`;
    }
    
    if (anonymized.telefone) {
      anonymized.telefone = '(**) ****-****';
    }
    
    if (anonymized.nome && typeof anonymized.nome === 'string') {
      const names = anonymized.nome.split(' ');
      anonymized.nome = names.map((name: string, index: number) => 
        index === 0 ? name : name.charAt(0) + '***'
      ).join(' ');
    }
    
    return anonymized;
  }

  // Secure data transmission
  prepareForTransmission(data: Record<string, unknown>): {
    payload: string;
    checksum: string;
    timestamp: number;
  } {
    const timestamp = Date.now();
    const payload = JSON.stringify({ ...data, timestamp });
    const encrypted = this.encrypt(payload);
    const checksum = this.hashData(encrypted);
    
    return {
      payload: encrypted,
      checksum,
      timestamp
    };
  }

  // Verify and decrypt transmitted data
  receiveTransmission(transmission: {
    payload: string;
    checksum: string;
    timestamp: number;
  }): Record<string, unknown> {
    // Verify checksum
    const computedChecksum = this.hashData(transmission.payload);
    if (computedChecksum !== transmission.checksum) {
      throw new Error('Data integrity check failed');
    }
    
    // Check timestamp (prevent replay attacks)
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - transmission.timestamp > maxAge) {
      throw new Error('Transmission expired');
    }
    
    // Decrypt and parse
    const decrypted = this.decrypt(transmission.payload);
    const data = JSON.parse(decrypted);
    
    // Verify embedded timestamp
    if (data.timestamp !== transmission.timestamp) {
      throw new Error('Timestamp mismatch');
    }
    
    delete data.timestamp;
    return data;
  }
}

// Export singleton
export const encryption = new EncryptionService();

// Convenience exports
export const encrypt = encryption.encrypt.bind(encryption);
export const decrypt = encryption.decrypt.bind(encryption);
export const hashPassword = encryption.hashPassword.bind(encryption);
export const verifyPassword = encryption.verifyPassword.bind(encryption);
export const generateToken = encryption.generateToken.bind(encryption);
export const encryptPII = encryption.encryptPII.bind(encryption);
export const decryptPII = encryption.decryptPII.bind(encryption);
export const anonymizeData = encryption.anonymizeData.bind(encryption);

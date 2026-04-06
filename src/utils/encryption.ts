// ==========================================
// ENCRYPTION & SECURITY SERVICE
// ==========================================
// encrypt/decrypt delegate to server-side Edge Functions.
// VITE_ENCRYPTION_KEY is NO LONGER used — the key lives only in Supabase Secrets.
// hashPassword, hashData, generateToken, anonymizeData remain client-side (no secret needed).
// All hashing uses the native Web Crypto API (zero bundle cost).

import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('EncryptionService');

class EncryptionService {
  // Encrypt sensitive data via server-side Edge Function
  async encrypt(plaintext: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('encrypt-data', {
      body: { plaintext },
    });

    if (error || !data?.ciphertext) {
      log.error('Encryption error', error);
      throw new Error('Failed to encrypt data');
    }

    return data.ciphertext as string;
  }

  // Decrypt sensitive data via server-side Edge Function
  async decrypt(ciphertext: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('decrypt-data', {
      body: { ciphertext },
    });

    if (error || data?.plaintext === undefined || data?.plaintext === null) {
      log.error('Decryption error', error);
      throw new Error('Failed to decrypt data');
    }

    return data.plaintext as string;
  }

  /**
   * Hash a password using PBKDF2 via the native Web Crypto API.
   * @deprecated Hashing de senha deve ser feito server-side via Supabase Auth.
   * Esta função existe apenas para testes unitários.
   */
  async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16))
      .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: encoder.encode(actualSalt), iterations: 10000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    const hash = Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return { hash, salt: actualSalt };
  }

  /** @deprecated Ver nota em hashPassword — não usar em produção no browser. */
  async verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
    try {
      const { hash } = await this.hashPassword(password, salt);
      return hash === storedHash;
    } catch (error) {
      log.error('Password verification error', error);
      return false;
    }
  }

  // Generate secure tokens using crypto.getRandomValues
  generateToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Hash data for integrity checks (native Web Crypto — zero bundle cost)
  async hashData(data: string): Promise<string> {
    const encoded = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Encrypt sensitive fields in objects (async)
  async encryptSensitiveFields(
    data: Record<string, unknown>,
    sensitiveFields: string[]
  ): Promise<Record<string, unknown>> {
    const encrypted = { ...data };

    for (const field of sensitiveFields) {
      const value = encrypted[field];
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        encrypted[field] = await this.encrypt(String(value));
        encrypted[`${field}_encrypted`] = true;
      }
    }

    return encrypted;
  }

  // Decrypt sensitive fields in objects (async)
  async decryptSensitiveFields(
    data: Record<string, unknown>,
    sensitiveFields: string[]
  ): Promise<Record<string, unknown>> {
    const decrypted = { ...data };

    for (const field of sensitiveFields) {
      const value = decrypted[field];
      if (
        value != null &&
        typeof value === 'string' &&
        decrypted[`${field}_encrypted`]
      ) {
        try {
          decrypted[field] = await this.decrypt(value);
          delete decrypted[`${field}_encrypted`];
        } catch (error) {
          log.error(`Failed to decrypt field ${field}`, error);
        }
      }
    }

    return decrypted;
  }

  // Encrypt PII data for LGPD compliance (async)
  async encryptPII(data: {
    cpf?: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    [key: string]: unknown;
  }): Promise<Record<string, unknown>> {
    const piiFields = ['cpf', 'telefone', 'endereco'];
    return this.encryptSensitiveFields(data, piiFields);
  }

  // Decrypt PII data (async)
  async decryptPII(
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const piiFields = ['cpf', 'telefone', 'endereco'];
    return this.decryptSensitiveFields(data, piiFields);
  }

  // Generate LGPD compliant data anonymization
  anonymizeData(data: Record<string, unknown>): Record<string, unknown> {
    const anonymized = { ...data };

    if (anonymized.cpf) {
      anonymized.cpf = '***.***.***-**';
    }

    if (anonymized.email && typeof anonymized.email === 'string') {
      const [username, domain] = anonymized.email.split('@');
      anonymized.email = `${(username ?? '').substring(0, 2)}***@${domain ?? ''}`;
    }

    if (anonymized.telefone) {
      anonymized.telefone = '(**) ****-****';
    }

    if (anonymized.nome && typeof anonymized.nome === 'string') {
      const names = anonymized.nome.split(' ');
      anonymized.nome = names
        .map((name: string, index: number) =>
          index === 0 ? name : name.charAt(0) + '***'
        )
        .join(' ');
    }

    return anonymized;
  }

  // Secure data transmission (async)
  async prepareForTransmission(data: Record<string, unknown>): Promise<{
    payload: string;
    checksum: string;
    timestamp: number;
  }> {
    const timestamp = Date.now();
    const payload = JSON.stringify({ ...data, timestamp });
    const encrypted = await this.encrypt(payload);
    const checksum = await this.hashData(encrypted);

    return { payload: encrypted, checksum, timestamp };
  }

  // Verify and decrypt transmitted data (async)
  async receiveTransmission(transmission: {
    payload: string;
    checksum: string;
    timestamp: number;
  }): Promise<Record<string, unknown>> {
    const computedChecksum = await this.hashData(transmission.payload);
    if (computedChecksum !== transmission.checksum) {
      throw new Error('Data integrity check failed');
    }

    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - transmission.timestamp > maxAge) {
      throw new Error('Transmission expired');
    }

    const decrypted = await this.decrypt(transmission.payload);
    const data = JSON.parse(decrypted);

    if (data.timestamp !== transmission.timestamp) {
      throw new Error('Timestamp mismatch');
    }

    delete data.timestamp;
    return data;
  }
}

// Export singleton
export const encryption = new EncryptionService();

// Convenience exports (now async)
export const encrypt = encryption.encrypt.bind(encryption);
export const decrypt = encryption.decrypt.bind(encryption);
export const hashPassword = encryption.hashPassword.bind(encryption);
export const verifyPassword = encryption.verifyPassword.bind(encryption);
export const generateToken = encryption.generateToken.bind(encryption);
export const encryptPII = encryption.encryptPII.bind(encryption);
export const decryptPII = encryption.decryptPII.bind(encryption);
export const anonymizeData = encryption.anonymizeData.bind(encryption);

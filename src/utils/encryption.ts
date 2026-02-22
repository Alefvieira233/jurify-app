// ==========================================
// ENCRYPTION & SECURITY SERVICE
// ==========================================
// encrypt/decrypt delegate to server-side Edge Functions.
// VITE_ENCRYPTION_KEY is NO LONGER used — the key lives only in Supabase Secrets.
// hashPassword, hashData, generateToken, anonymizeData remain client-side (no secret needed).

import CryptoJS from 'crypto-js';
import { supabase } from '@/integrations/supabase/client';

class EncryptionService {
  // Encrypt sensitive data via server-side Edge Function
  async encrypt(plaintext: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('encrypt-data', {
      body: { plaintext },
    });

    if (error || !data?.ciphertext) {
      console.error('Encryption error:', error);
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
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }

    return data.plaintext as string;
  }

  /**
   * @deprecated NÃO chamar no browser em produção — PBKDF2 com 600k iterações
   * bloqueia a UI thread por vários segundos. Hashing de senha deve ser feito
   * server-side via Supabase Auth. Esta função existe apenas para testes unitários.
   */
  hashPassword(password: string): string {
    const salt = CryptoJS.lib.WordArray.random(128 / 8);
    const hash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 600000,
      hasher: CryptoJS.algo.SHA256,
    });

    return salt.toString() + ':' + hash.toString();
  }

  /** @deprecated Ver nota em hashPassword — não usar em produção no browser. */
  verifyPassword(password: string, storedHash: string): boolean {
    try {
      const [salt, originalHash] = storedHash.split(':');
      const computedHash = CryptoJS.PBKDF2(
        password,
        CryptoJS.enc.Hex.parse(salt ?? ''),
        {
          keySize: 256 / 32,
          iterations: 600000,
          hasher: CryptoJS.algo.SHA256,
        }
      );

      return computedHash.toString() === originalHash;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  // Generate secure tokens using crypto.getRandomValues
  generateToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Hash data for integrity checks
  hashData(data: string): string {
    return CryptoJS.SHA256(data).toString();
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
          console.error(`Failed to decrypt field ${field}:`, error);
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
    const checksum = this.hashData(encrypted);

    return { payload: encrypted, checksum, timestamp };
  }

  // Verify and decrypt transmitted data (async)
  async receiveTransmission(transmission: {
    payload: string;
    checksum: string;
    timestamp: number;
  }): Promise<Record<string, unknown>> {
    const computedChecksum = this.hashData(transmission.payload);
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

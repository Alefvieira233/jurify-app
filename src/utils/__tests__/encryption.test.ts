import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  encryption,
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateToken,
  encryptPII,
  decryptPII,
  anonymizeData,
} from '../encryption';

// Mock Supabase client with functions.invoke for encrypt/decrypt Edge Functions
vi.mock('@/integrations/supabase/client', () => {
  const client = {
    functions: {
      invoke: vi.fn(async (fnName: string, opts: { body: Record<string, string> }) => {
        if (fnName === 'encrypt-data') {
          const encoded = btoa(unescape(encodeURIComponent(opts.body.plaintext)));
          return { data: { ciphertext: `mock_enc:${encoded}` }, error: null };
        }
        if (fnName === 'decrypt-data') {
          const ct = opts.body.ciphertext;
          if (!ct || !ct.startsWith('mock_enc:')) {
            return { data: null, error: new Error('Invalid ciphertext') };
          }
          const decoded = decodeURIComponent(escape(atob(ct.replace('mock_enc:', ''))));
          return { data: { plaintext: decoded }, error: null };
        }
        return { data: null, error: new Error('Unknown function') };
      }),
    },
  };
  return { supabase: client, supabaseUntyped: client };
});

describe('EncryptionService', () => {
  // =========================================================================
  // encrypt / decrypt
  // =========================================================================
  describe('encrypt & decrypt', () => {
    it('encrypts and decrypts a simple string', async () => {
      const plaintext = 'Hello Jurify!';
      const ciphertext = await encrypt(plaintext);

      expect(ciphertext).not.toBe(plaintext);
      expect(ciphertext.length).toBeGreaterThan(0);
      expect(await decrypt(ciphertext)).toBe(plaintext);
    });

    it('handles unicode / accented characters', async () => {
      const plaintext = 'João da Silva — advogado nº 12.345';
      const ciphertext = await encrypt(plaintext);
      expect(await decrypt(ciphertext)).toBe(plaintext);
    });

    it('encrypts empty string via Edge Function', async () => {
      const ciphertext = await encrypt('');
      expect(ciphertext.length).toBeGreaterThan(0);
      expect(await decrypt(ciphertext)).toBe('');
    });

    it('handles long strings (> 10 KB)', async () => {
      const plaintext = 'A'.repeat(10_000);
      const ciphertext = await encrypt(plaintext);
      expect(await decrypt(ciphertext)).toBe(plaintext);
    });

    it('throws on invalid ciphertext', async () => {
      await expect(decrypt('not-a-valid-ciphertext!!!')).rejects.toThrow();
    });
  });

  // =========================================================================
  // hashPassword / verifyPassword
  // =========================================================================
  describe('hashPassword & verifyPassword (600k PBKDF2)', () => {
    it('hashes and verifies a password', () => {
      const password = 'MyStr0ng!Pass';
      const hash = hashPassword(password);

      expect(hash).toContain(':');
      expect(verifyPassword(password, hash)).toBe(true);
    }, 60_000);

    it('rejects wrong password', () => {
      const hash = hashPassword('correct-password');
      expect(verifyPassword('wrong-password', hash)).toBe(false);
    }, 60_000);

    it('produces different hashes for the same password (random salt)', () => {
      const password = 'same-password';
      const h1 = hashPassword(password);
      const h2 = hashPassword(password);
      expect(h1).not.toBe(h2);
    }, 60_000);

    it('returns false for malformed hash', () => {
      expect(verifyPassword('password', 'no-colon-here')).toBe(false);
    }, 60_000);
  });

  // =========================================================================
  // generateToken
  // =========================================================================
  describe('generateToken', () => {
    it('generates a hex string of expected length', () => {
      const token = generateToken(32);
      // 32 bytes = 64 hex chars
      expect(token).toMatch(/^[0-9a-f]+$/i);
      expect(token.length).toBe(64);
    });

    it('generates unique tokens', () => {
      const tokens = new Set(Array.from({ length: 20 }, () => generateToken()));
      expect(tokens.size).toBe(20);
    });
  });

  // =========================================================================
  // encryptSensitiveFields / decryptSensitiveFields
  // =========================================================================
  describe('encryptSensitiveFields & decryptSensitiveFields', () => {
    it('encrypts only specified fields', async () => {
      const data = { nome: 'João', cpf: '12345678900', email: 'j@test.com' };
      const result = await encryption.encryptSensitiveFields(data, ['cpf']);

      expect(result.nome).toBe('João');
      expect(result.cpf).not.toBe('12345678900');
      expect(result.cpf_encrypted).toBe(true);
      expect(result.email).toBe('j@test.com');
    });

    it('round-trips encrypt then decrypt', async () => {
      const original = { cpf: '12345678900', telefone: '11999998888' };
      const fields = ['cpf', 'telefone'];

      const encrypted = await encryption.encryptSensitiveFields(original, fields);
      const decrypted = await encryption.decryptSensitiveFields(encrypted, fields);

      expect(decrypted.cpf).toBe('12345678900');
      expect(decrypted.telefone).toBe('11999998888');
      expect(decrypted.cpf_encrypted).toBeUndefined();
    });

    it('skips null / undefined fields', async () => {
      const data = { cpf: null, nome: 'Test' };
      const result = await encryption.encryptSensitiveFields(data as Record<string, unknown>, ['cpf']);
      expect(result.cpf).toBeNull();
      expect(result.cpf_encrypted).toBeUndefined();
    });

    it('encrypts numeric and boolean values', async () => {
      const data = { score: 42, active: true };
      const result = await encryption.encryptSensitiveFields(data, ['score', 'active']);
      expect(result.score).not.toBe(42);
      expect(result.score_encrypted).toBe(true);
      expect(result.active_encrypted).toBe(true);
    });
  });

  // =========================================================================
  // encryptPII / decryptPII (LGPD)
  // =========================================================================
  describe('PII encryption (LGPD)', () => {
    it('encrypts cpf, telefone, endereco but NOT email', async () => {
      const pii = {
        cpf: '529.982.247-25',
        email: 'joao@test.com',
        telefone: '11999998888',
        endereco: 'Rua das Flores, 123',
      };

      const encrypted = await encryptPII(pii);

      expect(encrypted.cpf).not.toBe(pii.cpf);
      expect(encrypted.email).toBe(pii.email); // email is NOT in piiFields
      expect(encrypted.telefone).not.toBe(pii.telefone);
      expect(encrypted.endereco).not.toBe(pii.endereco);
    });

    it('round-trips encryptPII then decryptPII', async () => {
      const pii = {
        cpf: '52998224725',
        telefone: '11999998888',
        endereco: 'Av Paulista, 1000',
      };

      const encrypted = await encryptPII(pii);
      const decrypted = await decryptPII(encrypted);

      expect(decrypted.cpf).toBe(pii.cpf);
      expect(decrypted.telefone).toBe(pii.telefone);
      expect(decrypted.endereco).toBe(pii.endereco);
    });
  });

  // =========================================================================
  // anonymizeData
  // =========================================================================
  describe('anonymizeData', () => {
    it('masks CPF', () => {
      const result = anonymizeData({ cpf: '529.982.247-25' });
      expect(result.cpf).toBe('***.***.***-**');
    });

    it('masks email keeping first 2 chars', () => {
      const result = anonymizeData({ email: 'joao@test.com' });
      expect(result.email).toBe('jo***@test.com');
    });

    it('masks telefone', () => {
      const result = anonymizeData({ telefone: '11999998888' });
      expect(result.telefone).toBe('(**) ****-****');
    });

    it('partially masks nome', () => {
      const result = anonymizeData({ nome: 'João Silva' });
      expect(result.nome).toBe('João S***');
    });

    it('preserves non-sensitive fields', () => {
      const result = anonymizeData({ area_juridica: 'Trabalhista', cpf: '123' });
      expect(result.area_juridica).toBe('Trabalhista');
    });
  });

  // =========================================================================
  // prepareForTransmission / receiveTransmission
  // =========================================================================
  describe('secure transmission', () => {
    it('round-trips data through transmission', async () => {
      const data = { nome: 'João', valor: 1500 };
      const transmission = await encryption.prepareForTransmission(data);

      expect(transmission.payload).toBeTruthy();
      expect(transmission.checksum).toBeTruthy();
      expect(transmission.timestamp).toBeGreaterThan(0);

      const received = await encryption.receiveTransmission(transmission);
      expect(received.nome).toBe('João');
      expect(received.valor).toBe(1500);
    });

    it('rejects tampered payload (checksum mismatch)', async () => {
      const transmission = await encryption.prepareForTransmission({ test: true });
      transmission.payload = transmission.payload + 'TAMPERED';

      await expect(
        encryption.receiveTransmission(transmission)
      ).rejects.toThrow('Data integrity check failed');
    });

    it('rejects expired transmission', async () => {
      const transmission = await encryption.prepareForTransmission({ test: true });
      // Set timestamp to 10 minutes ago
      transmission.timestamp = Date.now() - 10 * 60 * 1000;

      await expect(
        encryption.receiveTransmission(transmission)
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // hashData
  // =========================================================================
  describe('hashData', () => {
    it('produces consistent SHA-256 hash', () => {
      const h1 = encryption.hashData('test');
      const h2 = encryption.hashData('test');
      expect(h1).toBe(h2);
    });

    it('produces different hashes for different inputs', () => {
      const h1 = encryption.hashData('input-a');
      const h2 = encryption.hashData('input-b');
      expect(h1).not.toBe(h2);
    });

    it('returns 64-char hex string (SHA-256)', () => {
      const hash = encryption.hashData('anything');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});

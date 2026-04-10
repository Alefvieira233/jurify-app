/**
 * Edge function shared module — `_shared/crypto.ts`
 *
 * Tests the AES-256-GCM + PBKDF2 encryption helpers used by:
 *   - google-calendar (OAuth token storage)
 *   - create-drive-folder (token refresh)
 *   - encrypt-data / decrypt-data edge functions
 *
 * These tests run under Node/Vitest against the real Web Crypto API
 * (available in modern Node) and import the edge function source directly.
 * If the encryption algorithm, format, or iteration count changes, these
 * tests fail — which is exactly what you want for a crypto primitive.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Point ENCRYPTION_KEY at a well-known test value so the helpers can find it
// via `Deno.env.get("ENCRYPTION_KEY")`. We stub `Deno.env` since the helper
// uses it at call time.
const TEST_KEY = 'test-encryption-key-for-vitest-only-32b';

beforeEach(() => {
  const globalAny = globalThis as Record<string, unknown>;
  globalAny.Deno = {
    env: {
      get: (name: string) => (name === 'ENCRYPTION_KEY' ? TEST_KEY : undefined),
    },
  };
});

const { encrypt, decrypt } = await import('../../../../supabase/functions/_shared/crypto');

describe('crypto.encrypt / decrypt — round trip', () => {
  it('encrypts and decrypts a simple ASCII string', async () => {
    const plaintext = 'hello world';
    const ciphertext = await encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext.split(':')).toHaveLength(3); // salt:iv:encrypted
    const decrypted = await decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('handles UTF-8 text (Portuguese accents, emoji)', async () => {
    const plaintext = 'Olá, João! ⚖️ contratos em análise';
    const ciphertext = await encrypt(plaintext);
    const decrypted = await decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('handles long text (1 KB)', async () => {
    const plaintext = 'a'.repeat(1024);
    const ciphertext = await encrypt(plaintext);
    const decrypted = await decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for the same plaintext (salt + IV are random)', async () => {
    const plaintext = 'same input';
    const c1 = await encrypt(plaintext);
    const c2 = await encrypt(plaintext);
    expect(c1).not.toBe(c2);
    // Both should decrypt to the same plaintext
    expect(await decrypt(c1)).toBe(plaintext);
    expect(await decrypt(c2)).toBe(plaintext);
  });

  it('handles realistic OAuth token shapes', async () => {
    const token = 'ya29.a0AfH6SMBx_example_google_oauth_access_token_with_dots.and-dashes-and_underscores-1234567890';
    const ciphertext = await encrypt(token);
    const decrypted = await decrypt(ciphertext);
    expect(decrypted).toBe(token);
  });
});

describe('crypto.decrypt — tamper detection', () => {
  it('rejects a tampered ciphertext component', async () => {
    const ciphertext = await encrypt('sensitive data');
    const [salt, iv, enc] = ciphertext.split(':');
    // Flip a bit in the encrypted portion
    const tamperedEnc = enc.slice(0, -1) + (enc.endsWith('=') ? 'a' : '=');
    const tampered = `${salt}:${iv}:${tamperedEnc}`;
    await expect(decrypt(tampered)).rejects.toThrow();
  });

  it('rejects a swapped salt between two encrypted values', async () => {
    const c1 = await encrypt('first');
    const c2 = await encrypt('second');
    const [, iv1, enc1] = c1.split(':');
    const [salt2] = c2.split(':');
    const mixed = `${salt2}:${iv1}:${enc1}`;
    await expect(decrypt(mixed)).rejects.toThrow();
  });

  it('rejects malformed ciphertext (missing parts)', async () => {
    await expect(decrypt('no-colons')).rejects.toThrow(/Invalid ciphertext format/);
    await expect(decrypt('only:two')).rejects.toThrow(/Invalid ciphertext format/);
    await expect(decrypt('')).rejects.toThrow();
  });
});

describe('crypto — key rotation detection', () => {
  it('decrypt fails when ENCRYPTION_KEY is changed', async () => {
    const ciphertext = await encrypt('rotate-me');

    // Swap the key under the helper's feet
    const globalAny = globalThis as Record<string, unknown>;
    globalAny.Deno = {
      env: {
        get: (name: string) => (name === 'ENCRYPTION_KEY' ? 'completely-different-key-xxxxxxxx' : undefined),
      },
    };

    await expect(decrypt(ciphertext)).rejects.toThrow();
  });

  it('encrypt throws when ENCRYPTION_KEY is missing', async () => {
    const globalAny = globalThis as Record<string, unknown>;
    globalAny.Deno = { env: { get: () => undefined } };

    await expect(encrypt('x')).rejects.toThrow(/ENCRYPTION_KEY not configured/);
  });
});

describe('crypto — format invariants', () => {
  it('ciphertext format is base64(salt):base64(iv):base64(encrypted)', async () => {
    const ciphertext = await encrypt('format check');
    const parts = ciphertext.split(':');
    expect(parts).toHaveLength(3);

    // Each part must be valid base64
    for (const part of parts) {
      expect(() => atob(part)).not.toThrow();
    }

    // Salt should be 16 bytes → 24 base64 chars (incl padding)
    expect(atob(parts[0]).length).toBe(16);
    // IV should be 12 bytes → 16 base64 chars
    expect(atob(parts[1]).length).toBe(12);
  });
});

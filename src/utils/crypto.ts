/**
 * 🔐 Cryptographic Utilities
 *
 * Environment-aware secure random value generation using CSPRNG.
 * Safe for use in both browser and Deno/Edge environments.
 */

/**
 * Gets the environment-appropriate crypto object.
 */
function getCrypto(): Crypto | null {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return null;
}

/**
 * Generates a cryptographically strong random hex string of the specified byte length.
 */
export function generateSecureId(bytes = 8): string {
  const array = new Uint8Array(bytes);
  const crypto = getCrypto();

  if (crypto && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for extremely legacy environments (should not happen in modern Jurify stack)
    for (let i = 0; i < bytes; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a cryptographically strong random 32-bit unsigned integer.
 */
export function generateSecureUint32(): number {
  const array = new Uint32Array(1);
  const crypto = getCrypto();

  if (crypto && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    array[0] = Math.floor(Math.random() * 0xFFFFFFFF);
  }

  return array[0]!;
}

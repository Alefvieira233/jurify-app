/**
 * 🔐 Cryptographic Utilities (Shared)
 */

export function generateSecureId(bytes = 8): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSecureUint32(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0]!;
}

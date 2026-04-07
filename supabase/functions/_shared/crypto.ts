/**
 * Shared AES-256-GCM encryption/decryption utilities for Edge Functions.
 * Uses ENCRYPTION_KEY from Supabase Secrets (same key as encrypt-data/decrypt-data).
 */

const PBKDF2_ITERATIONS = 600000;

function getEncryptionKey(): string {
  const key = Deno.env.get("ENCRYPTION_KEY");
  if (!key) throw new Error("ENCRYPTION_KEY not configured in Supabase Secrets");
  return key;
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(atob(b64).split("").map((c) => c.charCodeAt(0)));
}

/** Encrypt plaintext → base64 ciphertext (salt:iv:encrypted). */
export async function encrypt(plaintext: string): Promise<string> {
  const encKey = getEncryptionKey();
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(encKey), "PBKDF2", false, ["deriveKey"],
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, derivedKey, encoder.encode(plaintext),
  );

  return `${toBase64(salt)}:${toBase64(iv)}:${toBase64(encrypted)}`;
}

/** Decrypt base64 ciphertext (salt:iv:encrypted) → plaintext. */
export async function decrypt(ciphertext: string): Promise<string> {
  const encKey = getEncryptionKey();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");

  const salt = fromBase64(parts[0]);
  const iv = fromBase64(parts[1]);
  const encryptedData = fromBase64(parts[2]);

  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(encKey), "PBKDF2", false, ["deriveKey"],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, derivedKey, encryptedData,
  );

  return decoder.decode(decrypted);
}

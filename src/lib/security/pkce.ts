/**
 * 🔐 PKCE (RFC 7636) helpers for OAuth 2.0 Authorization Code flow.
 *
 * Used by the Google Calendar OAuth flow (`GoogleOAuthService`,
 * `useGoogleCalendarConnection`). Adds a defense-in-depth layer over the
 * already-required `state` CSRF parameter: even if an attacker intercepts the
 * authorization `code` (e.g. on a hostile mobile WebView, a misconfigured
 * shared device, or via a redirect URL leak), they cannot exchange it for
 * tokens without the `code_verifier` that lives only in the browser tab that
 * initiated the flow.
 *
 * Implementation notes:
 *   - Verifier: 32 random bytes → base64url (no padding) ≈ 43 chars.
 *     RFC 7636 §4.1 requires 43..128 chars from the unreserved set.
 *   - Challenge: SHA-256(verifier) → base64url, transport method "S256".
 *     We never emit the deprecated "plain" method.
 *   - State: 32 random bytes → hex (64 chars). Hex avoids any URL-encoding
 *     surprises in callback parsing.
 *
 * This module relies on Web Crypto (`crypto.subtle`, `crypto.getRandomValues`),
 * available in all evergreen browsers and in Node 16+ via the global `crypto`.
 */

const VERIFIER_BYTES = 32;
const STATE_BYTES = 32;

/** Encode bytes to RFC 4648 §5 base64url (no padding). */
function bytesToBase64Url(bytes: Uint8Array): string {
  // Build a binary string then base64-encode. We deliberately avoid spreading
  // the typed array directly into String.fromCharCode for large inputs (call
  // stack risk); 32 bytes is comfortably below the limit either way.
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Encode bytes to lowercase hex. */
function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Generate a fresh PKCE code verifier (RFC 7636 §4.1). 32 bytes of entropy
 * encoded as base64url, ~43 characters of unreserved ASCII.
 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(VERIFIER_BYTES);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

/**
 * Derive the S256 code challenge for a given verifier (RFC 7636 §4.2).
 * Returns base64url-encoded SHA-256 digest of the verifier's UTF-8 bytes.
 */
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  if (typeof verifier !== 'string' || verifier.length < 43 || verifier.length > 128) {
    throw new Error('PKCE verifier must be 43..128 chars (RFC 7636 §4.1).');
  }
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64Url(new Uint8Array(digest));
}

/**
 * Generate a fresh CSRF `state` (32 bytes of entropy encoded as hex).
 * Hex keeps the value safe for any URL/query-string transport without
 * percent-encoding surprises.
 */
export function generateState(): string {
  const bytes = new Uint8Array(STATE_BYTES);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Constant-time-ish string equality for opaque tokens. Length-disambiguates
 * before iterating so that early-exit timing only leaks "lengths differ" —
 * not where the bytes diverge. For UI-grade CSRF state checks this is
 * sufficient; nothing here gates production-critical secrets.
 */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

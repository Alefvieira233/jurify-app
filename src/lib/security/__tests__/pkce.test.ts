import { describe, it, expect } from 'vitest';
import {
  deriveCodeChallenge,
  generateCodeVerifier,
  generateState,
  safeEqual,
} from '../pkce';

// ─── generateCodeVerifier ────────────────────────────────────────────────────

describe('generateCodeVerifier', () => {
  it('produces 43..128 char base64url strings (RFC 7636 §4.1)', () => {
    for (let i = 0; i < 16; i++) {
      const v = generateCodeVerifier();
      expect(v.length).toBeGreaterThanOrEqual(43);
      expect(v.length).toBeLessThanOrEqual(128);
      // Unreserved set: A-Z a-z 0-9 - . _ ~ — base64url uses A-Z a-z 0-9 - _
      expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
      // No padding
      expect(v.includes('=')).toBe(false);
    }
  });

  it('emits unique values across calls (collision sanity check)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 64; i++) seen.add(generateCodeVerifier());
    expect(seen.size).toBe(64);
  });
});

// ─── deriveCodeChallenge ─────────────────────────────────────────────────────

describe('deriveCodeChallenge', () => {
  it('derives the canonical RFC 7636 fixture', async () => {
    // Fixture from RFC 7636 Appendix B.
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
    const actual = await deriveCodeChallenge(verifier);
    expect(actual).toBe(expectedChallenge);
  });

  it('produces deterministic output for identical input', async () => {
    const v = generateCodeVerifier();
    const a = await deriveCodeChallenge(v);
    const b = await deriveCodeChallenge(v);
    expect(a).toBe(b);
  });

  it('produces different outputs for different inputs', async () => {
    const a = await deriveCodeChallenge(generateCodeVerifier());
    const b = await deriveCodeChallenge(generateCodeVerifier());
    expect(a).not.toBe(b);
  });

  it('rejects verifiers shorter than 43 chars', async () => {
    await expect(deriveCodeChallenge('a'.repeat(42))).rejects.toThrow(/43..128/);
  });

  it('rejects verifiers longer than 128 chars', async () => {
    await expect(deriveCodeChallenge('a'.repeat(129))).rejects.toThrow(/43..128/);
  });

  it('rejects non-string input', async () => {
    // deno-lint-ignore no-explicit-any
    await expect(deriveCodeChallenge(undefined as any)).rejects.toThrow(/43..128/);
  });
});

// ─── generateState ───────────────────────────────────────────────────────────

describe('generateState', () => {
  it('produces 64-char lowercase hex (32 bytes of entropy)', () => {
    for (let i = 0; i < 16; i++) {
      const s = generateState();
      expect(s).toHaveLength(64);
      expect(s).toMatch(/^[0-9a-f]+$/);
    }
  });

  it('emits unique values across calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 64; i++) seen.add(generateState());
    expect(seen.size).toBe(64);
  });
});

// ─── safeEqual ──────────────────────────────────────────────────────────────

describe('safeEqual', () => {
  it('returns true for identical strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(safeEqual('abc', 'abd')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('returns false for non-string operands', () => {
    // deno-lint-ignore no-explicit-any
    expect(safeEqual(undefined as any, 'abc')).toBe(false);
    // deno-lint-ignore no-explicit-any
    expect(safeEqual('abc', null as any)).toBe(false);
  });
});

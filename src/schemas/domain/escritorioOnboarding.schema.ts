/**
 * @module schemas/domain/escritorioOnboarding
 * @description Zod schema for the onboarding "Escritorio" step (step 2).
 *
 * Captures the minimal firm identity required to personalize the app:
 * - nome_escritorio (required, 2..120 chars)
 * - cnpj (optional; if provided must pass digit check)
 * - endereco (optional)
 * - telefone_principal (optional)
 * - logo_url (optional; populated after upload to tenant-assets bucket)
 *
 * The schema intentionally marks CNPJ as optional — the owner may want to
 * skip that field during onboarding and fill it later from Settings.
 */

import { z } from 'zod';

// ─── CNPJ helpers ──────────────────────────────────────────────────────────

/** Strip all non-digit characters from a CNPJ string. */
export function stripCnpjMask(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Validate a CNPJ by its two check digits. Returns true for a 14-digit
 * string whose check digits match. Rejects trivial all-equal sequences
 * like `00000000000000` which pass the arithmetic but are never real.
 */
export function isValidCnpj(raw: string): boolean {
  const digits = stripCnpjMask(raw);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (slice: string, weights: number[]): number => {
    const sum = slice
      .split('')
      .reduce((acc, ch, idx) => acc + Number(ch) * (weights[idx] ?? 0), 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const first = calcDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const second = calcDigit(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return (
    first === Number(digits[12]) && second === Number(digits[13])
  );
}

// ─── Schemas ───────────────────────────────────────────────────────────────

const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

export const EscritorioOnboardingSchema = z.object({
  nome_escritorio: z
    .string({ required_error: 'Informe o nome do escritorio' })
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(120, 'Nome muito longo'),

  cnpj: z
    .preprocess(
      emptyToUndefined,
      z
        .string()
        .refine(isValidCnpj, { message: 'CNPJ invalido' })
        .optional(),
    ),

  endereco: z
    .preprocess(
      emptyToUndefined,
      z.string().max(240, 'Endereco muito longo').optional(),
    ),

  telefone_principal: z
    .preprocess(
      emptyToUndefined,
      z
        .string()
        .max(20, 'Telefone muito longo')
        .regex(/^[+\d()\-\s]+$/, 'Telefone invalido')
        .optional(),
    ),

  logo_url: z
    .preprocess(
      emptyToUndefined,
      z.string().url('URL invalida').optional(),
    ),
});

export type EscritorioOnboardingInput = z.input<typeof EscritorioOnboardingSchema>;
export type EscritorioOnboardingData = z.output<typeof EscritorioOnboardingSchema>;

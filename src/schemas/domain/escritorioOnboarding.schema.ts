/**
 * @module schemas/domain/escritorioOnboarding
 * @description Zod schemas for the onboarding "Escritorio" step (step 2).
 *
 * Captures the minimal firm identity required to personalize the app:
 * - nome_escritorio (required, 2..120 chars)
 * - cnpj (optional; if provided must pass digit check)
 * - endereco (optional)
 * - telefone_principal (optional)
 * - logo_url (optional; populated after upload to tenant-assets bucket)
 *
 * Two schemas exposed:
 * - `EscritorioOnboardingFormSchema` — plain strings, used by `react-hook-form`
 *   via `zodResolver`. Every field is `string` (or empty string) so the
 *   controlled inputs never see `unknown`.
 * - `EscritorioOnboardingSchema` — post-form validation/transforms (CNPJ
 *   digit check, trim, email/url). Call `safeParse()` on submit to get a
 *   normalized payload before writing to the DB.
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

// ─── Form schema ───────────────────────────────────────────────────────────
// Every field is a plain `string` so react-hook-form + `<Input />` stay typed.
// Only `nome_escritorio` is mandatory at the form layer — everything else may
// be empty string, which the domain schema normalizes to `undefined`.

export const EscritorioOnboardingFormSchema = z.object({
  nome_escritorio: z
    .string({ required_error: 'Informe o nome do escritorio' })
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(120, 'Nome muito longo'),
  cnpj: z.string().max(32, 'CNPJ muito longo').default(''),
  endereco: z.string().max(240, 'Endereco muito longo').default(''),
  telefone_principal: z
    .string()
    .max(20, 'Telefone muito longo')
    .default(''),
  logo_url: z.string().max(2048, 'URL muito longa').default(''),
});

export type EscritorioOnboardingForm = z.infer<
  typeof EscritorioOnboardingFormSchema
>;

// ─── Domain schema ─────────────────────────────────────────────────────────
// Consumes the form values and normalizes them into DB-ready shape.
// Empty strings become `undefined`; CNPJ mask is stripped and validated;
// URLs/phones are sanity-checked.

const emptyToUndefined = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const EscritorioOnboardingSchema = z.object({
  nome_escritorio: z
    .string({ required_error: 'Informe o nome do escritorio' })
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(120, 'Nome muito longo'),

  cnpj: z
    .string()
    .optional()
    .transform(emptyToUndefined)
    .refine((v) => v === undefined || isValidCnpj(v), {
      message: 'CNPJ invalido',
    }),

  endereco: z
    .string()
    .max(240, 'Endereco muito longo')
    .optional()
    .transform(emptyToUndefined),

  telefone_principal: z
    .string()
    .max(20, 'Telefone muito longo')
    .optional()
    .transform(emptyToUndefined)
    .refine(
      (v) => v === undefined || /^[+\d()\-\s]+$/.test(v),
      'Telefone invalido',
    ),

  logo_url: z
    .string()
    .optional()
    .transform(emptyToUndefined)
    .refine(
      (v) => {
        if (v === undefined) return true;
        try {
          void new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      'URL invalida',
    ),
});

export type EscritorioOnboardingInput = z.input<typeof EscritorioOnboardingSchema>;
export type EscritorioOnboardingData = z.output<typeof EscritorioOnboardingSchema>;

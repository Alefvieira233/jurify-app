/**
 * @module schemas/domain/teamInviteOnboarding
 * @description Zod schema for the onboarding "Equipe" step (step 3).
 *
 * Collects up to 5 invitation rows — email + role — and strips empty rows
 * before submission. Every non-empty row must be a valid email.
 */

import { z } from 'zod';

export const TEAM_INVITE_MAX = 5;

export const TeamInviteRoleSchema = z.enum(['admin', 'manager', 'member']);

export type TeamInviteRole = z.infer<typeof TeamInviteRoleSchema>;

const SingleInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Email invalido')
    .max(180, 'Email muito longo'),
  role: TeamInviteRoleSchema.default('member'),
});

/**
 * Wizard-state row — permits blank entries that users leave untouched.
 * We validate them via `TeamInvitesSubmitSchema` at submit time.
 */
export const TeamInviteDraftRowSchema = z.object({
  email: z.string().max(180).default(''),
  role: TeamInviteRoleSchema.default('member'),
});

export type TeamInviteDraftRow = z.infer<typeof TeamInviteDraftRowSchema>;

/**
 * Submit-time schema — filters out blank rows, validates the rest.
 * Also de-duplicates case-insensitive emails.
 */
export const TeamInvitesSubmitSchema = z
  .array(TeamInviteDraftRowSchema)
  .max(TEAM_INVITE_MAX, `Maximo ${TEAM_INVITE_MAX} convites por vez`)
  .transform((rows) =>
    rows
      .map((r) => ({ email: r.email.trim(), role: r.role }))
      .filter((r) => r.email.length > 0),
  )
  .pipe(
    z
      .array(SingleInviteSchema)
      .superRefine((rows, ctx) => {
        const seen = new Set<string>();
        rows.forEach((row, idx) => {
          const key = row.email.toLowerCase();
          if (seen.has(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [idx, 'email'],
              message: 'Email duplicado',
            });
          }
          seen.add(key);
        });
      }),
  );

export type TeamInviteSubmitData = z.infer<typeof TeamInvitesSubmitSchema>;

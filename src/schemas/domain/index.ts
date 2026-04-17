/**
 * Barrel for domain-row Zod schemas.
 *
 * Domain schemas validate Supabase rows at the hook boundary and coerce
 * them into the TypeScript domain types used by the rest of the app.
 * See `./README.md` for the pattern and migration guide.
 */

export { LeadRowSchema, type LeadRow } from './leadRow.schema';
export { ContratoRowSchema, type ContratoRow } from './contratoRow.schema';
export {
  ConexaoWhatsAppSchema,
  type ConexaoWhatsAppRow,
} from './conexaoWhatsApp.schema';
export {
  EscritorioOnboardingFormSchema,
  EscritorioOnboardingSchema,
  type EscritorioOnboardingForm,
  type EscritorioOnboardingInput,
  type EscritorioOnboardingData,
  isValidCnpj,
  stripCnpjMask,
} from './escritorioOnboarding.schema';
export {
  TeamInvitesSubmitSchema,
  TeamInviteDraftRowSchema,
  TeamInviteRoleSchema,
  TEAM_INVITE_MAX,
  type TeamInviteDraftRow,
  type TeamInviteRole,
  type TeamInviteSubmitData,
} from './teamInviteOnboarding.schema';

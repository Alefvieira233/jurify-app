/**
 * @module schemas/domain/conexaoWhatsApp
 * @description Zod schema for a raw Supabase `conexoes_whatsapp` row,
 * parsed at the hook boundary. See {@link ./README.md} for the pattern.
 *
 * Mirrors the `ConexaoWhatsApp` interface in `useConexoes.ts`. Joined
 * fields (`departamento`, `responsavel`) are optional here because the
 * list query in `useConexoes` does NOT join them — they are populated
 * only by dedicated detail queries.
 */

import { z } from 'zod';
import type { ConexaoWhatsApp } from '../../hooks/useConexoes';

const nullableString = z.string().nullable().catch(null).default(null);

const tipoSchema = z.enum(['kapso', 'oficial', 'cloud_api']).catch('kapso');

const configSchema = z
  .record(z.string(), z.unknown())
  .catch({})
  .default({});

const departamentoJoinSchema = z
  .object({
    id: z.string(),
    nome: z.string(),
    cor: z.string(),
  })
  .nullable()
  .optional();

const responsavelJoinSchema = z
  .object({
    id: z.string(),
    nome_completo: z.string(),
    email: z.string(),
  })
  .nullable()
  .optional();

export const ConexaoWhatsAppSchema = z.object({
  // Required identity
  id: z.string(),
  tenant_id: z.string(),
  nome: z.string().catch(''),

  // Contact info
  telefone: nullableString,

  // Classification
  tipo: tipoSchema,
  provider: z.string().catch(''),
  instance_name: nullableString,

  // Status
  status: z.string().catch('unknown'),
  status_padrao: nullableString,

  // Assignment
  departamento_id: nullableString,
  responsavel_id: nullableString,

  // Metadata
  avatar_url: nullableString,
  last_heartbeat: nullableString,
  last_sync: nullableString,
  last_error: nullableString,
  reconnect_attempts: z.number().catch(0).default(0),
  config: configSchema,
  created_at: z.string().catch(''),
  updated_at: z.string().catch(''),

  // Joined fields (optional — list query doesn't include them)
  departamento: departamentoJoinSchema,
  responsavel: responsavelJoinSchema,
});

export type ConexaoWhatsAppRow = z.infer<typeof ConexaoWhatsAppSchema>;

// ─── Compile-time cross-check ───────────────────────────────────────────────
// Asserts that every parsed row is assignable to the pre-existing
// ConexaoWhatsApp interface. If the schema drifts, the build breaks here.
export type AssertConexaoRowSatisfiesIface =
  ConexaoWhatsAppRow extends ConexaoWhatsApp
    ? true
    : 'ConexaoWhatsAppSchema drifted from ConexaoWhatsApp interface';
const _conexaoAssignabilityCheck: AssertConexaoRowSatisfiesIface = true;
void _conexaoAssignabilityCheck;

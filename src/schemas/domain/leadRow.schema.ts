/**
 * @module schemas/domain/leadRow
 * @description Zod schema for a raw Supabase `leads` row, parsed at the
 * hook boundary and coerced into the domain {@link Lead} type.
 *
 * WHY THIS EXISTS
 * ---------------
 * Supabase generates TypeScript types from the DB schema, but those types
 * are structurally loose: JSON columns become `Json`, nullable columns
 * become `T | null`, and fields can silently go missing if a migration
 * renames a column. The codebase historically used `as unknown as Lead`
 * casts to bridge this gap — these bypass runtime validation, so a
 * missing column only surfaces when the component tries to read it.
 *
 * This schema parses each row defensively and produces an object that is
 * structurally compatible with {@link import('../../hooks/useLeadsTypes').Lead}.
 * Fields that the `normalizeLead` helper used to default are defaulted
 * here via `.catch()`, so a single bad row can't break the list — it
 * just gets dropped and logged by the caller (`.safeParse()` path).
 *
 * The inferred type is cross-checked against `Lead` at the bottom of
 * this file with a compile-time assignability assertion.
 */

import { z } from 'zod';
import type { Lead } from '../../hooks/useLeadsTypes';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Field that should be a string, but Supabase might return null or omit it. */
const nullableString = z.string().nullable().catch(null).default(null);

/** Field that should be a number, but might be null or missing. */
const nullableNumber = z.number().nullable().catch(null).default(null);

/** Number with a default — for fields like `lead_score` that are always present at runtime. */
const numberWithDefault = (d: number) =>
  z.number().catch(d).default(d);

/** ISO timestamp — stored as string in Postgres/Supabase. */
const timestampString = z.string();

const temperatureSchema = z
  .enum(['cold', 'warm', 'hot'])
  .catch('warm')
  .default('warm');

const prioridadeSchema = z
  .enum(['baixa', 'media', 'alta', 'urgente'])
  .catch('media')
  .default('media');

const metadataSchema = z
  .record(z.string(), z.unknown())
  .nullable()
  .catch(null)
  .default(null);

// ─── Main schema ────────────────────────────────────────────────────────────

export const LeadRowSchema = z
  .object({
    // Required identity fields — if these are missing, the row is unusable.
    id: z.string(),
    created_at: timestampString,

    // Nullable string fields (may be absent in projected selects → default null)
    nome: nullableString,
    nome_completo: nullableString,
    email: nullableString,
    telefone: nullableString,
    mensagem_inicial: nullableString,
    area_juridica: nullableString,
    status: nullableString,
    origem: nullableString,
    responsavel_id: nullableString,
    observacoes: nullableString,
    descricao: nullableString,
    tenant_id: nullableString,
    updated_at: nullableString,

    // Nullable number fields
    valor_causa: nullableNumber,

    // Metadata / JSON
    metadata: metadataSchema,

    // CRM Professional fields — all have runtime defaults via .catch()
    lead_score: numberWithDefault(0),
    pipeline_stage_id: nullableString,
    temperature: temperatureSchema,
    expected_value: nullableNumber,
    probability: numberWithDefault(50),
    lost_reason: nullableString,
    won_at: nullableString,
    lost_at: nullableString,
    last_activity_at: nullableString,
    next_followup_at: nullableString,
    followup_count: numberWithDefault(0),
    company_name: nullableString,
    cpf_cnpj: nullableString,

    // CRM Operacional fields
    departamento_id: nullableString,
    conexao_id: nullableString,
    prioridade: prioridadeSchema,
    assigned_at: nullableString,
    inactive_since: nullableString,
    ultima_interacao: nullableString,
    proxima_acao: nullableString,
    proxima_acao_data: nullableString,
    arquivado_em: nullableString,
    motivo_arquivamento: nullableString,
    data_reativacao_prevista: nullableString,
  })
  // Normalize: nome_completo falls back to nome, observacoes to descricao
  // (mirrors the legacy `normalizeLead` helper in useLeadsQuery.ts).
  .transform((row) => ({
    ...row,
    nome_completo: row.nome_completo ?? row.nome ?? null,
    observacoes: row.observacoes ?? row.descricao ?? null,
  }));

/** Inferred type from the schema. Structurally compatible with `Lead`. */
export type LeadRow = z.infer<typeof LeadRowSchema>;

// ─── Compile-time cross-check ───────────────────────────────────────────────
// If the schema drifts away from the Lead type in useLeadsTypes.ts, the
// assignability assertion below will break the build. We only assert
// LeadRow → Lead (one direction) because Lead has a few optional fields
// (marked with `?`) which make the reverse check artificially fail.
// The direction that matters is: does every parsed row satisfy Lead?
export type AssertLeadRowSatisfiesLead =
  LeadRow extends Lead ? true : 'LeadRowSchema drifted from Lead type';
const _leadAssignabilityCheck: AssertLeadRowSatisfiesLead = true;
void _leadAssignabilityCheck;

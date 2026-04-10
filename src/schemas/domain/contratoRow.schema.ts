/**
 * @module schemas/domain/contratoRow
 * @description Zod schema for a raw Supabase `contratos` row, parsed at
 * the hook boundary. See {@link ./README.md} for the pattern rationale.
 *
 * Mirrors the `ContratoRow` type declared inline in `useContratos.ts`.
 * When the hook is migrated to use this schema, the local `ContratoRow`
 * alias can be replaced by `z.infer<typeof ContratoRowSchema>`.
 */

import { z } from 'zod';

const nullableString = z.string().nullable().catch(null).default(null);
const nullableNumber = z.number().nullable().catch(null).default(null);

export const ContratoRowSchema = z.object({
  // Required identity fields
  id: z.string(),
  tenant_id: z.string(),

  // Relations
  lead_id: nullableString,
  responsavel_id: nullableString,

  // Cliente / contract metadata
  nome_cliente: nullableString,
  area_juridica: nullableString,
  valor_causa: nullableNumber,
  texto_contrato: nullableString,
  clausulas_customizadas: nullableString,

  // Status
  status: nullableString,
  status_assinatura: nullableString,

  // ZapSign integration
  link_assinatura_zapsign: nullableString,
  zapsign_document_id: nullableString,
  data_geracao_link: nullableString,
  data_envio_whatsapp: nullableString,

  // Timeline
  data_envio: nullableString,
  data_assinatura: nullableString,
  observacoes: nullableString,
  created_at: nullableString,
  updated_at: nullableString,
});

export type ContratoRow = z.infer<typeof ContratoRowSchema>;

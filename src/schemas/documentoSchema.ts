import { z } from 'zod';

export const TIPOS_DOCUMENTO = [
  'peticao', 'contrato', 'procuracao', 'comprovante', 'sentenca',
  'recurso', 'acordo', 'laudo', 'certidao', 'outro',
] as const;

export const documentoFormSchema = z.object({
  processo_id:    z.string().uuid().optional().nullable(),
  lead_id:        z.string().uuid().optional().nullable(),
  tipo_documento: z.enum(TIPOS_DOCUMENTO),
  descricao:      z.string().max(500).optional().nullable(),
  tags:           z.array(z.string()).optional().nullable(),
});

export type DocumentoFormData = z.infer<typeof documentoFormSchema>;

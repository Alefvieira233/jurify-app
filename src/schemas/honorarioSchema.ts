import { z } from 'zod';

export const TIPOS_HONORARIO = ['fixo', 'hora', 'contingencia', 'misto', 'retainer'] as const;

export const STATUS_HONORARIO = [
  'vigente', 'pago', 'inadimplente', 'cancelado', 'disputado',
] as const;

export const honorarioFormSchema = z.object({
  processo_id:          z.string().uuid().optional().nullable(),
  lead_id:              z.string().uuid().optional().nullable(),
  tipo:                 z.enum(TIPOS_HONORARIO).default('fixo'),
  valor_fixo:           z.number().positive().optional().nullable(),
  valor_hora:           z.number().positive().optional().nullable(),
  taxa_contingencia:    z.number().min(0).max(100).optional().nullable(),
  horas_estimadas:      z.number().positive().optional().nullable(),
  valor_total_acordado: z.number().positive().optional().nullable(),
  valor_adiantamento:   z.number().min(0).optional().nullable(),
  valor_recebido:       z.number().min(0).optional().nullable(),
  data_vencimento:      z.string().optional().nullable(),
  status:               z.enum(STATUS_HONORARIO).default('vigente'),
  observacoes:          z.string().max(2000).optional().nullable(),
});

export type HonorarioFormData = z.infer<typeof honorarioFormSchema>;

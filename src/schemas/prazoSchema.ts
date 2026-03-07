import { z } from 'zod';

export const TIPOS_PRAZO = [
  'audiencia', 'peticao', 'recurso', 'manifestacao', 'prazo_fatal',
  'despacho', 'sentenca', 'outro',
] as const;

export const STATUS_PRAZO = ['pendente', 'cumprido', 'perdido', 'cancelado'] as const;

export const prazoFormSchema = z.object({
  processo_id:   z.string().uuid({ message: 'Processo é obrigatório' }),
  lead_id:       z.string().uuid().optional().nullable(),
  tipo:          z.enum(TIPOS_PRAZO),
  descricao:     z.string().min(3).max(500),
  data_prazo:        z.string().min(1, 'Data do prazo é obrigatória'),
  data_cumprimento:  z.string().optional().nullable(),
  alertas_dias:      z.array(z.number().int().positive()).default([7, 3, 1]),
  responsavel_id: z.string().uuid().optional().nullable(),
  status:        z.enum(STATUS_PRAZO).default('pendente'),
  observacoes:   z.string().max(1000).optional().nullable(),
});

export type PrazoFormData = z.infer<typeof prazoFormSchema>;

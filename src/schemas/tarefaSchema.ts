import { z } from 'zod';

export const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13] as const;

export const tarefaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(200),
  descricao: z.string().max(2000).optional(),
  prazo: z.string().optional(),
  pontos: z.coerce.number().refine(v => (FIBONACCI_POINTS as readonly number[]).includes(v), 'Pontos devem ser Fibonacci').optional(),
  responsavel_id: z.string().uuid().optional().or(z.literal('')),
  lead_id: z.string().uuid().optional().or(z.literal('')),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
});

export type TarefaFormData = z.infer<typeof tarefaSchema>;

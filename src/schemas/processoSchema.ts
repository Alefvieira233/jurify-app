import { z } from 'zod';

export const TIPOS_ACAO = [
  'civel', 'criminal', 'trabalhista', 'previdenciario',
  'familia', 'empresarial', 'tributario', 'administrativo', 'outro',
] as const;

export const FASES_PROCESSUAIS = [
  'conhecimento', 'recurso', 'execucao', 'cumprimento_sentenca', 'encerrado',
] as const;

export const POSICOES = ['autor', 'reu', 'terceiro', 'assistente'] as const;

export const STATUS_PROCESSO = [
  'ativo', 'suspenso', 'encerrado_vitoria', 'encerrado_derrota',
  'encerrado_acordo', 'arquivado',
] as const;

export const TIPOS_HONORARIO_PROCESSO = ['fixo', 'hora', 'contingencia', 'misto'] as const;

export const processoFormSchema = z.object({
  lead_id:                  z.string().uuid().optional().nullable(),
  numero_processo:          z.string().max(50).optional().nullable(),
  tribunal:                 z.string().max(200).optional().nullable(),
  vara:                     z.string().max(200).optional().nullable(),
  comarca:                  z.string().max(200).optional().nullable(),
  tipo_acao:                z.enum(TIPOS_ACAO),
  area_juridica:            z.string().max(100).optional().nullable(),
  fase_processual:          z.enum(FASES_PROCESSUAIS).default('conhecimento'),
  posicao:                  z.enum(POSICOES).default('autor'),
  responsavel_id:           z.string().uuid().optional().nullable(),
  valor_causa:              z.number().positive().optional().nullable(),
  valor_honorario_acordado: z.number().positive().optional().nullable(),
  tipo_honorario:           z.enum(TIPOS_HONORARIO_PROCESSO).default('fixo'),
  data_distribuicao:        z.string().optional().nullable(),
  status:                   z.enum(STATUS_PROCESSO).default('ativo'),
  observacoes:              z.string().max(2000).optional().nullable(),
  partes_contrarias:        z.array(z.string()).optional().nullable(),
});

export type ProcessoFormData = z.infer<typeof processoFormSchema>;

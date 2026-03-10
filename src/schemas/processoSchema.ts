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
  numero_processo:          z
    .string()
    .max(50)
    .regex(
      /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/,
      'Use o formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO',
    )
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
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

export const TIPO_ACAO_LABELS: Record<string, string> = {
  civel: 'Cível',
  criminal: 'Criminal',
  trabalhista: 'Trabalhista',
  previdenciario: 'Previdenciário',
  familia: 'Família',
  empresarial: 'Empresarial',
  tributario: 'Tributário',
  administrativo: 'Administrativo',
  outro: 'Outro',
};

export const FASE_LABELS: Record<string, string> = {
  conhecimento: 'Conhecimento',
  recurso: 'Recurso',
  execucao: 'Execução',
  cumprimento_sentenca: 'Cumprimento de Sentença',
  encerrado: 'Encerrado',
};

export const POSICAO_LABELS: Record<string, string> = {
  autor: 'Autor',
  reu: 'Réu',
  terceiro: 'Terceiro',
  assistente: 'Assistente',
};

export const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  encerrado_vitoria: 'Encerrado — Vitória',
  encerrado_derrota: 'Encerrado — Derrota',
  encerrado_acordo: 'Encerrado — Acordo',
  arquivado: 'Arquivado',
};

import { z } from 'zod';

// Schema de validação para criação de Lead
export const leadFormSchema = z.object({
  nome_completo: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(200, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),

  telefone: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z.union([
        z.literal(''),
        z.string()
          .transform((val) => val.replace(/\D/g, ''))
          .refine(
            (val) => val.length === 0 || (val.length >= 10 && val.length <= 15),
            { message: 'Telefone deve ter entre 10 e 15 dígitos' }
          )
      ])
    )
    .optional(),

  email: z
    .union([
      z.literal(''),
      z.string().email('Email inválido').max(200, 'Email muito longo')
    ])
    .optional(),

  area_juridica: z
    .string()
    .min(1, 'Selecione uma área jurídica'),

  origem: z
    .string()
    .min(1, 'Selecione a origem do lead'),

  valor_causa: z
    .number()
    .min(0, 'Valor não pode ser negativo')
    .max(999999999, 'Valor muito alto')
    .optional()
    .nullable(),

  expected_value: z
    .number()
    .min(0, 'Valor não pode ser negativo')
    .max(999999999, 'Valor muito alto')
    .optional()
    .nullable(),

  responsavel: z
    .string()
    .min(1, 'Informe o responsável'),

  observacoes: z
    .string()
    .max(2000, 'Observações muito longas')
    .optional()
    .or(z.literal('')),

  status: z
    .string()
    .default('novo_lead'),

  temperature: z
    .enum(['cold', 'warm', 'hot'])
    .default('warm'),

  probability: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .optional(),

  company_name: z
    .string()
    .max(200, 'Nome da empresa muito longo')
    .optional()
    .or(z.literal('')),

  cpf_cnpj: z
    .string()
    .max(18, 'CPF/CNPJ inválido')
    .optional()
    .or(z.literal('')),

  pipeline_stage_id: z
    .string()
    .uuid()
    .optional()
    .nullable(),

  lost_reason: z
    .string()
    .max(500)
    .optional()
    .or(z.literal('')),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

// Schema para follow-up
export const followUpFormSchema = z.object({
  lead_id: z.string().uuid('Selecione um lead'),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  followup_type: z.enum(['call', 'email', 'whatsapp', 'meeting', 'task', 'auto']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  scheduled_at: z.string().min(1, 'Selecione a data'),
  assigned_to: z.string().uuid().optional().nullable(),
  reminder_minutes: z.number().min(0).max(10080).default(30),
  recurrence_rule: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional().nullable(),
  auto_message_template: z.string().max(2000).optional().or(z.literal('')),
});

export type FollowUpFormData = z.infer<typeof followUpFormSchema>;

// Opções de áreas jurídicas
export const AREAS_JURIDICAS = [
  'Direito Trabalhista',
  'Direito de Família',
  'Direito Civil',
  'Direito Previdenciário',
  'Direito Criminal',
  'Direito do Consumidor',
  'Direito Empresarial',
  'Direito Tributário',
  'Direito Imobiliário',
  'Outro',
] as const;

// Opções de origem do lead
export const ORIGENS_LEAD = [
  'WhatsApp',
  'Site',
  'Indicação',
  'Telefone',
  'Email',
  'Redes Sociais',
  'Google Ads',
  'Facebook Ads',
  'Instagram',
  'Evento',
  'Outro',
] as const;

// Status possíveis de lead
export const STATUS_LEAD = [
  'novo_lead',
  'em_qualificacao',
  'analise_juridica',
  'proposta_enviada',
  'negociacao',
  'contrato_assinado',
  'em_atendimento',
  'lead_perdido',
] as const;

export const STATUS_LABELS: Record<typeof STATUS_LEAD[number], string> = {
  novo_lead: 'Novo Lead',
  em_qualificacao: 'Em Qualificação',
  analise_juridica: 'Análise Jurídica',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  contrato_assinado: 'Contrato Assinado',
  em_atendimento: 'Em Atendimento',
  lead_perdido: 'Lead Perdido',
};

// Temperaturas do lead
export const LEAD_TEMPERATURES = [
  { value: 'cold', label: 'Frio', color: '#3B82F6' },
  { value: 'warm', label: 'Morno', color: '#F59E0B' },
  { value: 'hot', label: 'Quente', color: '#EF4444' },
] as const;

// Tipos de follow-up
export const FOLLOWUP_TYPES = [
  { value: 'call', label: 'Ligação' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'task', label: 'Tarefa' },
  { value: 'auto', label: 'Automático' },
] as const;

// Prioridades de follow-up
export const FOLLOWUP_PRIORITIES = [
  { value: 'low', label: 'Baixa', color: '#6B7280' },
  { value: 'medium', label: 'Média', color: '#F59E0B' },
  { value: 'high', label: 'Alta', color: '#F97316' },
  { value: 'urgent', label: 'Urgente', color: '#EF4444' },
] as const;

// Recorrências
export const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
] as const;

// Motivos de perda
export const LOST_REASONS = [
  'Preço alto',
  'Sem urgência',
  'Contratou concorrente',
  'Desistiu do caso',
  'Sem retorno',
  'Caso inviável',
  'Fora da área de atuação',
  'Outro',
] as const;

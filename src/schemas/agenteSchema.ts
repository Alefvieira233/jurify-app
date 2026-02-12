import { z } from 'zod';

// 🚀 SCHEMA ZOD PARA VALIDAÇÃO RIGOROSA DE AGENTES IA
export const parametrosAvancadosSchema = z.object({
  temperatura: z.number()
    .min(0, 'Temperatura deve ser no mínimo 0')
    .max(1, 'Temperatura deve ser no máximo 1')
    .default(0.7),
  top_p: z.number()
    .min(0, 'Top P deve ser no mínimo 0')
    .max(1, 'Top P deve ser no máximo 1')
    .default(0.9),
  frequency_penalty: z.number()
    .min(0, 'Frequency Penalty deve ser no mínimo 0')
    .max(2, 'Frequency Penalty deve ser no máximo 2')
    .default(0),
  presence_penalty: z.number()
    .min(0, 'Presence Penalty deve ser no mínimo 0')
    .max(2, 'Presence Penalty deve ser no máximo 2')
    .default(0),
});

export const agenteIASchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s\-.]+$/, 'Nome deve conter apenas letras, espaços, hífens e pontos')
    .transform(str => str.trim()),
    
  area_juridica: z.string()
    .min(1, 'Área jurídica é obrigatória')
    .refine((val) => [
      'Direito Trabalhista',
      'Direito de Família',
      'Direito Civil',
      'Direito Previdenciário',
      'Direito Criminal',
      'Direito Empresarial'
    ].includes(val), 'Área jurídica deve ser uma das opções válidas'),
    
  objetivo: z.string()
    .max(500, 'Objetivo deve ter no máximo 500 caracteres')
    .optional()
    .transform(str => str?.trim() || ''),
    
  script_saudacao: z.string()
    .max(1000, 'Script de saudação deve ter no máximo 1000 caracteres')
    .optional()
    .transform(str => str?.trim() || ''),
    
  perguntas_qualificacao: z.array(
    z.string()
      .min(5, 'Pergunta deve ter pelo menos 5 caracteres')
      .max(200, 'Pergunta deve ter no máximo 200 caracteres')
      .transform(str => str.trim())
  ).max(10, 'Máximo de 10 perguntas de qualificação'),
  
  keywords_acao: z.array(
    z.string()
      .min(2, 'Keyword deve ter pelo menos 2 caracteres')
      .max(50, 'Keyword deve ter no máximo 50 caracteres')
      .transform(str => str.trim().toLowerCase())
  ).max(20, 'Máximo de 20 keywords de ação'),
  
  delay_resposta: z.number()
    .int('Delay deve ser um número inteiro')
    .min(1, 'Delay deve ser no mínimo 1 segundo')
    .max(30, 'Delay deve ser no máximo 30 segundos')
    .default(3),
    
  status: z.enum(['ativo', 'inativo'], {
    errorMap: () => ({ message: 'Status deve ser "ativo" ou "inativo"' })
  }).default('ativo'),
  
  descricao_funcao: z.string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .transform(str => str.trim()),
    
  prompt_base: z.string()
    .min(50, 'Prompt base deve ter pelo menos 50 caracteres')
    .max(5000, 'Prompt base deve ter no máximo 5000 caracteres')
    .transform(str => str.trim()),
    
  tipo_agente: z.enum(['chat_interno', 'analise_dados', 'api_externa'], {
    errorMap: () => ({ message: 'Tipo de agente deve ser uma das opções válidas' })
  }).default('chat_interno'),
  
  parametros_avancados: parametrosAvancadosSchema.default({
    temperatura: 0.7,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0
  })
});

// Tipo TypeScript derivado do schema
export type AgenteIAFormData = z.infer<typeof agenteIASchema>;
export type ParametrosAvancados = z.infer<typeof parametrosAvancadosSchema>;

// Schema para validação parcial (edição)
export const agenteIAUpdateSchema = agenteIASchema.partial();

// Função para validar e sanitizar dados
export const validateAgenteIA = (data: unknown) => {
  try {
    return {
      success: true,
      data: agenteIASchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      data: null,
      errors: [{ field: 'unknown', message: 'Erro de validação desconhecido' }]
    };
  }
};

// Função para validação de update
export const validateAgenteIAUpdate = (data: unknown) => {
  try {
    return {
      success: true,
      data: agenteIAUpdateSchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      data: null,
      errors: [{ field: 'unknown', message: 'Erro de validação desconhecido' }]
    };
  }
};
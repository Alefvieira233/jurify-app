
// Constantes da aplicação para produção
export const APP_CONFIG = {
  name: 'Jurify',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  // Cache settings
  cache: {
    defaultTTL: 300000, // 5 minutos
    longTTL: 3600000,   // 1 hora
    shortTTL: 60000,    // 1 minuto
  },
  
  // API settings
  api: {
    timeout: 10000,     // 10 segundos
    retryAttempts: 3,
    retryDelay: 1000,   // 1 segundo
  },
  
  // UI settings
  ui: {
    debounceDelay: 300,
    animationDuration: 200,
    toastDuration: 5000,
  },
  
  // Pagination
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  
  // Validation
  validation: {
    minPasswordLength: 8,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'],
  },
} as const;

export const STATUS_COLORS = {
  novo_lead: 'bg-blue-100 text-blue-800',
  em_qualificacao: 'bg-yellow-100 text-yellow-800',
  proposta_enviada: 'bg-orange-100 text-orange-800',
  contrato_assinado: 'bg-green-100 text-green-800',
  em_atendimento: 'bg-purple-100 text-purple-800',
  lead_perdido: 'bg-red-100 text-red-800',
} as const;

export const AREAS_JURIDICAS = [
  'Civil',
  'Penal',
  'Trabalhista',
  'Tributário',
  'Empresarial',
  'Família',
  'Previdenciário',
  'Consumidor',
  'Imobiliário',
  'Administrativo',
] as const;

export const ORIGINS_LEAD = [
  'Site',
  'WhatsApp',
  'Indicação',
  'Google Ads',
  'Facebook',
  'Instagram',
  'LinkedIn',
  'Email Marketing',
  'Evento',
  'Outros',
] as const;

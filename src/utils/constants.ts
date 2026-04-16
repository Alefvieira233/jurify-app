export const STATUS_COLORS: Record<string, string> = {
  // Current CRM Operacional status values
  novo: 'bg-blue-100 text-blue-800',
  em_contato: 'bg-cyan-100 text-cyan-800',
  qualificado: 'bg-yellow-100 text-yellow-800',
  proposta: 'bg-indigo-100 text-indigo-800',
  negociacao: 'bg-purple-100 text-purple-800',
  ganho: 'bg-green-100 text-green-800',
  perdido: 'bg-red-100 text-red-800',
};

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


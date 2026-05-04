export interface ConversationFilterState {
  tab: 'todos' | 'urgentes' | 'ia' | 'ativos' | 'pendentes';
  status: '' | 'ativo' | 'aguardando' | 'qualificado' | 'finalizado';
  responsavelId: string;  // '' = all, '__none__' = unassigned, uuid = specific
  areaJuridica: string;   // '' = all, or area string
}

export const EMPTY_CONV_FILTERS: ConversationFilterState = {
  tab: 'todos',
  status: '',
  responsavelId: '',
  areaJuridica: '',
};

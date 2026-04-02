// ── Automation Rule Editor Types & Constants ──

import { STATUS_LEAD, LEAD_STATUS_LABELS } from '@/schemas/leadSchema';
import { PRIORIDADES } from '@/types/crm-operacional';

export interface ConditionDraft {
  _key: string;
  campo: string;
  operador: string;
  valor: string;
}

export interface ActionDraft {
  _key: string;
  tipo: string;
  config: Record<string, unknown>;
}

export const FIELD_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'temperatura', label: 'Temperatura' },
  { value: 'area_juridica', label: 'Área Jurídica' },
  { value: 'departamento_id', label: 'Departamento' },
  { value: 'valor_causa', label: 'Valor da Causa' },
  { value: 'origem', label: 'Origem' },
  { value: 'responsavel_id', label: 'Responsável' },
] as const;

export const OPERATOR_OPTIONS = [
  { value: 'igual', label: 'Igual a' },
  { value: 'diferente', label: 'Diferente de' },
  { value: 'contem', label: 'Contém' },
  { value: 'nao_contem', label: 'Não contém' },
  { value: 'maior_que', label: 'Maior que' },
  { value: 'menor_que', label: 'Menor que' },
  { value: 'vazio', label: 'Vazio' },
  { value: 'nao_vazio', label: 'Não vazio' },
  { value: 'mudou_para', label: 'Mudou para' },
  { value: 'mudou_de', label: 'Mudou de' },
] as const;

export const ACTION_TYPE_OPTIONS = [
  { value: 'enviar_whatsapp', label: 'Enviar WhatsApp' },
  { value: 'enviar_email', label: 'Enviar E-mail' },
  { value: 'alterar_status', label: 'Alterar Status' },
  { value: 'alterar_prioridade', label: 'Alterar Prioridade' },
  { value: 'atribuir_responsavel', label: 'Atribuir Responsável' },
  { value: 'chamar_webhook', label: 'Chamar Webhook' },
  { value: 'executar_agente', label: 'Executar Agente IA' },
  { value: 'notificar_equipe', label: 'Notificar Equipe' },
  { value: 'adicionar_tag', label: 'Adicionar Tag' },
  { value: 'remover_tag', label: 'Remover Tag' },
  { value: 'mover_departamento', label: 'Mover Departamento' },
  { value: 'criar_agendamento', label: 'Criar Agendamento' },
] as const;

export const TEMPERATURA_OPTIONS = [
  { value: 'cold', label: 'Frio' },
  { value: 'warm', label: 'Morno' },
  { value: 'hot', label: 'Quente' },
];

export const NO_VALUE_OPERATORS = ['vazio', 'nao_vazio'];

let keyCounter = 0;
export const nextKey = () => `draft-${++keyCounter}`;

// ── Helpers ──

export function isEnumField(campo: string): boolean {
  return ['status', 'prioridade', 'temperatura'].includes(campo);
}

export function getEnumOptions(campo: string): { value: string; label: string }[] {
  switch (campo) {
    case 'status':
      return STATUS_LEAD.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }));
    case 'prioridade':
      return PRIORIDADES.map((p) => ({ value: p.value, label: p.label }));
    case 'temperatura':
      return TEMPERATURA_OPTIONS;
    default:
      return [];
  }
}

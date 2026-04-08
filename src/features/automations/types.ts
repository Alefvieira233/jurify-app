// ── Automation Rule Types & Constants ──

import { STATUS_LEAD, LEAD_STATUS_LABELS } from '@/schemas/leadSchema';
import { PRIORIDADES } from '@/types/crm-operacional';

// ── Shared Rule Types ──

export interface RuleCondition {
  id: string;
  rule_id: string;
  campo: string;
  operador: string;
  valor: string | null;
  ordem: number;
}

export interface RuleAction {
  id: string;
  rule_id: string;
  tipo: string;
  config: Record<string, unknown>;
  ordem: number;
}

export interface AutomationRule {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  status: 'ativo' | 'inativo' | 'rascunho';
  evento: string;
  match_logic: 'todos' | 'qualquer';
  prioridade: number;
  execucoes_total: number;
  ultima_execucao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
}

// ── Event Constants ──

export const EVENT_TYPE_LABELS: Record<string, string> = {
  lead_criado: 'Lead Criado',
  lead_atualizado: 'Lead Atualizado',
  status_alterado: 'Status Alterado',
  departamento_alterado: 'Departamento Alterado',
  prioridade_alterada: 'Prioridade Alterada',
  tag_adicionada: 'Tag Adicionada',
  tag_removida: 'Tag Removida',
  lead_arquivado: 'Lead Arquivado',
  lead_reativado: 'Lead Reativado',
  agendamento_criado: 'Agendamento Criado',
  ganho: 'Contrato Assinado',
  temperatura_alterada: 'Temperatura Alterada',
  inatividade: 'Inatividade do Lead',
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  lead_criado: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  lead_atualizado: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  status_alterado: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  departamento_alterado: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  prioridade_alterada: 'bg-red-500/15 text-red-400 border-red-500/20',
  tag_adicionada: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  tag_removida: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20',
  lead_arquivado: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  lead_reativado: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  agendamento_criado: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  ganho: 'bg-green-500/15 text-green-400 border-green-500/20',
  temperatura_alterada: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  inatividade: 'bg-muted/50 text-muted-foreground border-border',
};

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

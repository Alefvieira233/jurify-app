// Automation Flow types
export interface AutomationFlow {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  status: 'rascunho' | 'ativo' | 'pausado' | 'arquivado';
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  viewport: { x: number; y: number; zoom: number };
  execucoes_total: number;
  ultima_execucao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TriggerType =
  | 'novo_lead' | 'status_alterado' | 'departamento_alterado'
  | 'lead_quente' | 'agendamento_criado' | 'contrato_assinado'
  | 'webhook' | 'manual' | 'timer';

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  novo_lead: 'Novo Lead',
  status_alterado: 'Status Alterado',
  departamento_alterado: 'Departamento Alterado',
  lead_quente: 'Lead Quente',
  agendamento_criado: 'Agendamento Criado',
  contrato_assinado: 'Contrato Assinado',
  webhook: 'Webhook Externo',
  manual: 'Execução Manual',
  timer: 'Temporizador',
};

export const TRIGGER_COLORS: Record<TriggerType, string> = {
  novo_lead: '#10b981',
  status_alterado: '#f59e0b',
  departamento_alterado: '#8b5cf6',
  lead_quente: '#ef4444',
  agendamento_criado: '#06b6d4',
  contrato_assinado: '#059669',
  webhook: '#6366f1',
  manual: '#6b7280',
  timer: '#ec4899',
};

// Flow Node types
export interface FlowNodeData {
  tipo: 'trigger' | 'condition' | 'action' | 'delay';
  label: string;
  config: Record<string, unknown>;
}

// Automation Rule types
export interface AutomationRule {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  status: 'ativo' | 'inativo' | 'rascunho';
  evento: RuleEvent;
  match_logic: 'todos' | 'qualquer';
  prioridade: number;
  execucoes_total: number;
  ultima_execucao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  conditions?: RuleCondition[];
  actions?: RuleAction[];
}

export type RuleEvent =
  | 'lead_criado' | 'lead_atualizado' | 'status_alterado'
  | 'departamento_alterado' | 'prioridade_alterada'
  | 'tag_adicionada' | 'tag_removida'
  | 'lead_arquivado' | 'lead_reativado'
  | 'agendamento_criado' | 'contrato_assinado'
  | 'temperatura_alterada' | 'inatividade';

export const RULE_EVENT_LABELS: Record<RuleEvent, string> = {
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
  contrato_assinado: 'Contrato Assinado',
  temperatura_alterada: 'Temperatura Alterada',
  inatividade: 'Inatividade do Lead',
};

export const RULE_EVENT_COLORS: Record<RuleEvent, string> = {
  lead_criado: '#10b981',
  lead_atualizado: '#3b82f6',
  status_alterado: '#f59e0b',
  departamento_alterado: '#8b5cf6',
  prioridade_alterada: '#ef4444',
  tag_adicionada: '#14b8a6',
  tag_removida: '#6b7280',
  lead_arquivado: '#e11d48',
  lead_reativado: '#059669',
  agendamento_criado: '#06b6d4',
  contrato_assinado: '#059669',
  temperatura_alterada: '#f97316',
  inatividade: '#64748b',
};

export interface RuleCondition {
  id: string;
  rule_id: string;
  campo: string;
  operador: ConditionOperator;
  valor: string | null;
  ordem: number;
}

export type ConditionOperator =
  | 'igual' | 'diferente' | 'contem' | 'nao_contem'
  | 'maior_que' | 'menor_que' | 'vazio' | 'nao_vazio'
  | 'mudou_para' | 'mudou_de';

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  igual: 'É igual a',
  diferente: 'É diferente de',
  contem: 'Contém',
  nao_contem: 'Não contém',
  maior_que: 'Maior que',
  menor_que: 'Menor que',
  vazio: 'Está vazio',
  nao_vazio: 'Não está vazio',
  mudou_para: 'Mudou para',
  mudou_de: 'Mudou de',
};

export interface RuleAction {
  id: string;
  rule_id: string;
  tipo: ActionType;
  config: Record<string, unknown>;
  ordem: number;
}

export type ActionType =
  | 'enviar_whatsapp' | 'enviar_email' | 'atribuir_responsavel'
  | 'alterar_status' | 'alterar_prioridade' | 'adicionar_tag'
  | 'remover_tag' | 'mover_departamento' | 'criar_agendamento'
  | 'executar_agente' | 'chamar_webhook' | 'notificar_equipe';

export const ACTION_LABELS: Record<ActionType, string> = {
  enviar_whatsapp: 'Enviar WhatsApp',
  enviar_email: 'Enviar E-mail',
  atribuir_responsavel: 'Atribuir Responsável',
  alterar_status: 'Alterar Status',
  alterar_prioridade: 'Alterar Prioridade',
  adicionar_tag: 'Adicionar Tag',
  remover_tag: 'Remover Tag',
  mover_departamento: 'Mover para Departamento',
  criar_agendamento: 'Criar Agendamento',
  executar_agente: 'Executar Agente IA',
  chamar_webhook: 'Chamar Webhook (N8N)',
  notificar_equipe: 'Notificar Equipe',
};

export const ACTION_COLORS: Record<ActionType, string> = {
  enviar_whatsapp: '#25D366',
  enviar_email: '#3b82f6',
  atribuir_responsavel: '#8b5cf6',
  alterar_status: '#f59e0b',
  alterar_prioridade: '#ef4444',
  adicionar_tag: '#14b8a6',
  remover_tag: '#6b7280',
  mover_departamento: '#a855f7',
  criar_agendamento: '#06b6d4',
  executar_agente: '#ec4899',
  chamar_webhook: '#6366f1',
  notificar_equipe: '#f97316',
};

// Automation Execution
export interface AutomationExecution {
  id: string;
  tenant_id: string;
  tipo: 'flow' | 'rule';
  referencia_id: string;
  lead_id: string | null;
  status: 'executando' | 'sucesso' | 'erro' | 'cancelado';
  resultado: Record<string, unknown>;
  erro: string | null;
  duracao_ms: number | null;
  created_at: string;
}

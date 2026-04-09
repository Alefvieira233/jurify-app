// ============================================
// CRM Operacional — Centralized Types
// ============================================

// ── Tags ──

export interface Tag {
  id: string;
  tenant_id: string;
  nome: string;
  cor: string;
  categoria: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

export interface LeadTag {
  id: string;
  lead_id: string;
  tag_id: string;
  created_at: string;
  created_by: string | null;
  tag?: Tag;
}

export const TAG_CATEGORIAS = [
  'prioridade',
  'temperatura',
  'operacional',
  'qualificacao',
  'acompanhamento',
  'relacionamento',
] as const;

export type TagCategoria = (typeof TAG_CATEGORIAS)[number];

// ── Departamentos ──

export interface Departamento {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ordem: number;
  ativo: boolean;
  responsavel_padrao_id: string | null;
  agente_ia_padrao_id: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  membros_count?: number;
  leads_count?: number;
  responsavel_padrao?: { id: string; nome_completo: string } | null;
}

export interface DepartamentoMembro {
  id: string;
  departamento_id: string;
  profile_id: string;
  role_no_depto: string;
  pode_ver_todos_leads: boolean;
  pode_atribuir_responsavel: boolean;
  pode_mover_leads: boolean;
  pode_editar_propriedades: boolean;
  pode_arquivar: boolean;
  pode_ver_metricas: boolean;
  pode_gerenciar: boolean;
  receber_notificacoes: boolean;
  created_at: string;
  // Joined
  profile?: { id: string; nome_completo: string; email: string; avatar_url: string | null; email_verified?: boolean };
}

// ── Lead Notas ──

export interface LeadNota {
  id: string;
  lead_id: string;
  tenant_id: string;
  autor_id: string;
  autor_nome: string;
  conteudo: string;
  fixada: boolean;
  created_at: string;
  updated_at: string;
}

// ── Lead Histórico ──

export type TipoEventoHistorico =
  | 'departamento_alterado'
  | 'responsavel_alterado'
  | 'status_alterado'
  | 'prioridade_alterada'
  | 'tag_adicionada'
  | 'tag_removida'
  | 'arquivado'
  | 'reativado'
  | 'propriedade_alterada'
  | 'nota_adicionada';

export interface LeadHistorico {
  id: string;
  lead_id: string;
  tenant_id: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  tipo_evento: TipoEventoHistorico;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  descricao: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const EVENTO_HISTORICO_CONFIG: Record<TipoEventoHistorico, { label: string; icon: string; color: string }> = {
  departamento_alterado: { label: 'Departamento alterado', icon: 'Building2', color: '#8b5cf6' },
  responsavel_alterado:  { label: 'Responsável alterado',  icon: 'UserCheck', color: '#3b82f6' },
  status_alterado:       { label: 'Status alterado',       icon: 'RefreshCw', color: '#f59e0b' },
  prioridade_alterada:   { label: 'Prioridade alterada',   icon: 'AlertTriangle', color: '#ef4444' },
  tag_adicionada:        { label: 'Tag adicionada',        icon: 'Tag',       color: '#10b981' },
  tag_removida:          { label: 'Tag removida',          icon: 'TagOff',    color: '#6b7280' },
  arquivado:             { label: 'Lead arquivado',        icon: 'Archive',   color: '#e11d48' },
  reativado:             { label: 'Lead reativado',        icon: 'RotateCcw', color: '#059669' },
  propriedade_alterada:  { label: 'Propriedade alterada',  icon: 'Edit3',     color: '#6366f1' },
  nota_adicionada:       { label: 'Nota adicionada',       icon: 'StickyNote', color: '#14b8a6' },
};

// ── Prioridades ──

export const PRIORIDADES = [
  { value: 'baixa',   label: 'Baixa',   cor: '#6b7280', icon: 'ArrowDown' },
  { value: 'media',   label: 'Média',   cor: '#3b82f6', icon: 'Minus' },
  { value: 'alta',    label: 'Alta',    cor: '#f59e0b', icon: 'ArrowUp' },
  { value: 'urgente', label: 'Urgente', cor: '#ef4444', icon: 'AlertTriangle' },
] as const;

export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente';

// ── Arquivamento ──

export const MOTIVOS_ARQUIVAMENTO = [
  { value: 'chat_resolvido',        label: 'Chat resolvido com sucesso' },
  { value: 'cliente_nao_responde',  label: 'Cliente não responde mais' },
  { value: 'aberto_por_engano',     label: 'Aberto por engano' },
  { value: 'duplicado',             label: 'Duplicado' },
  { value: 'lead_sem_fit',          label: 'Lead sem fit' },
  { value: 'outro',                 label: 'Outro motivo' },
] as const;

export type MotivoArquivamento = (typeof MOTIVOS_ARQUIVAMENTO)[number]['value'];

export interface ArquivarLeadInput {
  motivo: MotivoArquivamento;
  observacao?: string;
  proximo_responsavel_id?: string | null;
  data_reativacao?: string | null;
}

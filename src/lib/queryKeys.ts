/**
 * Centralized query key factory for React Query.
 *
 * Replaces inline string arrays like `['leads', tenantId]` scattered across 40+ hooks.
 * Using a factory ensures:
 * - Consistent key structure across all hooks
 * - Type-safe keys with `as const` tuples
 * - Hierarchical invalidation (e.g. `queryKeys.leads.all` invalidates all lead queries)
 * - Single source of truth for cache key naming
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys#use-query-key-factories
 *
 * @example
 * ```ts
 * // In a hook:
 * import { queryKeys } from '@/lib/queryKeys';
 *
 * useQuery({ queryKey: queryKeys.leads.list(tenantId), ... });
 *
 * // Invalidation:
 * queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
 * ```
 */

export const queryKeys = {
  // ─── Core Entities ──────────────────────────────────────────────────────────

  leads: {
    all: ['leads'] as const,
    lists: () => [...queryKeys.leads.all, 'list'] as const,
    list: (tenantId?: string | null, page?: number, scope?: string) =>
      [...queryKeys.leads.all, tenantId, page ?? 1, scope ?? 'all'] as const,
    details: () => [...queryKeys.leads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leads.details(), id] as const,
    byId: (leadId?: string) => ['lead', leadId] as const,
    byTenant: (tenantId?: string | null, leadId?: string | null) => ['lead', tenantId, leadId] as const,
    stats: (tenantId?: string | null) => ['leads-stats', tenantId] as const,
    contratos: (tenantId?: string | null) => ['leads-contratos', tenantId] as const,
  },

  processos: {
    all: ['processos'] as const,
    lists: () => [...queryKeys.processos.all, 'list'] as const,
    list: (tenantId?: string | null, page?: number, filterStatus?: string, filterTipo?: string, search?: string) =>
      [...queryKeys.processos.all, tenantId, page ?? 1, filterStatus ?? '', filterTipo ?? '', search ?? ''] as const,
    statsAtivos: (tenantId?: string | null) => ['processos-stats-ativos', tenantId] as const,
    statsExito: (tenantId?: string | null) => ['processos-stats-exito', tenantId] as const,
  },

  contratos: {
    all: ['contratos'] as const,
    list: (tenantId?: string | null, page?: number, search?: string, status?: string) =>
      [...queryKeys.contratos.all, tenantId, page ?? 0, search ?? '', status ?? ''] as const,
    stats: (tenantId?: string | null) => ['contratos-stats', tenantId] as const,
  },

  honorarios: {
    all: ['honorarios'] as const,
    list: (tenantId?: string | null) => [...queryKeys.honorarios.all, tenantId] as const,
  },

  agendamentos: {
    all: ['agendamentos'] as const,
    list: (tenantId?: string | null, page?: number, status?: string, dateFrom?: string, dateTo?: string) =>
      [...queryKeys.agendamentos.all, tenantId, page ?? 0, status ?? '', dateFrom ?? '', dateTo ?? ''] as const,
  },

  tarefas: {
    all: ['tarefas'] as const,
    list: (tenantId?: string | null, page?: number, status?: string, search?: string) =>
      [...queryKeys.tarefas.all, tenantId, page ?? 0, status ?? '', search ?? ''] as const,
  },

  prazosProcessuais: {
    all: ['prazos_processuais'] as const,
    list: (tenantId?: string | null, page?: number) =>
      [...queryKeys.prazosProcessuais.all, tenantId, page ?? 1] as const,
    calendarioAll: ['prazos-calendario'] as const,
    calendario: (tenantId?: string | null, year?: number, month?: number, status?: string) =>
      ['prazos-calendario', tenantId, year, month, status] as const,
  },

  documentosJuridicos: {
    all: ['documentos_juridicos'] as const,
    list: (tenantId?: string | null) => [...queryKeys.documentosJuridicos.all, tenantId] as const,
  },

  // ─── CRM ────────────────────────────────────────────────────────────────────

  crmPipeline: {
    all: ['crm-pipeline-stages'] as const,
    list: (tenantId?: string | null) => [...queryKeys.crmPipeline.all, tenantId] as const,
  },

  crmFollowups: {
    all: ['crm-followups'] as const,
    list: (tenantId?: string | null) => [...queryKeys.crmFollowups.all, tenantId] as const,
    overdue: (tenantId?: string | null) => ['crm-followups-overdue', tenantId] as const,
  },

  followupSequences: {
    all: ['followup-sequences'] as const,
    list: (tenantId?: string | null) => [...queryKeys.followupSequences.all, tenantId] as const,
  },

  statusStages: {
    all: ['status-stages'] as const,
    list: (tenantId?: string | null) => [...queryKeys.statusStages.all, tenantId] as const,
    leadCounts: (tenantId?: string | null) => ['status-stages-lead-counts', tenantId] as const,
  },

  // ─── Lead Sub-entities ──────────────────────────────────────────────────────

  leadNotas: {
    all: ['lead_notas'] as const,
    list: (leadId?: string) => [...queryKeys.leadNotas.all, leadId] as const,
  },

  leadHistorico: {
    all: ['lead_historico'] as const,
    list: (leadId?: string) => [...queryKeys.leadHistorico.all, leadId] as const,
  },

  leadTags: {
    all: ['lead_tags'] as const,
    list: (leadId?: string) => [...queryKeys.leadTags.all, leadId] as const,
  },

  leadTagsBatch: {
    all: ['lead_tags_batch'] as const,
    list: (tenantId?: string | null) => [...queryKeys.leadTagsBatch.all, tenantId] as const,
  },

  tags: {
    all: ['tags'] as const,
    list: (tenantId?: string | null) => [...queryKeys.tags.all, tenantId] as const,
  },

  // ─── WhatsApp / Conexoes ────────────────────────────────────────────────────

  whatsappConversations: {
    all: ['whatsapp-conversations'] as const,
    list: (tenantId?: string | null) => [...queryKeys.whatsappConversations.all, tenantId] as const,
  },

  conexoesWhatsapp: {
    all: ['conexoes_whatsapp'] as const,
    list: (tenantId?: string | null) => [...queryKeys.conexoesWhatsapp.all, tenantId] as const,
    logs: (conexaoId?: string) => ['conexoes_logs', conexaoId] as const,
    alertas: (conexaoId?: string) => ['conexoes_alertas', conexaoId] as const,
  },

  // ─── Notifications ─────────────────────────────────────────────────────────

  notifications: {
    all: ['notifications'] as const,
    list: (tenantId?: string | null, userId?: string) =>
      [...queryKeys.notifications.all, tenantId, userId] as const,
  },

  notificationTemplates: {
    all: ['notification-templates'] as const,
    list: (tenantId?: string | null) => [...queryKeys.notificationTemplates.all, tenantId] as const,
  },

  // ─── Team / Organization ────────────────────────────────────────────────────

  teamMembers: {
    all: ['team_members'] as const,
    list: (tenantId?: string | null) => [...queryKeys.teamMembers.all, tenantId] as const,
  },

  departamentos: {
    all: ['departamentos'] as const,
    list: (tenantId?: string | null) => [...queryKeys.departamentos.all, tenantId] as const,
    membros: (departamentoId?: string) => ['departamento_membros', departamentoId] as const,
  },

  userDepartamentos: {
    all: ['user_departamentos'] as const,
    list: (profileId?: string) => [...queryKeys.userDepartamentos.all, profileId] as const,
  },

  // ─── AI Agents ──────────────────────────────────────────────────────────────

  agentesIA: {
    all: ['agentes_ia'] as const,
    list: (tenantId?: string | null) => [...queryKeys.agentesIA.all, tenantId] as const,
  },

  agentTraining: {
    all: ['agent-training-documents'] as const,
    list: (tenantId?: string | null) => [...queryKeys.agentTraining.all, tenantId] as const,
  },

  multiAgent: {
    all: ['multi-agent'] as const,
    stats: (tenantId?: string | null) => ['multi-agent-stats', tenantId] as const,
    metrics: (tenantId?: string | null) => ['multi-agent-metrics', tenantId] as const,
  },

  // ─── Logs / Metrics / Settings ──────────────────────────────────────────────

  logsExecucao: {
    all: ['logs-execucao'] as const,
    list: (tenantId?: string | null) => [...queryKeys.logsExecucao.all, tenantId] as const,
  },

  activityLogs: {
    all: ['activity-logs'] as const,
    list: (tenantId?: string | null) => [...queryKeys.activityLogs.all, tenantId] as const,
  },

  systemSettings: {
    all: ['system-settings'] as const,
    list: (tenantId?: string | null) => [...queryKeys.systemSettings.all, tenantId] as const,
  },

  apiKeys: {
    all: ['api-keys'] as const,
    list: (tenantId?: string | null) => [...queryKeys.apiKeys.all, tenantId] as const,
  },

  integracoesConfig: {
    all: ['integracoes-config'] as const,
    list: (tenantId?: string | null) => [...queryKeys.integracoesConfig.all, tenantId] as const,
  },

  ticketsSuporte: {
    all: ['tickets-suporte'] as const,
    list: (tenantId?: string | null) => [...queryKeys.ticketsSuporte.all, tenantId] as const,
  },

  // ─── Dashboard / Reports ────────────────────────────────────────────────────

  dashboardMetrics: {
    all: ['dashboard-metrics-fast'] as const,
    list: (tenantId?: string | null) => [...queryKeys.dashboardMetrics.all, tenantId] as const,
  },

  dashboardAgentActivity: {
    all: ['dashboard', 'agent-activity'] as const,
    list: (tenantId?: string | null) => ['dashboard', 'agent-activity', tenantId] as const,
  },

  analyticsDashboard: {
    all: ['analytics-dashboard'] as const,
    list: (tenantId?: string | null, period?: string) => ['analytics-dashboard', tenantId, period] as const,
  },

  mrr: {
    all: ['mrr'] as const,
    list: (tenantId?: string | null) => [...queryKeys.mrr.all, tenantId] as const,
  },

  responseTime: {
    all: ['response-time'] as const,
    list: (tenantId?: string | null, days?: number) =>
      [...queryKeys.responseTime.all, tenantId, days] as const,
  },

  agendaMetrics: {
    all: ['agenda-metrics'] as const,
    list: (tenantId?: string | null) => [...queryKeys.agendaMetrics.all, tenantId] as const,
  },

  // ─── Reports (Relatorios) ──────────────────────────────────────────────────

  kpisGerais: {
    all: ['kpis-gerais'] as const,
    list: (tenantId?: string | null, periodo?: string, areaJuridica?: string, origemLead?: string, visibilityScope?: string) =>
      ['kpis-gerais', tenantId, periodo, areaJuridica, origemLead, visibilityScope] as const,
  },

  dadosFunil: {
    all: ['dados-funil'] as const,
    list: (tenantId?: string | null, periodo?: string, areaJuridica?: string, origemLead?: string, visibilityScope?: string) =>
      ['dados-funil', tenantId, periodo, areaJuridica, origemLead, visibilityScope] as const,
  },

  dadosAreaJuridica: {
    all: ['dados-area-juridica'] as const,
    list: (tenantId?: string | null, periodo?: string, origemLead?: string, visibilityScope?: string) =>
      ['dados-area-juridica', tenantId, periodo, origemLead, visibilityScope] as const,
  },

  dadosOrigem: {
    all: ['dados-origem'] as const,
    list: (tenantId?: string | null, periodo?: string, areaJuridica?: string, visibilityScope?: string) =>
      ['dados-origem', tenantId, periodo, areaJuridica, visibilityScope] as const,
  },

  dadosConversao: {
    all: ['dados-conversao'] as const,
    list: (tenantId?: string | null, periodo?: string) => ['dados-conversao', tenantId, periodo] as const,
  },

  rankingAgentes: {
    all: ['ranking-agentes'] as const,
    list: (tenantId?: string | null, periodo?: string, visibilityScope?: string) =>
      ['ranking-agentes', tenantId, periodo, visibilityScope] as const,
  },

  agendamentosReport: {
    all: ['agendamentos-report'] as const,
    list: (tenantId?: string | null) => ['agendamentos-report', tenantId] as const,
  },

  clientsReport: {
    all: ['clients-report'] as const,
    list: (tenantId?: string | null, visibilityScope?: string) =>
      ['clients-report', tenantId, visibilityScope] as const,
  },

  // ─── Google Calendar ────────────────────────────────────────────────────────

  googleCalendarStatus: {
    all: ['google-calendar-status'] as const,
    detail: (userId?: string) => [...queryKeys.googleCalendarStatus.all, userId] as const,
  },

  googleCalendarSettings: {
    all: ['google-calendar-settings'] as const,
    detail: (tenantId?: string | null, userId?: string) =>
      [...queryKeys.googleCalendarSettings.all, tenantId, userId] as const,
  },

  googleCalendarEvents: {
    all: ['google-calendar-events'] as const,
    list: (userId?: string, connected?: boolean, start?: string, end?: string) =>
      [...queryKeys.googleCalendarEvents.all, userId, connected, start, end] as const,
  },

  // ─── Usuarios (referenced by useTeamMembers invalidation) ───────────────────

  usuarios: {
    all: ['usuarios'] as const,
  },

  userRoles: {
    all: ['user-roles'] as const,
    detail: (userId?: string) => ['user-roles', userId] as const,
  },

  configuracoesMembros: {
    all: ['configuracoes-membros'] as const,
    list: (tenantId?: string | null) => ['configuracoes-membros', tenantId] as const,
  },

  rolePermissionsMatriz: {
    all: ['role-permissions-matriz'] as const,
  },

  // ─── Automations ───────────────────────────────────────────────────────────

  automationRules: {
    all: ['automation-rules'] as const,
  },

  automationFlows: {
    all: ['automation-flows'] as const,
    list: (tenantId?: string | null) => ['automation-flows', tenantId] as const,
    detail: (flowId?: string | null) => ['automation-flow-detail', flowId] as const,
  },

  // ─── Onboarding ────────────────────────────────────────────────────────────

  onboardingWizard: {
    all: ['onboarding-wizard-completed'] as const,
    detail: (tenantId?: string | null) => ['onboarding-wizard-completed', tenantId] as const,
  },

  onboardingStatus: {
    all: ['onboarding-status'] as const,
    detail: (tenantId?: string | null, userId?: string) =>
      ['onboarding-status', tenantId, userId] as const,
  },

  // ─── Performance / Misc ────────────────────────────────────────────────────

  agentExecutions: {
    all: ['agent-executions'] as const,
    list: (tenantId?: string | null) => ['agent-executions', tenantId] as const,
  },

  errorLogs: {
    all: ['error-logs'] as const,
    list: (tenantId?: string | null) => ['error-logs', tenantId] as const,
  },

  allDepartmentMemberships: {
    all: ['all_department_memberships'] as const,
    list: (tenantId?: string | null) => ['all_department_memberships', tenantId] as const,
  },

  aiUsageStats: {
    all: ['ai-usage-stats'] as const,
  },
} as const;

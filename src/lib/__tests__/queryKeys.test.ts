import { describe, it, expect } from 'vitest';
import { queryKeys } from '../queryKeys';

describe('queryKeys factory', () => {
  it('generates consistent keys for core entities', () => {
    expect(queryKeys.leads.all).toEqual(['leads']);
    expect(queryKeys.leads.list('t1', 2, 'active')).toEqual(['leads', 't1', 2, 'active']);
    expect(queryKeys.leads.detail('lead-1')).toEqual(['leads', 'detail', 'lead-1']);
    expect(queryKeys.leads.byId('lead-1')).toEqual(['lead', 'lead-1']);
    expect(queryKeys.leads.byTenant('t1', 'l1')).toEqual(['lead', 't1', 'l1']);
    expect(queryKeys.leads.stats('t1')).toEqual(['leads-stats', 't1']);
    expect(queryKeys.leads.contratos('t1')).toEqual(['leads-contratos', 't1']);

    expect(queryKeys.processos.list('t1', 1, 'ativo', 'civel', 'busca')).toEqual([
      'processos',
      't1',
      1,
      'ativo',
      'civel',
      'busca',
    ]);
    expect(queryKeys.processos.statsAtivos('t1')).toEqual(['processos-stats-ativos', 't1']);
    expect(queryKeys.processos.statsExito('t1')).toEqual(['processos-stats-exito', 't1']);
    expect(queryKeys.processos.andamentos('p1')).toEqual(['processos', 'andamentos', 'p1']);

    expect(queryKeys.contratos.list('t1', 0, 'contrato', 'ativo')).toEqual([
      'contratos',
      't1',
      0,
      'contrato',
      'ativo',
    ]);
    expect(queryKeys.contratos.stats('t1')).toEqual(['contratos-stats', 't1']);

    expect(queryKeys.agendamentos.list('t1', 0, 'pago', '2026-01-01', '2026-01-31')).toEqual([
      'agendamentos',
      't1',
      0,
      'pago',
      '2026-01-01',
      '2026-01-31',
    ]);

    expect(queryKeys.tarefas.list('t1', 1, 'pendente', 'tarefa')).toEqual([
      'tarefas',
      't1',
      1,
      'pendente',
      'tarefa',
    ]);

    expect(queryKeys.prazosProcessuais.list('t1', 1)).toEqual(['prazos_processuais', 't1', 1]);
    expect(queryKeys.prazosProcessuais.calendario('t1', 2026, 5, 'pendente')).toEqual([
      'prazos-calendario',
      't1',
      2026,
      5,
      'pendente',
    ]);

    expect(queryKeys.documentosJuridicos.list('t1')).toEqual(['documentos_juridicos', 't1']);
    expect(queryKeys.documentoFolders.list('t1')).toEqual(['documento_folders', 't1']);

    expect(queryKeys.crmPipeline.list('t1')).toEqual(['crm-pipeline-stages', 't1']);
    expect(queryKeys.crmFollowups.list('t1')).toEqual(['crm-followups', 't1']);
    expect(queryKeys.crmFollowups.overdue('t1')).toEqual(['crm-followups-overdue', 't1']);
    expect(queryKeys.followupSequences.list('t1')).toEqual(['followup-sequences', 't1']);

    expect(queryKeys.statusStages.list('t1')).toEqual(['status-stages', 't1']);
    expect(queryKeys.statusStages.leadCounts('t1')).toEqual(['status-stages-lead-counts', 't1']);

    expect(queryKeys.leadNotas.list('l1')).toEqual(['lead_notas', 'l1']);
    expect(queryKeys.leadHistorico.list('l1')).toEqual(['lead_historico', 'l1']);
    expect(queryKeys.leadTags.list('l1')).toEqual(['lead_tags', 'l1']);
    expect(queryKeys.leadTagsBatch.list('t1')).toEqual(['lead_tags_batch', 't1']);
    expect(queryKeys.tags.list('t1')).toEqual(['tags', 't1']);

    expect(queryKeys.whatsappConversations.list('t1')).toEqual(['whatsapp-conversations', 't1']);
    expect(queryKeys.conexoesWhatsapp.list('t1')).toEqual(['conexoes_whatsapp', 't1']);
    expect(queryKeys.conexoesWhatsapp.logs('c1')).toEqual(['conexoes_logs', 'c1']);
    expect(queryKeys.conexoesWhatsapp.alertas('c1')).toEqual(['conexoes_alertas', 'c1']);

    expect(queryKeys.notifications.list('t1', 'u1')).toEqual(['notifications', 't1', 'u1']);
    expect(queryKeys.notificationTemplates.list('t1')).toEqual(['notification-templates', 't1']);

    expect(queryKeys.teamMembers.list('t1')).toEqual(['team_members', 't1']);
    expect(queryKeys.departamentos.list('t1')).toEqual(['departamentos', 't1']);
    expect(queryKeys.departamentos.membros('d1')).toEqual(['departamento_membros', 'd1']);
    expect(queryKeys.userDepartamentos.list('p1')).toEqual(['user_departamentos', 'p1']);

    expect(queryKeys.agentesIA.list('t1')).toEqual(['agentes_ia', 't1']);
    expect(queryKeys.agentTraining.list('t1')).toEqual(['agent-training-documents', 't1']);
    expect(queryKeys.multiAgent.stats('t1')).toEqual(['multi-agent-stats', 't1']);
    expect(queryKeys.multiAgent.metrics('t1')).toEqual(['multi-agent-metrics', 't1']);

    expect(queryKeys.logsExecucao.list('t1')).toEqual(['logs-execucao', 't1']);
    expect(queryKeys.activityLogs.list('t1')).toEqual(['activity-logs', 't1']);
    expect(queryKeys.systemSettings.list('t1')).toEqual(['system-settings', 't1']);
    expect(queryKeys.apiKeys.list('t1')).toEqual(['api-keys', 't1']);
    expect(queryKeys.integracoesConfig.list('t1')).toEqual(['integracoes-config', 't1']);
    expect(queryKeys.ticketsSuporte.list('t1')).toEqual(['tickets-suporte', 't1']);

    expect(queryKeys.dashboardMetrics.list('t1')).toEqual(['dashboard-metrics-fast', 't1']);
    expect(queryKeys.dashboardAgentActivity.list('t1')).toEqual(['dashboard', 'agent-activity', 't1']);
    expect(queryKeys.analyticsDashboard.list('t1', '30d')).toEqual(['analytics-dashboard', 't1', '30d']);
    expect(queryKeys.mrr.list('t1')).toEqual(['mrr', 't1']);
    expect(queryKeys.responseTime.list('t1', 30)).toEqual(['response-time', 't1', 30]);
    expect(queryKeys.agendaMetrics.list('t1')).toEqual(['agenda-metrics', 't1']);

    expect(queryKeys.kpisGerais.list('t1', '30d', 'civel', 'meta', 'tenant')).toEqual([
      'kpis-gerais',
      't1',
      '30d',
      'civel',
      'meta',
      'tenant',
    ]);
    expect(queryKeys.dadosFunil.list('t1', '30d', 'civel', 'meta', 'tenant')).toEqual([
      'dados-funil',
      't1',
      '30d',
      'civel',
      'meta',
      'tenant',
    ]);
    expect(queryKeys.dadosAreaJuridica.list('t1', '30d', 'meta', 'tenant')).toEqual([
      'dados-area-juridica',
      't1',
      '30d',
      'meta',
      'tenant',
    ]);
    expect(queryKeys.dadosOrigem.list('t1', '30d', 'civel', 'tenant')).toEqual([
      'dados-origem',
      't1',
      '30d',
      'civel',
      'tenant',
    ]);
    expect(queryKeys.dadosConversao.list('t1', '30d')).toEqual(['dados-conversao', 't1', '30d']);
    expect(queryKeys.rankingAgentes.list('t1', '30d', 'tenant')).toEqual(['ranking-agentes', 't1', '30d', 'tenant']);
    expect(queryKeys.agendamentosReport.list('t1')).toEqual(['agendamentos-report', 't1']);
    expect(queryKeys.clientsReport.list('t1', 'tenant')).toEqual(['clients-report', 't1', 'tenant']);

    expect(queryKeys.googleCalendarStatus.detail('u1')).toEqual(['google-calendar-status', 'u1']);
    expect(queryKeys.googleCalendarSettings.detail('t1', 'u1')).toEqual(['google-calendar-settings', 't1', 'u1']);
    expect(queryKeys.googleCalendarEvents.list('u1', true, 'start', 'end')).toEqual([
      'google-calendar-events',
      'u1',
      true,
      'start',
      'end',
    ]);

    expect(queryKeys.userRoles.detail('u1')).toEqual(['user-roles', 'u1']);
    expect(queryKeys.configuracoesMembros.list('t1')).toEqual(['configuracoes-membros', 't1']);
    expect(queryKeys.automationFlows.list('t1')).toEqual(['automation-flows', 't1']);
    expect(queryKeys.automationFlows.detail('f1')).toEqual(['automation-flow-detail', 'f1']);

    expect(queryKeys.onboardingWizard.detail('t1')).toEqual(['onboarding-wizard-completed', 't1']);
    expect(queryKeys.onboardingStatus.detail('t1', 'u1')).toEqual(['onboarding-status', 't1', 'u1']);
    expect(queryKeys.subscriptionPlans.list()).toEqual(['subscription-plans', 'list']);

    expect(queryKeys.agentExecutions.list('t1')).toEqual(['agent-executions', 't1']);
    expect(queryKeys.errorLogs.list('t1')).toEqual(['error-logs', 't1']);
    expect(queryKeys.allDepartmentMemberships.list('t1')).toEqual(['all_department_memberships', 't1']);
    expect(queryKeys.featureFlags.byName('t1', 'feat')).toEqual(['feature-flags', 't1', 'feat']);
  });
});

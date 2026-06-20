import { describe, it, expect } from 'vitest';
import { queryKeys } from '../queryKeys';

describe('queryKeys factory', () => {
  describe('leads', () => {
    it('returns correct keys', () => {
      expect(queryKeys.leads.all).toEqual(['leads']);
      expect(queryKeys.leads.lists()).toEqual(['leads', 'list']);
      expect(queryKeys.leads.list('t1', 2, 'active')).toEqual(['leads', 't1', 2, 'active']);
      expect(queryKeys.leads.details()).toEqual(['leads', 'detail']);
      expect(queryKeys.leads.detail('id1')).toEqual(['leads', 'detail', 'id1']);
      expect(queryKeys.leads.byId('l1')).toEqual(['lead', 'l1']);
      expect(queryKeys.leads.byTenant('t1', 'l1')).toEqual(['lead', 't1', 'l1']);
      expect(queryKeys.leads.stats('t1')).toEqual(['leads-stats', 't1']);
    });
  });

  describe('processos', () => {
    it('returns correct keys', () => {
      expect(queryKeys.processos.all).toEqual(['processos']);
      expect(queryKeys.processos.list('t1', 1, 'active', 'tipo', 'search')).toEqual([
        'processos', 't1', 1, 'active', 'tipo', 'search'
      ]);
      expect(queryKeys.processos.statsAtivos('t1')).toEqual(['processos-stats-ativos', 't1']);
      expect(queryKeys.processos.andamentos('p1')).toEqual(['processos', 'andamentos', 'p1']);
    });
  });

  describe('contratos', () => {
    it('returns correct keys', () => {
      expect(queryKeys.contratos.list('t1', 1, 'query', 'signed')).toEqual(['contratos', 't1', 1, 'query', 'signed']);
      expect(queryKeys.contratos.stats('t1')).toEqual(['contratos-stats', 't1']);
    });
  });

  describe('notifications', () => {
    it('returns correct keys', () => {
      expect(queryKeys.notifications.all).toEqual(['notifications']);
      expect(queryKeys.notifications.list('t1', 'u1')).toEqual(['notifications', 't1', 'u1']);
    });
  });

  describe('whatsapp', () => {
    it('returns correct keys', () => {
      expect(queryKeys.whatsappConversations.list('t1')).toEqual(['whatsapp-conversations', 't1']);
      expect(queryKeys.conexoesWhatsapp.list('t1')).toEqual(['conexoes_whatsapp', 't1']);
      expect(queryKeys.conexoesWhatsapp.logs('c1')).toEqual(['conexoes_logs', 'c1']);
    });
  });

  describe('automations', () => {
    it('returns correct keys', () => {
      expect(queryKeys.automationFlows.list('t1')).toEqual(['automation-flows', 't1']);
      expect(queryKeys.automationFlows.detail('f1')).toEqual(['automation-flow-detail', 'f1']);
    });
  });

  describe('misc factories', () => {
    it('exercises various other factory functions', () => {
      expect(queryKeys.leads.contratos('t1')).toEqual(['leads-contratos', 't1']);
      expect(queryKeys.processos.lists()).toEqual(['processos', 'list']);
      expect(queryKeys.processos.statsExito('t1')).toEqual(['processos-stats-exito', 't1']);
      expect(queryKeys.contratos.all).toEqual(['contratos']);
      expect(queryKeys.honorarios.list('t1')).toEqual(['honorarios', 't1']);
      expect(queryKeys.agendamentos.list('t1')).toEqual(['agendamentos', 't1', 0, '', '', '']);
      expect(queryKeys.tarefas.list('t1')).toEqual(['tarefas', 't1', 0, '', '']);
      expect(queryKeys.prazosProcessuais.list('t1', 1)).toEqual(['prazos_processuais', 't1', 1]);
      expect(queryKeys.prazosProcessuais.calendario('t1', 2026, 5, 'pending')).toEqual(['prazos-calendario', 't1', 2026, 5, 'pending']);
      expect(queryKeys.documentosJuridicos.list('t1')).toEqual(['documentos_juridicos', 't1']);
      expect(queryKeys.documentoFolders.list('t1')).toEqual(['documento_folders', 't1']);
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
      expect(queryKeys.analyticsDashboard.list('t1', 'month')).toEqual(['analytics-dashboard', 't1', 'month']);
      expect(queryKeys.mrr.list('t1')).toEqual(['mrr', 't1']);
      expect(queryKeys.responseTime.list('t1', 30)).toEqual(['response-time', 't1', 30]);
      expect(queryKeys.agendaMetrics.list('t1')).toEqual(['agenda-metrics', 't1']);
      expect(queryKeys.kpisGerais.list('t1', '30d', 'all', 'direct', 'own')).toEqual(['kpis-gerais', 't1', '30d', 'all', 'direct', 'own']);
      expect(queryKeys.dadosFunil.list('t1')).toEqual(['dados-funil', 't1', undefined, undefined, undefined, undefined]);
      expect(queryKeys.dadosAreaJuridica.list('t1')).toEqual(['dados-area-juridica', 't1', undefined, undefined, undefined]);
      expect(queryKeys.dadosOrigem.list('t1')).toEqual(['dados-origem', 't1', undefined, undefined, undefined]);
      expect(queryKeys.dadosConversao.list('t1', '30d')).toEqual(['dados-conversao', 't1', '30d']);
      expect(queryKeys.rankingAgentes.list('t1')).toEqual(['ranking-agentes', 't1', undefined, undefined]);
      expect(queryKeys.agendamentosReport.list('t1')).toEqual(['agendamentos-report', 't1']);
      expect(queryKeys.clientsReport.list('t1')).toEqual(['clients-report', 't1', undefined]);
      expect(queryKeys.googleCalendarStatus.detail('u1')).toEqual(['google-calendar-status', 'u1']);
      expect(queryKeys.googleCalendarSettings.detail('t1', 'u1')).toEqual(['google-calendar-settings', 't1', 'u1']);
      expect(queryKeys.googleCalendarEvents.list('u1', true, 'start', 'end')).toEqual(['google-calendar-events', 'u1', true, 'start', 'end']);
      expect(queryKeys.userRoles.detail('u1')).toEqual(['user-roles', 'u1']);
      expect(queryKeys.configuracoesMembros.list('t1')).toEqual(['configuracoes-membros', 't1']);
      expect(queryKeys.onboardingWizard.detail('t1')).toEqual(['onboarding-wizard-completed', 't1']);
      expect(queryKeys.onboardingStatus.detail('t1', 'u1')).toEqual(['onboarding-status', 't1', 'u1']);
      expect(queryKeys.subscriptionPlans.list()).toEqual(['subscription-plans', 'list']);
      expect(queryKeys.agentExecutions.list('t1')).toEqual(['agent-executions', 't1']);
      expect(queryKeys.errorLogs.list('t1')).toEqual(['error-logs', 't1']);
      expect(queryKeys.allDepartmentMemberships.list('t1')).toEqual(['all_department_memberships', 't1']);
      expect(queryKeys.featureFlags.byName('t1', 'f1')).toEqual(['feature-flags', 't1', 'f1']);
      expect(queryKeys.automationRules.all).toEqual(['automation-rules']);
      expect(queryKeys.automationFlows.all).toEqual(['automation-flows']);
      expect(queryKeys.conexoesWhatsapp.all).toEqual(['conexoes_whatsapp']);
      expect(queryKeys.whatsappConversations.all).toEqual(['whatsapp-conversations']);
      expect(queryKeys.conexoesWhatsapp.alertas('c1')).toEqual(['conexoes_alertas', 'c1']);
    });
  });
});

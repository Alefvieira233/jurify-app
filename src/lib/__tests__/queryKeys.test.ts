import { describe, it, expect } from 'vitest';
import { queryKeys } from '../queryKeys';

describe('queryKeys', () => {
  it('leads keys', () => {
    expect(queryKeys.leads.all).toEqual(['leads']);
    expect(queryKeys.leads.lists()).toEqual(['leads', 'list']);
    expect(queryKeys.leads.list('t1', 2, 'own')).toEqual(['leads', 't1', 2, 'own']);
    expect(queryKeys.leads.details()).toEqual(['leads', 'detail']);
    expect(queryKeys.leads.detail('id1')).toEqual(['leads', 'detail', 'id1']);
    expect(queryKeys.leads.byId('id1')).toEqual(['lead', 'id1']);
    expect(queryKeys.leads.byTenant('t1', 'id1')).toEqual(['lead', 't1', 'id1']);
    expect(queryKeys.leads.stats('t1')).toEqual(['leads-stats', 't1']);
    expect(queryKeys.leads.contratos('t1')).toEqual(['leads-contratos', 't1']);
  });

  it('processos keys', () => {
    expect(queryKeys.processos.all).toEqual(['processos']);
    expect(queryKeys.processos.lists()).toEqual(['processos', 'list']);
    expect(queryKeys.processos.list('t1', 1, 'active', 'civil', 'search')).toEqual(['processos', 't1', 1, 'active', 'civil', 'search']);
    expect(queryKeys.processos.statsAtivos('t1')).toEqual(['processos-stats-ativos', 't1']);
    expect(queryKeys.processos.statsExito('t1')).toEqual(['processos-stats-exito', 't1']);
    expect(queryKeys.processos.andamentos('p1')).toEqual(['processos', 'andamentos', 'p1']);
  });

  it('agendamentos keys', () => {
    expect(queryKeys.agendamentos.all).toEqual(['agendamentos']);
    expect(queryKeys.agendamentos.list('t1')).toEqual(['agendamentos', 't1', 0, '', '', '']);
  });

  it('contratos keys', () => {
    expect(queryKeys.contratos.all).toEqual(['contratos']);
    expect(queryKeys.contratos.list('t1')).toEqual(['contratos', 't1', 0, '', '']);
    expect(queryKeys.contratos.stats('t1')).toEqual(['contratos-stats', 't1']);
  });

  it('honorarios keys', () => {
    expect(queryKeys.honorarios.all).toEqual(['honorarios']);
    expect(queryKeys.honorarios.list('t1')).toEqual(['honorarios', 't1']);
  });

  it('agentesIA keys', () => {
    expect(queryKeys.agentesIA.all).toEqual(['agentes_ia']);
    expect(queryKeys.agentesIA.list('t1')).toEqual(['agentes_ia', 't1']);
  });

  it('automationFlows keys', () => {
    expect(queryKeys.automationFlows.all).toEqual(['automation-flows']);
    expect(queryKeys.automationFlows.list('t1')).toEqual(['automation-flows', 't1']);
    expect(queryKeys.automationFlows.detail('f1')).toEqual(['automation-flow-detail', 'f1']);
  });

  it('onboarding keys', () => {
    expect(queryKeys.onboardingWizard.all).toEqual(['onboarding-wizard-completed']);
    expect(queryKeys.onboardingWizard.detail('t1')).toEqual(['onboarding-wizard-completed', 't1']);
    expect(queryKeys.onboardingStatus.detail('t1', 'u1')).toEqual(['onboarding-status', 't1', 'u1']);
  });

  it('misc keys', () => {
    expect(queryKeys.subscriptionPlans.all).toEqual(['subscription-plans']);
    expect(queryKeys.subscriptionPlans.list()).toEqual(['subscription-plans', 'list']);
    expect(queryKeys.agentExecutions.list('t1')).toEqual(['agent-executions', 't1']);
    expect(queryKeys.errorLogs.list('t1')).toEqual(['error-logs', 't1']);
    expect(queryKeys.featureFlags.byName('t1', 'f1')).toEqual(['feature-flags', 't1', 'f1']);
  });

  it('WhatsApp and Conexoes keys', () => {
    expect(queryKeys.whatsappConversations.all).toEqual(['whatsapp-conversations']);
    expect(queryKeys.whatsappConversations.list('t1')).toEqual(['whatsapp-conversations', 't1']);
    expect(queryKeys.conexoesWhatsapp.all).toEqual(['conexoes_whatsapp']);
    expect(queryKeys.conexoesWhatsapp.list('t1')).toEqual(['conexoes_whatsapp', 't1']);
    expect(queryKeys.conexoesWhatsapp.logs('c1')).toEqual(['conexoes_logs', 'c1']);
    expect(queryKeys.conexoesWhatsapp.alertas('c1')).toEqual(['conexoes_alertas', 'c1']);
  });

  it('Notification keys', () => {
    expect(queryKeys.notifications.all).toEqual(['notifications']);
    expect(queryKeys.notifications.list('t1', 'u1')).toEqual(['notifications', 't1', 'u1']);
    expect(queryKeys.notificationTemplates.all).toEqual(['notification-templates']);
    expect(queryKeys.notificationTemplates.list('t1')).toEqual(['notification-templates', 't1']);
  });

  it('Team and Dept keys', () => {
    expect(queryKeys.teamMembers.all).toEqual(['team_members']);
    expect(queryKeys.teamMembers.list('t1')).toEqual(['team_members', 't1']);
    expect(queryKeys.departamentos.all).toEqual(['departamentos']);
    expect(queryKeys.departamentos.list('t1')).toEqual(['departamentos', 't1']);
    expect(queryKeys.departamentos.membros('d1')).toEqual(['departamento_membros', 'd1']);
    expect(queryKeys.userDepartamentos.all).toEqual(['user_departamentos']);
    expect(queryKeys.userDepartamentos.list('p1')).toEqual(['user_departamentos', 'p1']);
  });

  it('Log and Setting keys', () => {
    expect(queryKeys.logsExecucao.all).toEqual(['logs-execucao']);
    expect(queryKeys.logsExecucao.list('t1')).toEqual(['logs-execucao', 't1']);
    expect(queryKeys.activityLogs.all).toEqual(['activity-logs']);
    expect(queryKeys.activityLogs.list('t1')).toEqual(['activity-logs', 't1']);
    expect(queryKeys.systemSettings.all).toEqual(['system-settings']);
    expect(queryKeys.systemSettings.list('t1')).toEqual(['system-settings', 't1']);
    expect(queryKeys.apiKeys.all).toEqual(['api-keys']);
    expect(queryKeys.apiKeys.list('t1')).toEqual(['api-keys', 't1']);
    expect(queryKeys.integracoesConfig.all).toEqual(['integracoes-config']);
    expect(queryKeys.integracoesConfig.list('t1')).toEqual(['integracoes-config', 't1']);
  });

  it('Dashboard and Report keys', () => {
    expect(queryKeys.dashboardMetrics.all).toEqual(['dashboard-metrics-fast']);
    expect(queryKeys.dashboardMetrics.list('t1')).toEqual(['dashboard-metrics-fast', 't1']);
    expect(queryKeys.mrr.all).toEqual(['mrr']);
    expect(queryKeys.mrr.list('t1')).toEqual(['mrr', 't1']);
    expect(queryKeys.responseTime.all).toEqual(['response-time']);
    expect(queryKeys.responseTime.list('t1', 7)).toEqual(['response-time', 't1', 7]);
    expect(queryKeys.agendaMetrics.all).toEqual(['agenda-metrics']);
    expect(queryKeys.agendaMetrics.list('t1')).toEqual(['agenda-metrics', 't1']);
  });
});

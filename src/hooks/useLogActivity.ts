
import { useCallback } from 'react';
import { useActivityLogs } from './useActivityLogs';
import { useAuth } from '@/contexts/AuthContext';

export const useLogActivity = () => {
  const { logActivity } = useActivityLogs();
  const { user, profile } = useAuth();

  const log = useCallback(async (
    tipo_acao: 'criacao' | 'edicao' | 'exclusao' | 'login' | 'logout' | 'erro' | 'outro',
    modulo: string,
    descricao: string,
    detalhes_adicionais?: Record<string, unknown> | null
  ) => {
    if (!user) return;

    try {
      await logActivity(tipo_acao, modulo, descricao, detalhes_adicionais);
      console.log(`Log registrado: ${tipo_acao} em ${modulo} - ${descricao}`);
    } catch (error) {
      console.error('Erro ao registrar log de atividade:', error);
    }
  }, [logActivity, user]);

  // Logs específicos para ações comuns
  const logLogin = useCallback(() => {
    void log('login', 'Autenticação', `Usuário ${profile?.nome_completo || user?.email} fez login`);
  }, [log, profile, user]);

  const logLogout = useCallback(() => {
    void log('logout', 'Autenticação', `Usuário ${profile?.nome_completo || user?.email} fez logout`);
  }, [log, profile, user]);

  const logLeadCreated = useCallback((leadName: string) => {
    void log('criacao', 'Leads', `Novo lead criado: ${leadName}`);
  }, [log]);

  const logLeadUpdated = useCallback((leadName: string) => {
    void log('edicao', 'Leads', `Lead atualizado: ${leadName}`);
  }, [log]);

  const logLeadDeleted = useCallback((leadName: string) => {
    void log('exclusao', 'Leads', `Lead excluído: ${leadName}`);
  }, [log]);

  const logContractCreated = useCallback((contractId: string, clientName: string) => {
    void log('criacao', 'Contratos', `Novo contrato criado para ${clientName}`, { contractId });
  }, [log]);

  const logContractUpdated = useCallback((contractId: string, clientName: string) => {
    void log('edicao', 'Contratos', `Contrato atualizado para ${clientName}`, { contractId });
  }, [log]);

  const logAppointmentCreated = useCallback((appointmentData: Record<string, unknown>) => {
    const dataHora =
      typeof appointmentData.data_hora === 'string' ? appointmentData.data_hora : '';
    void log('criacao', 'Agendamentos', `Novo agendamento criado para ${dataHora}`, appointmentData);
  }, [log]);

  // Novos logs para Agentes IA
  const logAgenteCreated = useCallback((agenteName: string) => {
    void log('criacao', 'Agentes IA', `Novo agente criado: ${agenteName}`);
  }, [log]);

  const logAgenteUpdated = useCallback((agenteName: string) => {
    void log('edicao', 'Agentes IA', `Agente atualizado: ${agenteName}`);
  }, [log]);

  const logAgenteStatusChanged = useCallback((agenteName: string, newStatus: string) => {
    void log('edicao', 'Agentes IA', `Status do agente ${agenteName} alterado para ${newStatus}`);
  }, [log]);

  const logApiKeyCreated = useCallback((keyName: string) => {
    void log('criacao', 'API Keys', `Nova API key criada: ${keyName}`);
  }, [log]);

  const logApiKeyToggled = useCallback((keyName: string, active: boolean) => {
    void log('edicao', 'API Keys', `API key ${keyName} ${active ? 'ativada' : 'desativada'}`);
  }, [log]);

  const logAgenteExecution = useCallback((agenteName: string, status: string, executionTime?: number) => {
    void log('outro', 'Agentes IA', `Execução do agente ${agenteName}: ${status}`, { 
      executionTime,
      status 
    });
  }, [log]);

  const logN8NTest = useCallback((success: boolean, url: string, details?: Record<string, unknown> | null) => {
    void log('outro', 'N8N Integration', `Teste N8N ${success ? 'bem-sucedido' : 'falhou'} para ${url}`, details);
  }, [log]);

  const logError = useCallback((modulo: string, erro: string, detalhes?: Record<string, unknown> | null) => {
    void log('erro', modulo, `Erro: ${erro}`, detalhes);
  }, [log]);

  return {
    log,
    logLogin,
    logLogout,
    logLeadCreated,
    logLeadUpdated,
    logLeadDeleted,
    logContractCreated,
    logContractUpdated,
    logAppointmentCreated,
    logAgenteCreated,
    logAgenteUpdated,
    logAgenteStatusChanged,
    logApiKeyCreated,
    logApiKeyToggled,
    logAgenteExecution,
    logN8NTest,
    logError,
  };
};

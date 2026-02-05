
import { useLogActivity } from './useLogActivity';

// Hook de exemplo para integrar logs em outros componentes
export const useLogIntegration = () => {
  const { 
    logLeadCreated, 
    logLeadUpdated, 
    logLeadDeleted,
    logContractCreated,
    logContractUpdated,
    logAppointmentCreated,
    logError 
  } = useLogActivity();

  // Exemplo de uso em operações CRUD de leads
  const handleLeadOperation = {
    onCreate: (leadData: Record<string, unknown>) => {
      try {
        // Aqui faria a operação de criação do lead
        // const result = await createLead(leadData);
        
        // Registrar log de sucesso
        const leadName =
          typeof leadData.nome_completo === 'string' ? leadData.nome_completo : '';
        logLeadCreated(leadName);
        
        return { success: true };
      } catch (error: unknown) {
        // Registrar log de erro
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logError('Leads', `Falha ao criar lead: ${message}`, { leadData });
        throw error;
      }
    },

    onUpdate: (leadId: string, leadData: Record<string, unknown>) => {
      try {
        // Aqui faria a operação de atualização do lead
        // const result = await updateLead(leadId, leadData);
        
        // Registrar log de sucesso
        const leadName =
          typeof leadData.nome_completo === 'string' ? leadData.nome_completo : '';
        logLeadUpdated(leadName);
        
        return { success: true };
      } catch (error: unknown) {
        // Registrar log de erro
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logError('Leads', `Falha ao atualizar lead: ${message}`, { leadId, leadData });
        throw error;
      }
    },

    onDelete: (leadId: string, leadName: string) => {
      try {
        // Aqui faria a operação de exclusão do lead
        // const result = await deleteLead(leadId);
        
        // Registrar log de sucesso
        logLeadDeleted(leadName);
        
        return { success: true };
      } catch (error: unknown) {
        // Registrar log de erro
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logError('Leads', `Falha ao excluir lead: ${message}`, { leadId, leadName });
        throw error;
      }
    }
  };

  // Exemplo de uso em operações de contratos
  const handleContractOperation = {
    onCreate: (contractData: Record<string, unknown>) => {
      try {
        // Operação de criação
        const contractIdValue =
          typeof contractData.id === 'string' ? contractData.id : '';
        const contractClient =
          typeof contractData.nome_cliente === 'string' ? contractData.nome_cliente : '';
        logContractCreated(contractIdValue, contractClient);
        return { success: true };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logError('Contratos', `Falha ao criar contrato: ${message}`, { contractData });
        throw error;
      }
    },

    onUpdate: (contractId: string, contractData: Record<string, unknown>) => {
      try {
        // Operação de atualização
        const contractClient =
          typeof contractData.nome_cliente === 'string' ? contractData.nome_cliente : '';
        logContractUpdated(contractId, contractClient);
        return { success: true };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logError('Contratos', `Falha ao atualizar contrato: ${message}`, { contractId, contractData });
        throw error;
      }
    }
  };

  // Exemplo de uso em agendamentos
  const handleAppointmentOperation = {
    onCreate: (appointmentData: Record<string, unknown>) => {
      try {
        // Operação de criação
        logAppointmentCreated(appointmentData);
        return { success: true };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logError('Agendamentos', `Falha ao criar agendamento: ${message}`, { appointmentData });
        throw error;
      }
    }
  };

  return {
    handleLeadOperation,
    handleContractOperation,
    handleAppointmentOperation,
  };
};

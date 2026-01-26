
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
    onCreate: async (leadData: any) => {
      try {
        // Aqui faria a operação de criação do lead
        // const result = await createLead(leadData);
        
        // Registrar log de sucesso
        logLeadCreated(leadData.nome_completo);
        
        return { success: true };
      } catch (error: any) {
        // Registrar log de erro
        logError('Leads', `Falha ao criar lead: ${error.message}`, { leadData });
        throw error;
      }
    },

    onUpdate: async (leadId: string, leadData: any) => {
      try {
        // Aqui faria a operação de atualização do lead
        // const result = await updateLead(leadId, leadData);
        
        // Registrar log de sucesso
        logLeadUpdated(leadData.nome_completo);
        
        return { success: true };
      } catch (error: any) {
        // Registrar log de erro
        logError('Leads', `Falha ao atualizar lead: ${error.message}`, { leadId, leadData });
        throw error;
      }
    },

    onDelete: async (leadId: string, leadName: string) => {
      try {
        // Aqui faria a operação de exclusão do lead
        // const result = await deleteLead(leadId);
        
        // Registrar log de sucesso
        logLeadDeleted(leadName);
        
        return { success: true };
      } catch (error: any) {
        // Registrar log de erro
        logError('Leads', `Falha ao excluir lead: ${error.message}`, { leadId, leadName });
        throw error;
      }
    }
  };

  // Exemplo de uso em operações de contratos
  const handleContractOperation = {
    onCreate: async (contractData: any) => {
      try {
        // Operação de criação
        logContractCreated(contractData.id, contractData.nome_cliente);
        return { success: true };
      } catch (error: any) {
        logError('Contratos', `Falha ao criar contrato: ${error.message}`, { contractData });
        throw error;
      }
    },

    onUpdate: async (contractId: string, contractData: any) => {
      try {
        // Operação de atualização
        logContractUpdated(contractId, contractData.nome_cliente);
        return { success: true };
      } catch (error: any) {
        logError('Contratos', `Falha ao atualizar contrato: ${error.message}`, { contractId, contractData });
        throw error;
      }
    }
  };

  // Exemplo de uso em agendamentos
  const handleAppointmentOperation = {
    onCreate: async (appointmentData: any) => {
      try {
        // Operação de criação
        logAppointmentCreated(appointmentData);
        return { success: true };
      } catch (error: any) {
        logError('Agendamentos', `Falha ao criar agendamento: ${error.message}`, { appointmentData });
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

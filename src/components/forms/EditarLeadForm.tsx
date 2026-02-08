import React from 'react';
import LeadForm from './LeadForm';
import { useLeads, type Lead, type LeadInput } from '@/hooks/useLeads';

interface EditarLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onSuccess?: () => void;
}

const EditarLeadForm: React.FC<EditarLeadFormProps> = ({ open, onOpenChange, lead, onSuccess }) => {
  const { updateLead } = useLeads();

  const handleSubmit = async (data: LeadInput) => {
    return await updateLead(lead.id, data);
  };

  return (
    <LeadForm
      open={open}
      onOpenChange={onOpenChange}
      onSubmitData={handleSubmit}
      lead={lead}
      title="Editar Lead"
      description="Atualize as informações do lead. Campos obrigatórios estão marcados com *."
      submitLabel="Atualizar Lead"
      onSuccess={onSuccess}
    />
  );
};

export default EditarLeadForm;

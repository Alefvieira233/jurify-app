import React from 'react';
import LeadForm from './LeadForm';
import { useLeads, type LeadInput } from '@/hooks/useLeads';

interface NovoLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const NovoLeadForm: React.FC<NovoLeadFormProps> = ({ open, onOpenChange, onSuccess }) => {
  const { createLead } = useLeads();

  const handleSubmit = async (data: LeadInput) => {
    return await createLead(data);
  };

  return (
    <LeadForm
      open={open}
      onOpenChange={onOpenChange}
      onSubmitData={handleSubmit}
      title="Novo Lead"
      description="Preencha os dados do novo lead. Campos obrigatórios estão marcados com *."
      submitLabel="Criar Lead"
      onSuccess={onSuccess}
    />
  );
};

export default NovoLeadForm;

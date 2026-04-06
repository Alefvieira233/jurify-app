import React, { useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, User, Loader2 } from 'lucide-react';
import { useFormDraftPersistence } from '@/hooks/useDraftPersistence';
import { DraftRecoveryBanner } from '@/components/ui/DraftRecoveryBanner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
} from '@/components/ui/form';
import { type Lead, type LeadInput } from '@/hooks/useLeads';
import { leadFormSchema, type LeadFormData } from '@/schemas/leadSchema';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import LeadBasicInfo from './lead/LeadBasicInfo';
import LeadJuridicalInfo from './lead/LeadJuridicalInfo';
import LeadCRMInfo from './lead/LeadCRMInfo';

interface LeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitData: (data: LeadInput) => Promise<boolean | undefined>;
  lead?: Lead;
  title: string;
  description: string;
  submitLabel: string;
  onSuccess?: () => void;
}

const EMPTY_DEFAULTS: LeadFormData = {
  nome_completo: '',
  telefone: '',
  email: '',
  area_juridica: '',
  origem: '',
  valor_causa: undefined,
  expected_value: undefined,
  responsavel_id: undefined,
  departamento_id: undefined,
  prioridade: 'media',
  observacoes: '',
  status: 'novo',
  temperature: 'warm',
  probability: 50,
  company_name: '',
  cpf_cnpj: '',
  pipeline_stage_id: undefined,
  lost_reason: '',
};

function leadToFormData(lead: Lead): LeadFormData {
  return {
    nome_completo: lead.nome_completo || '',
    telefone: lead.telefone || '',
    email: lead.email || '',
    area_juridica: lead.area_juridica || '',
    origem: lead.origem || '',
    valor_causa: lead.valor_causa || undefined,
    expected_value: lead.expected_value || undefined,
    responsavel_id: lead.responsavel_id || undefined,
    departamento_id: lead.departamento_id || undefined,
    prioridade: lead.prioridade || 'media',
    observacoes: lead.observacoes || '',
    status: lead.status || 'novo',
    temperature: lead.temperature || 'warm',
    probability: lead.probability || 50,
    company_name: lead.company_name || '',
    cpf_cnpj: lead.cpf_cnpj || '',
    pipeline_stage_id: lead.pipeline_stage_id || undefined,
    lost_reason: lead.lost_reason || '',
  };
}

function formDataToLeadInput(data: LeadFormData): LeadInput {
  return {
    nome_completo: data.nome_completo,
    telefone: data.telefone || null,
    email: data.email || null,
    area_juridica: data.area_juridica,
    origem: data.origem,
    valor_causa: data.valor_causa || null,
    expected_value: data.expected_value || null,
    responsavel_id: data.responsavel_id || null,
    departamento_id: data.departamento_id || null,
    prioridade: data.prioridade || 'media',
    observacoes: data.observacoes || null,
    status: data.status || 'novo',
    temperature: data.temperature || 'warm',
    probability: data.probability || 50,
    company_name: data.company_name || null,
    cpf_cnpj: data.cpf_cnpj || null,
    pipeline_stage_id: data.pipeline_stage_id || null,
    lost_reason: data.lost_reason || null,
  };
}

const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

const formatCurrency = (value: number | undefined) => {
  if (!value) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const parseCurrency = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) / 100 : undefined;
};

const LeadForm: React.FC<LeadFormProps> = ({
  open,
  onOpenChange,
  onSubmitData,
  lead,
  title,
  description,
  submitLabel,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { activeDepartamentos } = useDepartamentos();
  const { members } = useTeamMembers();

  // Draft persistence — only for new leads (not editing)
  const isEditing = !!lead;
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useFormDraftPersistence<LeadFormData>({
    formName: 'novo-lead',
    tenantId: profile?.tenant_id,
  });

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: lead ? leadToFormData(lead) : EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (lead) {
      form.reset(leadToFormData(lead));
    }
  }, [lead, form]);

  // Save draft on form value changes (only for new leads)
  useEffect(() => {
    if (isEditing || !open) return;
    const subscription = form.watch((values) => {
      saveDraft(values as Partial<LeadFormData>);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDraft, isEditing, open]);

  const handleRestoreDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      form.reset({ ...EMPTY_DEFAULTS, ...draft } as LeadFormData);
    }
  }, [loadDraft, form]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  const onSubmit = async (data: LeadFormData) => {
    try {
      const success = await onSubmitData(formDataToLeadInput(data));
      if (success) {
        clearDraft();
        if (!lead) form.reset();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: toUserMessage(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <User className="h-6 w-6 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(event) => { void form.handleSubmit(onSubmit)(event); }} className="space-y-6">
            {/* Draft recovery banner */}
            {!isEditing && hasDraft && (
              <DraftRecoveryBanner onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
            )}

            <LeadBasicInfo form={form} formatPhoneNumber={formatPhoneNumber} />

            <LeadJuridicalInfo
              form={form}
              members={members}
              formatCurrency={formatCurrency}
              parseCurrency={parseCurrency}
            />

            <LeadCRMInfo
              form={form}
              activeDepartamentos={activeDepartamentos}
              formatCurrency={formatCurrency}
              parseCurrency={parseCurrency}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    {submitLabel}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadForm;

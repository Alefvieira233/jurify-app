import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, User, Phone, Mail, Briefcase, DollarSign, FileText, MapPin, Building2, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type Lead, type LeadInput } from '@/hooks/useLeads';
import { leadFormSchema, AREAS_JURIDICAS, ORIGENS_LEAD, LEAD_TEMPERATURES, type LeadFormData } from '@/schemas/leadSchema';
import { useToast } from '@/hooks/use-toast';

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
  responsavel: '',
  observacoes: '',
  status: 'novo_lead',
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
    responsavel: lead.responsavel || '',
    observacoes: lead.observacoes || '',
    status: lead.status || 'novo_lead',
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
    responsavel: data.responsavel,
    observacoes: data.observacoes || null,
    status: data.status || 'novo_lead',
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
  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: lead ? leadToFormData(lead) : EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (lead) {
      form.reset(leadToFormData(lead));
    }
  }, [lead, form]);

  const onSubmit = async (data: LeadFormData) => {
    try {
      const success = await onSubmitData(formDataToLeadInput(data));
      if (success) {
        if (!lead) form.reset();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o lead.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            {/* Informacoes Pessoais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-amber-500" />
                Informações Pessoais
              </h3>

              <FormField
                control={form.control}
                name="nome_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João Silva Santos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        Telefone
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          value={formatPhoneNumber(field.value || '')}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="joao@exemplo.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Informacoes Juridicas */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-amber-500" />
                Informações do Caso
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="area_juridica"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área Jurídica *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a área" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AREAS_JURIDICAS.map((area) => (
                            <SelectItem key={area} value={area}>
                              {area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="origem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Origem *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Como chegou até nós?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ORIGENS_LEAD.map((origem) => (
                            <SelectItem key={origem} value={origem}>
                              {origem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valor_causa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Valor da Causa
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="R$ 0,00"
                          value={formatCurrency(field.value ?? undefined)}
                          onChange={(e) => field.onChange(parseCurrency(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do advogado responsável" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Informações da Empresa */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-500" />
                Empresa & Qualificação
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        Empresa
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da empresa (opcional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf_cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF/CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="000.000.000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Thermometer className="h-4 w-4" />
                        Temperatura
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEAD_TEMPERATURES.map((temp) => (
                            <SelectItem key={temp.value} value={temp.value}>
                              {temp.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Valor Esperado
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="R$ 0,00"
                          value={formatCurrency(field.value ?? undefined)}
                          onChange={(e) => field.onChange(parseCurrency(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilidade (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="50"
                          value={field.value ?? 50}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Observacoes */}
            <div className="space-y-4 pt-4 border-t">
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Observações
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre o caso..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, User, Phone, Mail, Briefcase, DollarSign, FileText, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { useLeads, type Lead, type LeadInput } from '@/hooks/useLeads';
import { leadFormSchema, AREAS_JURIDICAS, ORIGENS_LEAD, type LeadFormData } from '@/schemas/leadSchema';

interface EditarLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onSuccess?: () => void;
}

const EditarLeadForm: React.FC<EditarLeadFormProps> = ({ open, onOpenChange, lead, onSuccess }) => {
  const { updateLead } = useLeads();

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      nome_completo: lead.nome_completo || '',
      telefone: lead.telefone || '',
      email: lead.email || '',
      area_juridica: lead.area_juridica || '',
      origem: lead.origem || '',
      valor_causa: lead.valor_causa || undefined,
      responsavel: lead.responsavel || '',
      observacoes: lead.observacoes || '',
      status: lead.status || 'novo_lead',
    },
  });

  // Atualizar form quando o lead mudar
  useEffect(() => {
    if (lead) {
      form.reset({
        nome_completo: lead.nome_completo || '',
        telefone: lead.telefone || '',
        email: lead.email || '',
        area_juridica: lead.area_juridica || '',
        origem: lead.origem || '',
        valor_causa: lead.valor_causa || undefined,
        responsavel: lead.responsavel || '',
        observacoes: lead.observacoes || '',
        status: lead.status || 'novo_lead',
      });
    }
  }, [lead, form]);

  const onSubmit = async (data: LeadFormData) => {
    try {
      const success = await updateLead(lead.id, {
        nome_completo: data.nome_completo,
        telefone: data.telefone || null,
        email: data.email || null,
        area_juridica: data.area_juridica,
        origem: data.origem,
        valor_causa: data.valor_causa || null,
        responsavel: data.responsavel,
        observacoes: data.observacoes || null,
        status: data.status || 'novo_lead',
      } as LeadInput);

      if (success) {
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
    }
  };

  // Máscara de telefone
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  // Máscara de valor
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <User className="h-6 w-6 text-amber-500" />
            Editar Lead
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do lead. Campos obrigatórios estão marcados com *.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Pessoais */}
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

            {/* Informações Jurídicas */}
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
                          value={formatCurrency(field.value)}
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

            {/* Observações */}
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
                    Atualizar Lead
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

export default EditarLeadForm;

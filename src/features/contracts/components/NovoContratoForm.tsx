import { useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFormDraftPersistence } from '@/hooks/useDraftPersistence';
import { DraftRecoveryBanner } from '@/components/ui/DraftRecoveryBanner';

interface Lead {
  id: string;
  nome: string;
  area_juridica: string;
  valor_causa?: number;
}

interface NovoContratoFormProps {
  onClose: () => void;
}

type ContratoInsert = {
  tenant_id: string;
  titulo: string;
  lead_id: string | null;
  nome_cliente: string;
  area_juridica: string;
  valor_causa: number;
  responsavel_id: string | null;
  texto_contrato: string;
  clausulas_customizadas: string | null;
  data_assinatura: string | null;
  status: string;
  created_at: string;
};

const DEFAULT_TEXTO = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

CONTRATANTE: {nome_cliente}
ÁREA JURÍDICA: {area_juridica}
VALOR DA CAUSA: R$ {valor_causa}

PRESTADOR DE SERVIÇOS: {responsavel}

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços advocatícios especializados em {area_juridica}, conforme descrito neste instrumento.

CLÁUSULA 2ª - DOS HONORÁRIOS
Pelos serviços objeto deste contrato, o CONTRATANTE pagará ao PRESTADOR DE SERVIÇOS o valor correspondente a 30% do valor da causa, ou seja, R$ {valor_honorarios}.

CLÁUSULA 3ª - DAS OBRIGAÇÕES
O PRESTADOR DE SERVIÇOS obriga-se a:
- Prestar os serviços com diligência e competência técnica;
- Manter o CONTRATANTE informado sobre o andamento do processo;
- Zelar pelos interesses do CONTRATANTE dentro dos limites legais e éticos.

CLÁUSULA 4ª - DO PRAZO
Este contrato terá vigência até a conclusão dos serviços contratados.

CLÁUSULA 5ª - DO FORO
Fica eleito o foro da comarca local para dirimir quaisquer controvérsias oriundas deste contrato.

Por estarem de acordo, as partes assinam o presente contrato em duas vias de igual teor.

Data: ___/___/______

_____________________          _____________________
   CONTRATANTE                    PRESTADOR DE SERVIÇOS`;

const dangerousPatterns = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>/gi,
];

const contratoSchema = z.object({
  lead_id: z.string().optional(),
  nome_cliente: z
    .string()
    .min(2, 'Nome deve ter entre 2 e 200 caracteres')
    .max(200, 'Nome deve ter entre 2 e 200 caracteres'),
  area_juridica: z.string().min(2, 'Área jurídica é obrigatória'),
  valor_causa: z.coerce
    .number({ invalid_type_error: 'Valor deve ser um número válido' })
    .min(0)
    .max(999999999, 'Valor excede o limite permitido'),
  responsavel: z.string().min(2, 'Responsável é obrigatório'),
  data_assinatura: z.string().optional().or(z.literal('')),
  texto_contrato: z
    .string()
    .min(50, 'Texto do contrato deve ter pelo menos 50 caracteres')
    .max(10000)
    .refine(
      v => !dangerousPatterns.some(p => { p.lastIndex = 0; return p.test(v); }),
      'Conteúdo contém elementos não permitidos por segurança',
    ),
  clausulas_customizadas: z
    .string()
    .max(5000)
    .refine(
      v => !dangerousPatterns.some(p => { p.lastIndex = 0; return p.test(v); }),
      'Conteúdo contém elementos não permitidos por segurança',
    )
    .optional(),
});

type ContratoFormValues = z.infer<typeof contratoSchema>;

export const NovoContratoForm = ({ onClose }: NovoContratoFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id || null;
  const queryClient = useQueryClient();

  // Draft persistence
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useFormDraftPersistence<ContratoFormValues>({
    formName: 'novo-contrato',
    tenantId,
  });

  const form = useForm<ContratoFormValues>({
    resolver: zodResolver(contratoSchema),
    defaultValues: {
      lead_id: '',
      nome_cliente: '',
      area_juridica: '',
      valor_causa: 0,
      responsavel: profile?.nome_completo ?? '',
      texto_contrato: DEFAULT_TEXTO,
      clausulas_customizadas: '',
      data_assinatura: '',
    },
  });

  const {
    handleSubmit,
    getValues,
    setValue,
    watch,
    reset,
  } = form;

  // Save draft on form value changes
  useEffect(() => {
    const subscription = watch((values) => {
      saveDraft(values as Partial<ContratoFormValues>);
    });
    return () => subscription.unsubscribe();
  }, [watch, saveDraft]);

  const handleRestoreDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      reset({
        lead_id: '',
        nome_cliente: '',
        area_juridica: '',
        valor_causa: 0,
        responsavel: profile?.nome_completo ?? '',
        texto_contrato: DEFAULT_TEXTO,
        clausulas_customizadas: '',
        data_assinatura: '',
        ...draft,
      } as ContratoFormValues);
    }
  }, [loadDraft, reset, profile?.nome_completo]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  const { data: leads = [] } = useQuery({
    queryKey: queryKeys.leads.contratos(tenantId),
    queryFn: async () => {
      if (!tenantId) return [] as Lead[];
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, area_juridica, valor_causa')
        .eq('tenant_id', tenantId)
        .order('nome');

      if (error) throw error;
      return data as Lead[];
    },
  });

  const createContratoMutation = useMutation({
    mutationFn: async (contratoData: ContratoInsert) => {
      const { error } = await supabase.from('contratos').insert([contratoData]);
      if (error) throw error;
    },
    onSuccess: () => {
      clearDraft();
      void queryClient.invalidateQueries({ queryKey: queryKeys.contratos.all });
      toast({ title: 'Contrato criado com sucesso!' });
      onClose();
    },
    onError: () => {
      toast({ title: 'Erro ao criar contrato', variant: 'destructive' });
    },
  });

  const handleLeadSelect = (leadId: string) => {
    setValue('lead_id', leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setValue('nome_cliente', lead.nome);
      setValue('area_juridica', lead.area_juridica);
      setValue('valor_causa', lead.valor_causa ?? 0);
    }
  };

  const gerarTextoFinal = () => {
    const values = getValues();
    const valorCausaNum = Number(values.valor_causa) || 0;
    const valorHonorarios = valorCausaNum * 0.3;
    const fmt = (v: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    return values.texto_contrato
      .replace(/{nome_cliente}/g, values.nome_cliente)
      .replace(/{area_juridica}/g, values.area_juridica)
      .replace(/{valor_causa}/g, fmt(valorCausaNum))
      .replace(/{valor_honorarios}/g, fmt(valorHonorarios))
      .replace(/{responsavel}/g, values.responsavel);
  };

  const onSubmit = (data: ContratoFormValues) => {
    if (!tenantId) {
      toast({ title: 'Tenant não encontrado. Refaça o login.', variant: 'destructive' });
      return;
    }

    const contratoData: ContratoInsert = {
      tenant_id: tenantId,
      titulo: `Contrato - ${data.nome_cliente.trim().substring(0, 150)}`,
      lead_id: data.lead_id || null,
      nome_cliente: data.nome_cliente.trim().substring(0, 200),
      area_juridica: data.area_juridica.trim(),
      valor_causa: Math.max(0, Math.min(999999999, Number(data.valor_causa))),
      responsavel_id: null,
      texto_contrato: data.texto_contrato.trim().substring(0, 10000),
      clausulas_customizadas: data.clausulas_customizadas?.trim().substring(0, 5000) || null,
      data_assinatura: data.data_assinatura ? new Date(data.data_assinatura).toISOString() : null,
      status: 'rascunho',
      created_at: new Date().toISOString(),
    };

    createContratoMutation.mutate(contratoData);
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-6">
        {/* Draft recovery banner */}
        {hasDraft && (
          <DraftRecoveryBanner onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
        )}

        <div className="space-y-2">
          <Label>Cliente Existente (Opcional)</Label>
          <FormField
            control={form.control}
            name="lead_id"
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={handleLeadSelect}
                disabled={createContratoMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um lead existente ou preencha manualmente" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.nome} - {lead.area_juridica}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome_cliente"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Nome do Cliente</FormLabel>
                <FormControl>
                  <Input {...field} disabled={createContratoMutation.isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="area_juridica"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Área Jurídica</FormLabel>
                <FormControl>
                  <Input {...field} disabled={createContratoMutation.isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valor_causa"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Valor da Causa (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ''}
                    disabled={createContratoMutation.isPending}
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
              <FormItem className="space-y-2">
                <FormLabel>Responsável</FormLabel>
                <FormControl>
                  <Input {...field} disabled={createContratoMutation.isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_assinatura"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Data de Assinatura (Opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ''}
                    disabled={createContratoMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="texto_contrato"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Texto do Contrato</FormLabel>
              <FormControl>
                <Textarea
                  rows={12}
                  disabled={createContratoMutation.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clausulas_customizadas"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Cláusulas Customizadas (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  disabled={createContratoMutation.isPending}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createContratoMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-amber-500 hover:bg-amber-600"
            disabled={createContratoMutation.isPending}
          >
            {createContratoMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {createContratoMutation.isPending ? 'Salvando...' : 'Salvar Contrato'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setValue('texto_contrato', gerarTextoFinal())}
            disabled={createContratoMutation.isPending}
          >
            Atualizar Texto
          </Button>
        </div>
      </form>
    </Form>
  );
};

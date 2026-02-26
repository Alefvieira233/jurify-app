import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  lead_id: string | null;
  nome_cliente: string;
  area_juridica: string;
  valor_causa: number;
  responsavel: string;
  texto_contrato: string;
  clausulas_customizadas: string | null;
  status: 'rascunho';
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
  const tenantId = profile?.tenant_id || null;
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ContratoFormValues>({
    resolver: zodResolver(contratoSchema),
    defaultValues: {
      lead_id: '',
      nome_cliente: '',
      area_juridica: '',
      valor_causa: 0,
      responsavel: '',
      texto_contrato: DEFAULT_TEXTO,
      clausulas_customizadas: '',
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-contratos', tenantId],
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
      void queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato criado com sucesso!');
      onClose();
    },
    onError: () => {
      toast.error('Erro ao criar contrato');
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
      toast.error('Tenant não encontrado. Refaça o login.');
      return;
    }

    const contratoData: ContratoInsert = {
      tenant_id: tenantId,
      lead_id: data.lead_id || null,
      nome_cliente: data.nome_cliente.trim().substring(0, 200),
      area_juridica: data.area_juridica.trim(),
      valor_causa: Math.max(0, Math.min(999999999, Number(data.valor_causa))),
      responsavel: data.responsavel.trim(),
      texto_contrato: data.texto_contrato.trim().substring(0, 10000),
      clausulas_customizadas: data.clausulas_customizadas?.trim().substring(0, 5000) || null,
      status: 'rascunho' as const,
      created_at: new Date().toISOString(),
    };

    createContratoMutation.mutate(contratoData);
  };

  return (
    <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-6">
      <div className="space-y-2">
        <Label>Lead Existente (Opcional)</Label>
        <Controller
          control={control}
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
        <div className="space-y-2">
          <Label>Nome do Cliente</Label>
          <Input
            {...register('nome_cliente')}
            disabled={createContratoMutation.isPending}
          />
          {errors.nome_cliente && (
            <p className="text-xs text-destructive">{errors.nome_cliente.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Área Jurídica</Label>
          <Input
            {...register('area_juridica')}
            disabled={createContratoMutation.isPending}
          />
          {errors.area_juridica && (
            <p className="text-xs text-destructive">{errors.area_juridica.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Valor da Causa (R$)</Label>
          <Input
            type="number"
            {...register('valor_causa')}
            disabled={createContratoMutation.isPending}
          />
          {errors.valor_causa && (
            <p className="text-xs text-destructive">{errors.valor_causa.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Responsável</Label>
          <Input
            {...register('responsavel')}
            disabled={createContratoMutation.isPending}
          />
          {errors.responsavel && (
            <p className="text-xs text-destructive">{errors.responsavel.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Texto do Contrato</Label>
        <Textarea
          {...register('texto_contrato')}
          rows={12}
          disabled={createContratoMutation.isPending}
        />
        {errors.texto_contrato && (
          <p className="text-xs text-destructive">{errors.texto_contrato.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Cláusulas Customizadas (Opcional)</Label>
        <Textarea
          {...register('clausulas_customizadas')}
          rows={4}
          disabled={createContratoMutation.isPending}
        />
        {errors.clausulas_customizadas && (
          <p className="text-xs text-destructive">{errors.clausulas_customizadas.message}</p>
        )}
      </div>

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
  );
};

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  processoFormSchema,
  type ProcessoFormData,
  TIPOS_ACAO,
  FASES_PROCESSUAIS,
  POSICOES,
  STATUS_PROCESSO,
} from '@/schemas/processoSchema';
import type { Processo } from '@/hooks/useProcessos';

interface NovoProcessoFormProps {
  onSubmit: (data: ProcessoFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Processo | null;
}

const TIPO_ACAO_LABELS: Record<string, string> = {
  civel: 'Cível',
  criminal: 'Criminal',
  trabalhista: 'Trabalhista',
  previdenciario: 'Previdenciário',
  familia: 'Família',
  empresarial: 'Empresarial',
  tributario: 'Tributário',
  administrativo: 'Administrativo',
  outro: 'Outro',
};

const FASE_LABELS: Record<string, string> = {
  conhecimento: 'Conhecimento',
  recurso: 'Recurso',
  execucao: 'Execução',
  cumprimento_sentenca: 'Cumprimento de Sentença',
  encerrado: 'Encerrado',
};

const POSICAO_LABELS: Record<string, string> = {
  autor: 'Autor',
  reu: 'Réu',
  terceiro: 'Terceiro',
  assistente: 'Assistente',
};

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  encerrado_vitoria: 'Encerrado — Vitória',
  encerrado_derrota: 'Encerrado — Derrota',
  encerrado_acordo: 'Encerrado — Acordo',
  arquivado: 'Arquivado',
};

const NovoProcessoForm = ({ onSubmit, onCancel, loading, initialData }: NovoProcessoFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProcessoFormData>({
    resolver: zodResolver(processoFormSchema),
    defaultValues: initialData ? {
      lead_id: initialData.lead_id,
      numero_processo: initialData.numero_processo,
      tribunal: initialData.tribunal,
      vara: initialData.vara,
      comarca: initialData.comarca,
      tipo_acao: initialData.tipo_acao as ProcessoFormData['tipo_acao'],
      area_juridica: initialData.area_juridica,
      fase_processual: initialData.fase_processual as ProcessoFormData['fase_processual'],
      posicao: initialData.posicao as ProcessoFormData['posicao'],
      valor_causa: initialData.valor_causa,
      valor_honorario_acordado: initialData.valor_honorario_acordado,
      data_distribuicao: initialData.data_distribuicao,
      status: initialData.status as ProcessoFormData['status'],
      observacoes: initialData.observacoes,
    } : {
      tipo_acao: 'civel',
      fase_processual: 'conhecimento',
      posicao: 'autor',
      status: 'ativo',
    },
  });

  const handleFormSubmit = async (data: ProcessoFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={(e) => { void handleSubmit(handleFormSubmit)(e); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="numero_processo">Número do Processo</Label>
          <Input id="numero_processo" placeholder="0000000-00.0000.0.00.0000" {...register('numero_processo')} />
          {errors.numero_processo && <p className="text-xs text-destructive">{errors.numero_processo.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tipo_acao">Tipo de Ação *</Label>
          <Select
            value={watch('tipo_acao')}
            onValueChange={v => setValue('tipo_acao', v as ProcessoFormData['tipo_acao'])}
          >
            <SelectTrigger id="tipo_acao">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_ACAO.map(tipo => (
                <SelectItem key={tipo} value={tipo}>{TIPO_ACAO_LABELS[tipo]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipo_acao && <p className="text-xs text-destructive">{errors.tipo_acao.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="tribunal">Tribunal</Label>
          <Input id="tribunal" placeholder="Ex: TJSP" {...register('tribunal')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vara">Vara</Label>
          <Input id="vara" placeholder="Ex: 1ª Vara Cível" {...register('vara')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="comarca">Comarca</Label>
          <Input id="comarca" placeholder="Ex: São Paulo" {...register('comarca')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="area_juridica">Área Jurídica</Label>
          <Input id="area_juridica" placeholder="Ex: Direito do Consumidor" {...register('area_juridica')} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Fase Processual</Label>
          <Select
            value={watch('fase_processual')}
            onValueChange={v => setValue('fase_processual', v as ProcessoFormData['fase_processual'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FASES_PROCESSUAIS.map(f => (
                <SelectItem key={f} value={f}>{FASE_LABELS[f]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Posição</Label>
          <Select
            value={watch('posicao')}
            onValueChange={v => setValue('posicao', v as ProcessoFormData['posicao'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSICOES.map(p => (
                <SelectItem key={p} value={p}>{POSICAO_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={watch('status')}
            onValueChange={v => setValue('status', v as ProcessoFormData['status'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_PROCESSO.map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="valor_causa">Valor da Causa (R$)</Label>
          <Input
            id="valor_causa"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            {...register('valor_causa', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="data_distribuicao">Data de Distribuição</Label>
          <Input id="data_distribuicao" type="date" {...register('data_distribuicao')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          placeholder="Notas sobre o processo..."
          rows={3}
          {...register('observacoes')}
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || loading}>
          {isSubmitting || loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Processo'}
        </Button>
      </div>
    </form>
  );
};

export default NovoProcessoForm;

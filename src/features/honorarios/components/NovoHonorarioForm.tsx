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
  honorarioFormSchema,
  type HonorarioFormData,
  TIPOS_HONORARIO,
  STATUS_HONORARIO,
} from '@/schemas/honorarioSchema';
import type { Honorario } from '@/hooks/useHonorarios';

interface NovoHonorarioFormProps {
  onSubmit: (data: HonorarioFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Honorario | null;
  processoId?: string;
}

const TIPO_LABELS: Record<string, string> = {
  fixo: 'Honorário Fixo',
  hora: 'Por Hora',
  contingencia: 'Contingência (%)',
  misto: 'Misto',
  retainer: 'Retainer (Mensal)',
};

const STATUS_LABELS: Record<string, string> = {
  vigente: 'Vigente',
  pago: 'Pago',
  inadimplente: 'Inadimplente',
  cancelado: 'Cancelado',
  disputado: 'Disputado',
};

const NovoHonorarioForm = ({ onSubmit, onCancel, loading, initialData, processoId }: NovoHonorarioFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HonorarioFormData>({
    resolver: zodResolver(honorarioFormSchema),
    defaultValues: initialData ? {
      processo_id: initialData.processo_id,
      lead_id: initialData.lead_id,
      tipo: initialData.tipo as HonorarioFormData['tipo'],
      valor_fixo: initialData.valor_fixo,
      valor_hora: initialData.valor_hora,
      taxa_contingencia: initialData.taxa_contingencia,
      horas_estimadas: initialData.horas_estimadas,
      valor_total_acordado: initialData.valor_total_acordado,
      valor_adiantamento: initialData.valor_adiantamento,
      valor_recebido: initialData.valor_recebido,
      data_vencimento: initialData.data_vencimento,
      status: initialData.status as HonorarioFormData['status'],
      observacoes: initialData.observacoes,
    } : {
      processo_id: processoId,
      tipo: 'fixo',
      status: 'vigente',
      valor_adiantamento: 0,
      valor_recebido: 0,
    },
  });

  const tipo = watch('tipo');

  return (
    <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tipo de Honorário *</Label>
          <Select
            value={watch('tipo')}
            onValueChange={v => setValue('tipo', v as HonorarioFormData['tipo'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_HONORARIO.map(t => (
                <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={watch('status')}
            onValueChange={v => setValue('status', v as HonorarioFormData['status'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_HONORARIO.map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(tipo === 'fixo' || tipo === 'misto' || tipo === 'retainer') && (
        <div className="space-y-1.5">
          <Label htmlFor="valor_fixo">Valor Fixo (R$)</Label>
          <Input
            id="valor_fixo"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            {...register('valor_fixo', { valueAsNumber: true })}
          />
          {errors.valor_fixo && <p className="text-xs text-destructive">{errors.valor_fixo.message}</p>}
        </div>
      )}

      {(tipo === 'hora' || tipo === 'misto') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="valor_hora">Valor por Hora (R$)</Label>
            <Input
              id="valor_hora"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              {...register('valor_hora', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="horas_estimadas">Horas Estimadas</Label>
            <Input
              id="horas_estimadas"
              type="number"
              step="0.5"
              min="0"
              placeholder="0"
              {...register('horas_estimadas', { valueAsNumber: true })}
            />
          </div>
        </div>
      )}

      {tipo === 'contingencia' && (
        <div className="space-y-1.5">
          <Label htmlFor="taxa_contingencia">Taxa de Contingência (%)</Label>
          <Input
            id="taxa_contingencia"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="Ex: 20"
            {...register('taxa_contingencia', { valueAsNumber: true })}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="valor_total_acordado">Total Acordado (R$)</Label>
          <Input
            id="valor_total_acordado"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            {...register('valor_total_acordado', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="valor_adiantamento">Adiantamento (R$)</Label>
          <Input
            id="valor_adiantamento"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            {...register('valor_adiantamento', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="valor_recebido">Valor Recebido (R$)</Label>
          <Input
            id="valor_recebido"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            {...register('valor_recebido', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="data_vencimento">Data de Vencimento</Label>
          <Input id="data_vencimento" type="date" {...register('data_vencimento')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" rows={2} placeholder="Notas sobre o honorário..." {...register('observacoes')} />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || loading}>
          {isSubmitting || loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Honorário'}
        </Button>
      </div>
    </form>
  );
};

export default NovoHonorarioForm;

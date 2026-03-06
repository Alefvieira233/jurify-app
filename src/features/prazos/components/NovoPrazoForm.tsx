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
import { prazoFormSchema, type PrazoFormData, TIPOS_PRAZO, STATUS_PRAZO } from '@/schemas/prazoSchema';
import type { PrazoProcessual } from '@/hooks/usePrazosProcessuais';

interface NovoPrazoFormProps {
  onSubmit: (data: PrazoFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  initialData?: PrazoProcessual | null;
  processoId?: string;
}

const TIPO_LABELS: Record<string, string> = {
  audiencia: 'Audiência',
  peticao: 'Petição',
  recurso: 'Recurso',
  manifestacao: 'Manifestação',
  prazo_fatal: 'Prazo Fatal',
  despacho: 'Despacho',
  sentenca: 'Sentença',
  outro: 'Outro',
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  cumprido: 'Cumprido',
  perdido: 'Perdido',
  cancelado: 'Cancelado',
};

const NovoPrazoForm = ({ onSubmit, onCancel, loading, initialData, processoId }: NovoPrazoFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PrazoFormData>({
    resolver: zodResolver(prazoFormSchema),
    defaultValues: initialData ? {
      processo_id: initialData.processo_id,
      lead_id: initialData.lead_id,
      tipo: initialData.tipo as PrazoFormData['tipo'],
      descricao: initialData.descricao,
      data_prazo: initialData.data_prazo ? initialData.data_prazo.slice(0, 16) : '',
      alertas_dias: initialData.alertas_dias ?? [7, 3, 1],
      status: initialData.status as PrazoFormData['status'],
      observacoes: initialData.observacoes,
    } : {
      processo_id: processoId,
      tipo: 'peticao',
      alertas_dias: [7, 3, 1],
      status: 'pendente',
    },
  });

  return (
    <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tipo de Prazo *</Label>
          <Select
            value={watch('tipo')}
            onValueChange={v => setValue('tipo', v as PrazoFormData['tipo'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_PRAZO.map(t => (
                <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={watch('status')}
            onValueChange={v => setValue('status', v as PrazoFormData['status'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_PRAZO.map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição *</Label>
        <Input
          id="descricao"
          placeholder="Descreva o prazo processual..."
          {...register('descricao')}
        />
        {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="data_prazo">Data/Hora do Prazo *</Label>
          <Input
            id="data_prazo"
            type="datetime-local"
            {...register('data_prazo')}
          />
          {errors.data_prazo && <p className="text-xs text-destructive">{errors.data_prazo.message}</p>}
        </div>

        {watch('status') === 'cumprido' && (
          <div className="space-y-1.5">
            <Label htmlFor="data_cumprimento">Data do Cumprimento</Label>
            <Input id="data_cumprimento" type="datetime-local" {...register('data_prazo')} />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          placeholder="Notas sobre o prazo..."
          rows={2}
          {...register('observacoes')}
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || loading}>
          {isSubmitting || loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Prazo'}
        </Button>
      </div>
    </form>
  );
};

export default NovoPrazoForm;

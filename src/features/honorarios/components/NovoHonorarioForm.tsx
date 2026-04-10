import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  honorarioFormSchema,
  type HonorarioFormData,
  TIPOS_HONORARIO,
  STATUS_HONORARIO,
  TIPO_LABELS,
  HONORARIO_STATUS_LABELS,
} from '@/schemas/honorarioSchema';
import type { Honorario } from '@/hooks/useHonorarios';

interface NovoHonorarioFormProps {
  onSubmit: (data: HonorarioFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Honorario | null;
  processoId?: string;
}

// Mirrors RHF's `valueAsNumber: true` semantics — empty string becomes NaN,
// preserving the original validation behavior of this form.
const toNumber = (v: string): number => (v === '' ? Number.NaN : Number(v));

const NovoHonorarioForm = ({ onSubmit, onCancel, loading, initialData, processoId }: NovoHonorarioFormProps) => {
  const form = useForm<HonorarioFormData>({
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

  const {
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = form;

  const tipo = watch('tipo');

  return (
    <Form {...form}>
      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Tipo de Honorário *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIPOS_HONORARIO.map(t => (
                      <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_HONORARIO.map(s => (
                      <SelectItem key={s} value={s}>{HONORARIO_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {(tipo === 'fixo' || tipo === 'misto' || tipo === 'retainer') && (
          <FormField
            control={form.control}
            name="valor_fixo"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Valor Fixo (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value == null || Number.isNaN(field.value) ? '' : field.value}
                    onChange={(e) => field.onChange(toNumber(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {(tipo === 'hora' || tipo === 'misto') && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="valor_hora"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Valor por Hora (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value == null || Number.isNaN(field.value) ? '' : field.value}
                      onChange={(e) => field.onChange(toNumber(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="horas_estimadas"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Horas Estimadas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="0"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value == null || Number.isNaN(field.value) ? '' : field.value}
                      onChange={(e) => field.onChange(toNumber(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {tipo === 'contingencia' && (
          <FormField
            control={form.control}
            name="taxa_contingencia"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Taxa de Contingência (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 20"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value == null || Number.isNaN(field.value) ? '' : field.value}
                    onChange={(e) => field.onChange(toNumber(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="valor_total_acordado"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Total Acordado (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value == null || Number.isNaN(field.value) ? '' : field.value}
                    onChange={(e) => field.onChange(toNumber(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="valor_adiantamento"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Adiantamento (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value == null || Number.isNaN(field.value) ? '' : field.value}
                    onChange={(e) => field.onChange(toNumber(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="valor_recebido"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Valor Recebido (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value == null || Number.isNaN(field.value) ? '' : field.value}
                    onChange={(e) => field.onChange(toNumber(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="data_vencimento"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Data de Vencimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value == null || Number.isNaN(field.value) ? '' : field.value} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Notas sobre o honorário..."
                  {...field}
                  value={field.value == null || Number.isNaN(field.value) ? '' : field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || loading}>
            {isSubmitting || loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Honorário'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default NovoHonorarioForm;

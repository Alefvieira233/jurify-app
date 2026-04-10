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
import { prazoFormSchema, type PrazoFormData, TIPOS_PRAZO, STATUS_PRAZO, TIPO_LABELS, PRAZO_STATUS_LABELS } from '@/schemas/prazoSchema';
import type { PrazoProcessual } from '@/hooks/usePrazosProcessuais';

interface NovoPrazoFormProps {
  onSubmit: (data: PrazoFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  initialData?: PrazoProcessual | null;
  processoId?: string;
}

const NovoPrazoForm = ({ onSubmit, onCancel, loading, initialData, processoId }: NovoPrazoFormProps) => {
  const form = useForm<PrazoFormData>({
    resolver: zodResolver(prazoFormSchema),
    defaultValues: initialData ? {
      processo_id: initialData.processo_id ?? undefined,
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

  const {
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Tipo de Prazo *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIPOS_PRAZO.map(t => (
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
                    {STATUS_PRAZO.map(s => (
                      <SelectItem key={s} value={s}>{PRAZO_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Descrição *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Descreva o prazo processual..."
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_prazo"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Data/Hora do Prazo *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watch('status') === 'cumprido' && (
            <FormField
              control={form.control}
              name="data_cumprimento"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Data do Cumprimento</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas sobre o prazo..."
                  rows={2}
                  {...field}
                  value={field.value ?? ''}
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
            {isSubmitting || loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Prazo'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default NovoPrazoForm;

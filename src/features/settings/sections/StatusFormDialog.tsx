import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useStatusManager, type StatusStage } from '@/hooks/useStatusManager';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(50, 'Máximo 50 caracteres'),
  color: z.string().default('#3B82F6'),
  is_won: z.boolean().default(false),
  is_lost: z.boolean().default(false),
  auto_followup_days: z.coerce.number().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface StatusFormDialogProps {
  stage: StatusStage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
}

export default function StatusFormDialog({
  stage,
  open,
  onOpenChange,
  mode,
}: StatusFormDialogProps) {
  const { createStage, updateStage } = useStatusManager();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      color: '#3B82F6',
      is_won: false,
      is_lost: false,
      auto_followup_days: null,
    },
  });
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = form;

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && stage) {
        reset({
          name: stage.name,
          color: stage.color,
          is_won: stage.is_won,
          is_lost: stage.is_lost,
          auto_followup_days: stage.auto_followup_days,
        });
      } else {
        reset({
          name: '',
          color: '#3B82F6',
          is_won: false,
          is_lost: false,
          auto_followup_days: null,
        });
      }
    }
  }, [open, mode, stage, reset]);

  const isWon = watch('is_won');
  const isLost = watch('is_lost');

  const onSubmit = async (values: FormValues) => {
    if (mode === 'create') {
      await createStage.mutateAsync({
        name: values.name,
        color: values.color,
        is_won: values.is_won,
        is_lost: values.is_lost,
        auto_followup_days: values.auto_followup_days ?? null,
      });
    } else if (mode === 'edit' && stage) {
      await updateStage.mutateAsync({
        id: stage.id,
        name: values.name,
        color: values.color,
        is_won: values.is_won,
        is_lost: values.is_lost,
        auto_followup_days: values.auto_followup_days ?? null,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Criar Status' : 'Editar Status'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Qualificado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-9 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
                        {...field}
                      />
                      <span className="text-sm text-muted-foreground">
                        {watch('color')}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_won"
                  checked={isWon}
                  onCheckedChange={(checked) => {
                    setValue('is_won', !!checked);
                    if (checked) setValue('is_lost', false);
                  }}
                />
                <Label htmlFor="is_won" className="cursor-pointer">
                  Marca como &quot;Ganho&quot;
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_lost"
                  checked={isLost}
                  onCheckedChange={(checked) => {
                    setValue('is_lost', !!checked);
                    if (checked) setValue('is_won', false);
                  }}
                />
                <Label htmlFor="is_lost" className="cursor-pointer">
                  Marca como &quot;Perdido&quot;
                </Label>
              </div>
            </div>

            <FormField
              control={form.control}
              name="auto_followup_days"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Follow-up automático (dias)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Ex: 3"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {mode === 'create' ? 'Criar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

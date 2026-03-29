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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      color: '#3B82F6',
      is_won: false,
      is_lost: false,
      auto_followup_days: null,
    },
  });

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

        <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Ex: Qualificado"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="color">Cor</Label>
            <div className="flex items-center gap-2">
              <input
                id="color"
                type="color"
                className="h-9 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
                {...register('color')}
              />
              <span className="text-sm text-muted-foreground">
                {watch('color')}
              </span>
            </div>
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor="auto_followup_days">
              Follow-up automático (dias)
            </Label>
            <Input
              id="auto_followup_days"
              type="number"
              min={0}
              placeholder="Ex: 3"
              {...register('auto_followup_days')}
            />
          </div>

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
      </DialogContent>
    </Dialog>
  );
}

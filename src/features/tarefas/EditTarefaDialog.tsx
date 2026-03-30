import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tarefaSchema, type TarefaFormData, FIBONACCI_POINTS } from '@/schemas/tarefaSchema';
import { useTarefas, type Tarefa } from '@/hooks/useTarefas';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditTarefaDialogProps {
  tarefa: Tarefa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTarefaDialog({ tarefa, open, onOpenChange }: EditTarefaDialogProps) {
  const { updateTarefa } = useTarefas();
  const { members } = useTeamMembers();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TarefaFormData>({
    resolver: zodResolver(tarefaSchema),
    defaultValues: { prioridade: 'media' },
  });

  const pontosValue = watch('pontos');
  const responsavelValue = watch('responsavel_id');
  const prioridadeValue = watch('prioridade');

  useEffect(() => {
    if (tarefa) {
      reset({
        titulo: tarefa.titulo,
        descricao: tarefa.descricao ?? undefined,
        prazo: tarefa.prazo ?? undefined,
        pontos: tarefa.pontos ?? undefined,
        responsavel_id: tarefa.responsavel_id ?? '',
        lead_id: tarefa.lead_id ?? '',
        prioridade: tarefa.prioridade,
      });
    }
  }, [tarefa, reset]);

  const onSubmit = (data: TarefaFormData) => {
    if (!tarefa) return;
    const payload: Record<string, unknown> = {
      id: tarefa.id,
      titulo: data.titulo,
      prioridade: data.prioridade,
    };
    if (data.descricao !== undefined) payload.descricao = data.descricao || null;
    if (data.prazo !== undefined) payload.prazo = data.prazo || null;
    if (data.pontos !== undefined) payload.pontos = data.pontos || null;
    payload.responsavel_id = data.responsavel_id || null;

    updateTarefa.mutate(payload as { id: string } & Record<string, unknown>, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-4">
          <div>
            <Label htmlFor="edit-titulo">Título</Label>
            <Input id="edit-titulo" {...register('titulo')} placeholder="Título da tarefa" />
            {errors.titulo && <p className="text-xs text-destructive mt-1">{errors.titulo.message}</p>}
          </div>

          <div>
            <Label htmlFor="edit-descricao">Descrição</Label>
            <Textarea id="edit-descricao" {...register('descricao')} placeholder="Descrição opcional" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-prazo">Prazo</Label>
              <Input id="edit-prazo" type="date" {...register('prazo')} />
            </div>
            <div>
              <Label htmlFor="edit-pontos">Pontos (Fibonacci)</Label>
              <Select
                value={pontosValue != null ? String(pontosValue) : '__none__'}
                onValueChange={(v) => setValue('pontos', v === '__none__' ? undefined : Number(v), { shouldValidate: true })}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {FIBONACCI_POINTS.map(p => (
                    <SelectItem key={p} value={String(p)}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-responsavel_id">Responsável</Label>
              <Select
                value={responsavelValue || '__none__'}
                onValueChange={(v) => setValue('responsavel_id', v === '__none__' ? '' : v, { shouldValidate: true })}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {(members ?? []).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome_completo || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-prioridade">Prioridade</Label>
              <Select
                value={prioridadeValue || 'media'}
                onValueChange={(v) => setValue('prioridade', v as TarefaFormData['prioridade'], { shouldValidate: true })}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || updateTarefa.isPending}>
              {isSubmitting || updateTarefa.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

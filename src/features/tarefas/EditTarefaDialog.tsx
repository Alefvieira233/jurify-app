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
    formState: { errors, isSubmitting },
  } = useForm<TarefaFormData>({
    resolver: zodResolver(tarefaSchema),
    defaultValues: { prioridade: 'media' },
  });

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
              <select
                id="edit-pontos"
                {...register('pontos')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">—</option>
                {FIBONACCI_POINTS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-responsavel_id">Responsável</Label>
              <select
                id="edit-responsavel_id"
                {...register('responsavel_id')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Sem responsável</option>
                {(members ?? []).map(m => (
                  <option key={m.id} value={m.id}>{m.nome_completo || m.email}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit-prioridade">Prioridade</Label>
              <select
                id="edit-prioridade"
                {...register('prioridade')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
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

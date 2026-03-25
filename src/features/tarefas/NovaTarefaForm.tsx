import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tarefaSchema, type TarefaFormData, FIBONACCI_POINTS } from '@/schemas/tarefaSchema';
import { useTarefas } from '@/hooks/useTarefas';
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

interface NovaTarefaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NovaTarefaForm({ open, onOpenChange }: NovaTarefaFormProps) {
  const { createTarefa } = useTarefas();
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

  const onSubmit = (data: TarefaFormData) => {
    const payload: Record<string, unknown> = {
      titulo: data.titulo,
      prioridade: data.prioridade,
    };
    if (data.descricao) payload.descricao = data.descricao;
    if (data.prazo) payload.prazo = data.prazo;
    if (data.pontos) payload.pontos = data.pontos;
    if (data.responsavel_id) payload.responsavel_id = data.responsavel_id;

    createTarefa.mutate(payload, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" {...register('titulo')} placeholder="Título da tarefa" />
            {errors.titulo && <p className="text-xs text-destructive mt-1">{errors.titulo.message}</p>}
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register('descricao')} placeholder="Descrição opcional" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prazo">Prazo</Label>
              <Input id="prazo" type="date" {...register('prazo')} />
            </div>
            <div>
              <Label htmlFor="pontos">Pontos (Fibonacci)</Label>
              <select
                id="pontos"
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
              <Label htmlFor="responsavel_id">Responsável</Label>
              <select
                id="responsavel_id"
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
              <Label htmlFor="prioridade">Prioridade</Label>
              <select
                id="prioridade"
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

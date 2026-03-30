import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tarefaSchema, type TarefaFormData, FIBONACCI_POINTS } from '@/schemas/tarefaSchema';
import { useTarefas } from '@/hooks/useTarefas';
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
              <Label htmlFor="responsavel_id">Responsável</Label>
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
              <Label htmlFor="prioridade">Prioridade</Label>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

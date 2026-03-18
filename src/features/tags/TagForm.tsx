import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTags } from '@/hooks/useTags';
import type { Tag } from '@/types/crm-operacional';
import { TAG_CATEGORIAS } from '@/types/crm-operacional';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];

const CATEGORIA_LABELS: Record<string, string> = {
  prioridade: 'Prioridade',
  temperatura: 'Temperatura',
  operacional: 'Operacional',
  qualificacao: 'Qualificação',
  acompanhamento: 'Acompanhamento',
  relacionamento: 'Relacionamento',
};

const tagFormSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(50, 'Máximo 50 caracteres'),
  cor: z.string().min(1, 'Cor é obrigatória').regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida'),
  categoria: z.string().nullable().optional(),
  ordem: z.coerce.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
});

type TagFormValues = z.infer<typeof tagFormSchema>;

interface TagFormProps {
  tag?: Tag | null;
  onClose: () => void;
}

export function TagForm({ tag, onClose }: TagFormProps) {
  const { createTag, updateTag, isCreating } = useTags();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      nome: tag?.nome ?? '',
      cor: tag?.cor ?? '#3b82f6',
      categoria: tag?.categoria ?? null,
      ordem: tag?.ordem ?? 0,
      ativo: tag?.ativo ?? true,
    },
  });

  const corAtual = watch('cor');

  const onSubmit = async (values: TagFormValues) => {
    const payload = {
      nome: values.nome,
      cor: values.cor,
      categoria: values.categoria || null,
      ordem: values.ordem,
      ativo: values.ativo,
    };

    if (tag?.id) {
      await updateTag({ id: tag.id, ...payload });
    } else {
      await createTag(payload);
    }
    onClose();
  };

  return (
    <form
      onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
      className="space-y-4"
    >
      {/* Nome */}
      <div className="space-y-1.5">
        <Label htmlFor="tag-nome">Nome</Label>
        <Input
          id="tag-nome"
          placeholder="Ex: VIP, Urgente, Quente..."
          {...register('nome')}
        />
        {errors.nome && (
          <p className="text-xs text-destructive">{errors.nome.message}</p>
        )}
      </div>

      {/* Cor */}
      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => { setValue('cor', color, { shouldValidate: true }); }}
              className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: color,
                borderColor: corAtual === color ? '#000' : 'transparent',
              }}
              aria-label={`Cor ${color}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="w-6 h-6 rounded-full border shrink-0"
            style={{ backgroundColor: corAtual }}
          />
          <Input
            placeholder="#3b82f6"
            value={corAtual}
            onChange={(e) => { setValue('cor', e.target.value, { shouldValidate: true }); }}
            className="h-8 font-mono text-sm"
          />
        </div>
        {errors.cor && (
          <p className="text-xs text-destructive">{errors.cor.message}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <Controller
          control={control}
          name="categoria"
          render={({ field }) => (
            <Select
              value={field.value ?? '__none__'}
              onValueChange={(v) => { field.onChange(v === '__none__' ? null : v); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem categoria</SelectItem>
                {TAG_CATEGORIAS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORIA_LABELS[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Ordem */}
      <div className="space-y-1.5">
        <Label htmlFor="tag-ordem">Ordem</Label>
        <Input
          id="tag-ordem"
          type="number"
          min={0}
          {...register('ordem')}
          className="w-24"
        />
      </div>

      {/* Ativo */}
      <div className="flex items-center justify-between">
        <Label htmlFor="tag-ativo">Ativa</Label>
        <Controller
          control={control}
          name="ativo"
          render={({ field }) => (
            <Switch
              id="tag-ativo"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? 'Salvando...' : tag?.id ? 'Salvar' : 'Criar Tag'}
        </Button>
      </div>
    </form>
  );
}

export default TagForm;

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import type { Departamento } from '@/types/crm-operacional';

const departamentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Máximo de 100 caracteres'),
  descricao: z.string().max(500, 'Máximo de 500 caracteres').optional().or(z.literal('')),
  cor: z.string().min(1, 'Selecione uma cor'),
  ativo: z.boolean(),
});

type DepartamentoFormData = z.infer<typeof departamentoSchema>;

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

interface DepartamentoFormProps {
  departamento?: Departamento | null;
  onClose: () => void;
}

const DepartamentoForm = ({ departamento, onClose }: DepartamentoFormProps) => {
  const isEditing = !!departamento;
  const { createDepto, updateDepto, isCreating } = useDepartamentos();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DepartamentoFormData>({
    resolver: zodResolver(departamentoSchema),
    defaultValues: {
      nome: departamento?.nome ?? '',
      descricao: departamento?.descricao ?? '',
      cor: departamento?.cor ?? PRESET_COLORS[0],
      ativo: departamento?.ativo ?? true,
    },
  });

  const selectedColor = watch('cor');
  const ativo = watch('ativo');
  const loading = isSubmitting || isCreating;

  const onSubmit = async (data: DepartamentoFormData) => {
    if (isEditing && departamento) {
      await updateDepto({
        id: departamento.id,
        nome: data.nome,
        descricao: data.descricao || null,
        cor: data.cor,
        ativo: data.ativo,
      });
    } else {
      await createDepto({
        nome: data.nome,
        descricao: data.descricao || null,
        cor: data.cor,
        ativo: data.ativo,
      });
    }
    onClose();
  };

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Editar Departamento' : 'Novo Departamento'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isEditing
            ? 'Atualize as informações do departamento'
            : 'Preencha os dados para criar um novo departamento'}
        </p>
      </div>

      <form
        onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
        className="space-y-5"
      >
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="nome">Nome *</Label>
          <Input
            id="nome"
            placeholder="Ex: Direito Trabalhista"
            {...register('nome')}
          />
          {errors.nome && (
            <p className="text-sm text-destructive">{errors.nome.message}</p>
          )}
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            placeholder="Descreva as responsabilidades do departamento..."
            rows={3}
            {...register('descricao')}
          />
          {errors.descricao && (
            <p className="text-sm text-destructive">{errors.descricao.message}</p>
          )}
        </div>

        {/* Cor */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Palette className="w-4 h-4" />
            Cor
          </Label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: selectedColor === color ? 'hsl(var(--foreground))' : 'transparent',
                }}
                onClick={() => setValue('cor', color, { shouldValidate: true })}
                aria-label={`Selecionar cor ${color}`}
              />
            ))}
          </div>
          {errors.cor && (
            <p className="text-sm text-destructive">{errors.cor.message}</p>
          )}
        </div>

        {/* Ativo */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="ativo" className="text-sm font-medium">
              Departamento ativo
            </Label>
            <p className="text-xs text-muted-foreground">
              Departamentos inativos não aparecem nas seleções
            </p>
          </div>
          <Switch
            id="ativo"
            checked={ativo}
            onCheckedChange={(checked) => setValue('ativo', checked, { shouldValidate: true })}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DepartamentoForm;
